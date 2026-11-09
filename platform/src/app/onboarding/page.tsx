import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { provisionAccountDefaults } from '@/lib/gateway/context';
import { setActiveAccount } from '@/lib/tenancy';
import { ActionForm, SubmitButton, type ActionState } from '@/components/action-form';
import { Field } from '@/components/ui';

export const metadata: Metadata = { title: 'Create a store' };

async function createStoreAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  'use server';
  const user = await requireUser();
  const name = String(formData.get('name') ?? '').trim().slice(0, 120);
  if (!name) return { error: 'Give your store a name.' };

  const base =
    name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'store';

  let slug = base;
  let n = 2;
  while (await prisma.account.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${n}`;
    n += 1;
  }

  const account = await prisma.account.create({
    data: {
      name,
      slug,
      planTier: 'FREE',
      trialEndsAt: new Date(Date.now() + 14 * 86_400_000),
      memberships: { create: { userId: user.id, role: 'OWNER' } },
    },
  });

  await provisionAccountDefaults(account.id, name);
  await setActiveAccount(account.id);

  // A new store has no way to take money yet, so the dashboard would be a wall
  // of empty screens. The wizard asks for what the merchant already has — an
  // address, a phone number — before it asks them to learn anything.
  redirect('/onboarding/setup/store');
}

/**
 * Where a signed-in user with no store lands.
 *
 * Reachable when someone was removed from every team they belonged to, or
 * created an account through an invite that was then revoked. Rather than a
 * dead end, they get a store of their own.
 */
export default async function OnboardingPage() {
  const user = await requireUser();
  const memberships = await prisma.membership.count({ where: { userId: user.id } });
  if (memberships > 0) redirect('/dashboard');

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="card w-full max-w-md p-7">
        <h1 className="text-xl font-semibold text-white">Create a store</h1>
        <p className="mt-1.5 text-sm text-ink-300">
          You are signed in as {user.email} but you are not on any store yet. Make one, or ask a
          store owner to send you an invite link.
        </p>
        <ActionForm action={createStoreAction} className="mt-6 space-y-4">
          <Field label="Store name" htmlFor="name" hint="Buyers see this at checkout.">
            <input id="name" name="name" required maxLength={120} className="input" />
          </Field>
          <SubmitButton>Create my store</SubmitButton>
        </ActionForm>
      </div>
    </main>
  );
}
