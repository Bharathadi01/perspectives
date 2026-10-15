import { z } from 'zod';
import { DayKeySchema, RULES, ageFromBirthDate } from './common';

const EmailSchema = z.string().trim().toLowerCase().email().max(254);
const PasswordSchema = z.string().min(RULES.passwordMinLength).max(RULES.passwordMaxLength);

export const SignUpInputSchema = z
  .object({
    email: EmailSchema,
    password: PasswordSchema,
    birthDate: DayKeySchema,
    acceptTerms: z.literal(true),
  })
  .refine((v) => ageFromBirthDate(v.birthDate) >= RULES.minAge, {
    message: 'You must be 18 or older to use Perspective.',
    path: ['birthDate'],
  });
export type SignUpInput = z.infer<typeof SignUpInputSchema>;

export const LogInInputSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1).max(RULES.passwordMaxLength),
});
export type LogInInput = z.infer<typeof LogInInputSchema>;

export const RefreshInputSchema = z.object({ refreshToken: z.string().min(20).max(200) });
export type RefreshInput = z.infer<typeof RefreshInputSchema>;

export const AuthTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  /** Seconds until the access token expires. */
  accessTokenExpiresIn: z.number().int().positive(),
});
export type AuthTokens = z.infer<typeof AuthTokensSchema>;
