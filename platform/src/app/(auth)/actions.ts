'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { createSession, destroySession, hashPassword, verifyPassword } from '@/lib/auth';
import { provisionAccountDefaults } from '@/lib/gateway/context';
import { setActiveAccount } from '@/lib/tenancy';

export type FormState = { error?: string; ok?: boolean } | undefined;

const signUpSchema = z.object({
  name: z.string().trim().min(1, 'Tell us your name.').max(120),
  storeName: z.string().trim().min(1, 'Your store needs a name.').max(120),
  email: z.string().trim().toLowerCase().email('That does not look like an email address.'),
  // Length beats complexity rules: a long passphrase survives a leak better
  // than "P@ssw0rd!" and people actually remember it.
  password: z.string().min(10, 'Use at least 10 characters.').max(200),
});

export async function signUpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signUpSchema.safeParse({
    name: formData.get('name'),
    storeName: formData.get('storeName'),
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form and try again.' };
  }
  const { name, storeName, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return { error: 'An account already exists for that email. Try signing in instead.' };
  }

  const slug = await uniqueSlug(storeName);
  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash: await hashPassword(password),
      memberships: {
        create: {
          role: 'OWNER',
          account: {
            create: {
              name: storeName,
              slug,
              planTier: 'FREE',
              // Fourteen days to get a real sale through before the rails that
              // need a plan switch off. Long enough to matter, short enough
              // that nobody runs a business on the trial.
              trialEndsAt: new Date(Date.now() + 14 * 86_400_000),
            },
          },
        },
      },
    },
    include: { memberships: true },
  });

  const accountId = user.memberships[0].accountId;
  await provisionAccountDefaults(accountId, storeName);
  await createSession(user.id);
  await setActiveAccount(accountId);

  // Straight into setup rather than the dashboard. A store with no rail
  // configured cannot take a penny, and every dashboard screen at that point
  // is an empty state asking the merchant to go and find something else.
  redirect('/onboarding/setup/store');
}

const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter your email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form and try again.' };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  // One message for both a missing user and a wrong password: anything else
  // turns the login form into an account-enumeration oracle.
  const generic = { error: 'Those details do not match an account.' };
  if (!user) return generic;
  if (!(await verifyPassword(parsed.data.password, user.passwordHash))) return generic;

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession(user.id);
  redirect('/dashboard');
}

export async function signOutAction(): Promise<void> {
  await destroySession();
  redirect('/login');
}

async function uniqueSlug(name: string): Promise<string> {
  const base =
    name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'store';

  let candidate = base;
  let n = 2;
  // Slugs are public (they appear in checkout URLs), so collisions have to be
  // resolved rather than merged.
  while (await prisma.account.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = `${base}-${n}`;
    n += 1;
  }
  return candidate;
}
