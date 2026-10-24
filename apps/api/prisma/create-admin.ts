/**
 * Creates (or resets) an admin sign-in for the admin dashboard (docs/SECURITY.md → Admin access).
 * Admins are not Perspective accounts and can only be made with this command, run on the server:
 *
 *   pnpm admin:create -- --email you@example.com          create a new admin
 *   pnpm admin:create -- --email you@example.com --reset  new password and new authenticator secret
 *
 * It prints a generated password and the authenticator secret once. Add the secret to an
 * authenticator app (Google Authenticator, 1Password, ...) by pasting the otpauth link or the secret.
 */
import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { hashPassword } from '../src/auth/passwords';
import { generateTotpSecret, otpauthUri } from '../src/admin/totp';

if (existsSync('.env')) process.loadEnvFile('.env');

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const emailArg = args[args.indexOf('--email') + 1];
  const reset = args.includes('--reset');
  if (!args.includes('--email') || !emailArg || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailArg)) {
    throw new Error('Usage: pnpm admin:create -- --email you@example.com [--reset]');
  }
  const email = emailArg.trim().toLowerCase();
  const prisma = new PrismaClient();
  try {
    const existing = await prisma.adminUser.findUnique({ where: { email } });
    if (existing && !reset) throw new Error(`An admin with ${email} already exists. Add --reset to give it a new password and secret.`);
    const password = randomBytes(18).toString('base64url');
    const totpSecret = generateTotpSecret();
    const passwordHash = await hashPassword(password);
    await prisma.adminUser.upsert({
      where: { email },
      create: { email, passwordHash, totpSecret },
      update: { passwordHash, totpSecret, lastTotpStep: null, disabledAt: null },
    });
    console.log(`\nAdmin ${existing ? 'reset' : 'created'}: ${email}`);
    console.log(`Password (shown once): ${password}`);
    console.log(`Authenticator secret: ${totpSecret}`);
    console.log(`Authenticator link:   ${otpauthUri(email, totpSecret)}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
