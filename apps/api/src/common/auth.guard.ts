import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { APP_CONFIG, AppConfig } from '../config/app-config';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from './app-exception';
import { AuthedRequest, IS_PUBLIC, REQUIRES_LIVE_PROFILE } from './decorators';

/**
 * Default-deny guard. Every route needs a valid access token unless marked @Public().
 * Suspended accounts are denied. @RequiresLiveProfile() routes also need a live profile.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) {
      return true;
    }

    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new AppException('UNAUTHORIZED', 'Please sign in.');
    }

    let userId: string;
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; typ: string }>(header.slice(7), {
        secret: this.config.JWT_ACCESS_SECRET,
      });
      if (payload.typ !== 'access') throw new Error('wrong token type');
      userId = payload.sub;
    } catch {
      throw new AppException('UNAUTHORIZED', 'Your session has expired. Please sign in again.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, status: true, profile: { select: { isLive: true, selfieStatus: true } } },
    });
    if (!user) {
      throw new AppException('UNAUTHORIZED', 'Please sign in.');
    }
    if (user.status === 'suspended') {
      throw new AppException('ACCOUNT_SUSPENDED', 'This account is suspended.');
    }

    if (this.reflector.getAllAndOverride<boolean>(REQUIRES_LIVE_PROFILE, targets) && !user.profile?.isLive) {
      if (user.profile?.selfieStatus !== 'verified') {
        throw new AppException('SELFIE_VERIFICATION_REQUIRED', 'Verify your selfie to continue.');
      }
      throw new AppException('PROFILE_INCOMPLETE', 'Finish your profile to continue.');
    }

    req.user = { id: user.id };
    return true;
  }
}
