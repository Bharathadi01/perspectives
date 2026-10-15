import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { AuthTokens, LogInInput, RULES, SignUpInput, ageFromBirthDate } from '@perspective/contracts';
import { AppException } from '../common/app-exception';
import { APP_CONFIG, AppConfig } from '../config/app-config';
import { PrismaService } from '../prisma/prisma.service';
import { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from './passwords';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async signUp(input: SignUpInput): Promise<AuthTokens> {
    // Server-side age gate (server time is canonical).
    if (ageFromBirthDate(input.birthDate) < RULES.minAge) {
      throw new AppException('UNDERAGE', 'You must be 18 or older to use Perspective.');
    }
    const passwordHash = await hashPassword(input.password);
    try {
      const user = await this.prisma.user.create({
        data: {
          email: input.email,
          passwordHash,
          birthDate: new Date(`${input.birthDate}T00:00:00Z`),
          termsAcceptedAt: new Date(),
          profile: { create: {} },
        },
        select: { id: true },
      });
      return this.issueTokens(user.id, randomUUID());
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new AppException('EMAIL_TAKEN', 'An account with this email already exists.');
      }
      throw err;
    }
  }

  async logIn(input: LogInInput): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true, passwordHash: true, status: true },
    });
    const valid = await verifyPassword(input.password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
    if (!user || !valid) {
      throw new AppException('INVALID_CREDENTIALS', 'Email or password is incorrect.');
    }
    if (user.status === 'suspended') {
      throw new AppException('ACCOUNT_SUSPENDED', 'This account is suspended.');
    }
    return this.issueTokens(user.id, randomUUID());
  }

  /** Rotates a refresh token. Reusing an old token revokes the whole family. */
  async refresh(rawToken: string): Promise<AuthTokens> {
    const now = new Date();
    const row = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hashRefreshToken(rawToken) },
      include: { user: { select: { status: true } } },
    });
    if (!row) {
      throw new AppException('UNAUTHORIZED', 'Please sign in again.');
    }
    if (row.usedAt || row.revokedAt) {
      await this.revokeFamily(row.familyId);
      throw new AppException('UNAUTHORIZED', 'Please sign in again.');
    }
    if (row.expiresAt <= now || row.user.status !== 'active') {
      throw new AppException('UNAUTHORIZED', 'Please sign in again.');
    }
    const claimed = await this.prisma.refreshToken.updateMany({
      where: { id: row.id, usedAt: null, revokedAt: null },
      data: { usedAt: now },
    });
    if (claimed.count === 0) {
      await this.revokeFamily(row.familyId);
      throw new AppException('UNAUTHORIZED', 'Please sign in again.');
    }
    return this.issueTokens(row.userId, row.familyId);
  }

  async logOut(rawToken: string): Promise<void> {
    const row = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hashRefreshToken(rawToken) },
      select: { familyId: true },
    });
    if (row) await this.revokeFamily(row.familyId);
  }

  async verifyUserPassword(userId: string, password: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
    return verifyPassword(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
  }

  private async issueTokens(userId: string, familyId: string): Promise<AuthTokens> {
    const accessToken = await this.jwt.signAsync(
      { sub: userId, typ: 'access' },
      { secret: this.config.JWT_ACCESS_SECRET, expiresIn: this.config.ACCESS_TOKEN_TTL_SEC },
    );
    const refreshToken = randomBytes(32).toString('base64url');
    await this.prisma.refreshToken.create({
      data: {
        userId,
        familyId,
        tokenHash: this.hashRefreshToken(refreshToken),
        expiresAt: new Date(Date.now() + this.config.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
      },
    });
    return { accessToken, refreshToken, accessTokenExpiresIn: this.config.ACCESS_TOKEN_TTL_SEC };
  }

  private hashRefreshToken(raw: string): string {
    return createHmac('sha256', this.config.JWT_REFRESH_SECRET).update(raw).digest('hex');
  }

  private async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({ where: { familyId, revokedAt: null }, data: { revokedAt: new Date() } });
  }
}
