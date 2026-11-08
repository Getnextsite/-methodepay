import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Account, Membership, Role } from '@prisma/client';
import { prisma } from './db';
import { requireUser, roleAtLeast, type SessionUser } from './auth';

export const ACCOUNT_COOKIE = 'mp_account';

export type Tenant = {
  user: SessionUser;
  account: Account;
  membership: Membership;
  role: Role;
};

/**
 * The single place that answers "which merchant am I acting for?".
 *
 * Every dashboard page and server action goes through this. Queries elsewhere
 * take `accountId` from the returned tenant and never from a request
 * parameter, which is what keeps one merchant out of another merchant orders.
 */
export async function requireTenant(): Promise<Tenant> {
  const user = await requireUser();

  const memberships = await prisma.membership.findMany({
    where: { userId: user.id },
    include: { account: true },
    orderBy: { createdAt: 'asc' },
  });

  if (memberships.length === 0) redirect('/onboarding');

  const preferred = cookies().get(ACCOUNT_COOKIE)?.value;
  const chosen =
    memberships.find((m) => m.accountId === preferred) ?? memberships[0];

  if (chosen.account.suspendedAt) redirect('/suspended');

  return {
    user,
    account: chosen.account,
    membership: chosen,
    role: chosen.role,
  };
}

/** Accounts the signed-in user can switch between. */
export async function listTenants(userId: string) {
  return prisma.membership.findMany({
    where: { userId },
    include: { account: { select: { id: true, name: true, slug: true, planTier: true } } },
    orderBy: { createdAt: 'asc' },
  });
}

export class ForbiddenError extends Error {
  constructor(message = 'You do not have permission to do that.') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/** Throws rather than redirects, so server actions can report it in the form. */
export function assertRole(tenant: Tenant, minimum: Role): void {
  if (!roleAtLeast(tenant.role, minimum)) {
    throw new ForbiddenError(
      `This action needs the ${minimum.toLowerCase()} role; you are ${tenant.role.toLowerCase()}.`,
    );
  }
}

export async function setActiveAccount(accountId: string): Promise<void> {
  cookies().set(ACCOUNT_COOKIE, accountId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
}
