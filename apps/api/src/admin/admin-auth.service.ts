import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AdminLoginInput, AdminSession } from '@perspective/contracts';
import { createHmac } from 'node:crypto';
import type { Request } from 'express';
import { DUMMY_PASSWORD_HASH, verifyPassword } from '../auth/passwords';
import { AppException } from '../common/app-exception';
import { APP_CONFIG, AppConfig } from '../config/app-config';
import { PrismaService } from '../prisma/prisma.service';
import { verifyTotp } from './totp';

export type AdminRequest = Request & { admin?: { id: string; email: string } };

/**
 * Admin sign-in (docs/SECURITY.md → Admin access and enforcement): a separate identity with its own
 * password, plus an authenticator code at every sign-in when ADMIN_REQUIRE_CODE is on (off for now,
 * decided 2026-10-21). The admin token has its own secret and type,
 * so it never works on user routes and user tokens never work here. Sessions are short and cannot be
 * renewed.
 */
@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async logIn(input: AdminLoginInput, now: Date = new Date()): Promise<AdminSession> {
    const admin = await this.prisma.adminUser.findUnique({ where: { email: input.email } });
    const passwordOk = await verifyPassword(input.password, admin?.passwordHash ?? DUMMY_PASSWORD_HASH);
    if (!admin || !passwordOk || admin.disabledAt) {
      throw new AppException('INVALID_CREDENTIALS', 'Email, password or code is incorrect.');
    }
    if (this.config.ADMIN_REQUIRE_CODE) {
      const step = input.code ? verifyTotp(admin.totpSecret, input.code, now, admin.lastTotpStep) : null;
      if (step === null) throw new AppException('INVALID_CREDENTIALS', 'Email, password or code is incorrect.');
      // Claim the code's time step so the same code cannot be used twice.
      const claimed = await this.prisma.adminUser.updateMany({
        where: { id: admin.id, OR: [{ lastTotpStep: null }, { lastTotpStep: { lt: step } }] },
        data: { lastTotpStep: step, lastSignInAt: now },
      });
      if (claimed.count === 0) {
        throw new AppException('INVALID_CREDENTIALS', 'Email, password or code is incorrect.');
      }
    } else {
      await this.prisma.adminUser.update({ where: { id: admin.id }, data: { lastSignInAt: now } });
    }
    const expiresIn = Math.round(this.config.ADMIN_SESSION_HOURS * 3600);
    const accessToken = await this.jwt.signAsync({ sub: admin.id, typ: 'admin' }, { secret: this.secret(), expiresIn });
    await this.prisma.adminAuditEntry.create({ data: { adminId: admin.id, action: 'sign_in' } });
    return { accessToken, expiresIn, email: admin.email };
  }

  async verify(token: string): Promise<{ id: string; email: string }> {
    let adminId: string;
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; typ: string }>(token, { secret: this.secret() });
      if (payload.typ !== 'admin') throw new Error('wrong token type');
      adminId = payload.sub;
    } catch {
      throw new AppException('UNAUTHORIZED', 'Your admin session has ended. Please sign in again.');
    }
    const admin = await this.prisma.adminUser.findUnique({ where: { id: adminId }, select: { id: true, email: true, disabledAt: true } });
    if (!admin || admin.disabledAt) throw new AppException('UNAUTHORIZED', 'Please sign in again.');
    return { id: admin.id, email: admin.email };
  }

  /** Its own secret when ADMIN_JWT_SECRET is set; otherwise derived, never equal to the user token secret. */
  private secret(): string {
    return this.config.ADMIN_JWT_SECRET ?? createHmac('sha256', this.config.JWT_ACCESS_SECRET).update('perspective-admin-token').digest('hex');
  }
}

/** Guards every /v1/admin route except sign-in: only a valid admin token gets through. */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly auth: AdminAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AdminRequest>();
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new AppException('UNAUTHORIZED', 'Please sign in.');
    req.admin = await this.auth.verify(header.slice(7));
    return true;
  }
}
