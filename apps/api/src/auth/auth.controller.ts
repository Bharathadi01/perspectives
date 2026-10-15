import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  AuthTokens,
  LogInInput,
  LogInInputSchema,
  RefreshInput,
  RefreshInputSchema,
  SignUpInput,
  SignUpInputSchema,
} from '@perspective/contracts';
import { Public } from '../common/decorators';
import { ZodPipe } from '../common/zod.pipe';
import { AuthService } from './auth.service';

@ApiTags('Auth')
@Public()
@Controller('v1/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('signup')
  signUp(@Body(new ZodPipe(SignUpInputSchema)) body: SignUpInput): Promise<AuthTokens> {
    return this.auth.signUp(body);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  logIn(@Body(new ZodPipe(LogInInputSchema)) body: LogInInput): Promise<AuthTokens> {
    return this.auth.logIn(body);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body(new ZodPipe(RefreshInputSchema)) body: RefreshInput): Promise<AuthTokens> {
    return this.auth.refresh(body.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logOut(@Body(new ZodPipe(RefreshInputSchema)) body: RefreshInput): Promise<void> {
    await this.auth.logOut(body.refreshToken);
  }
}
