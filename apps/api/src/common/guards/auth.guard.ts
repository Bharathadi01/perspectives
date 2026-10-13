import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const IS_PUBLIC_KEY = 'isPublic';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    // In local dev/testing, allow bearer token or demo fallback user
    if (!authHeader && !request.headers['x-user-id']) {
      // Set test user context for development
      request.user = { id: 'usr_me_001', role: 'user' };
      return true;
    }

    request.user = {
      id: request.headers['x-user-id'] || 'usr_me_001',
      role: 'user',
    };
    return true;
  }
}
