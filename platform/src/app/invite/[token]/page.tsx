import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { sha256 } from '@/lib/crypto';
import { setActiveAccount } from '@/lib/tenancy';
import { ActionForm, SubmitButton, type ActionState } from '@/components/action-form';

export const metadata: Metadata = { title: 'Join a store' };

async function acceptInviteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  'use server';
  const token = String(formData.get('token') ?? '');
  const user = await currentUser();
  if (!user) return { error: 'Sign in first, then open the invite link again.' };

  const invite = await prisma.invite.findUnique({ where: { tokenHash: sha256(token) } });
  if (!invite || invite.acceptedAt) return { error: 'That invite has already been used.' };
  if (invite.expiresAt.getTime() < Date.now()) return { error: 'That invite has expired.' };

  // Tie the invite to the address it was sent to. Otherwise a forwarded link
  // lets anyone with the URL walk into someone elses orders.
  if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
    return {
      error: `This invite was sent to ${invite.email}. Sign in with that address to accept it.`,
    };
  }

  await prisma.$transaction([
    prisma.membership.upsert({
      where: { userId_accountId: { userId: user.id, accountId: invite.accountId } },
      create: { userId: user.id, accountId: invite.accountId, role: invite.role },
      update: { role: invite.role },
    }),
    prisma.invite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } }),
  ]);

  await setActiveAccount(invite.accountId);
  revalidatePath('/dashboard');
  redirect('/dashboard');
}

export default async function InvitePage({ params }: { params: { token: string } }) {
  const invite = await prisma.invite.findUnique({
    where: { tokenHash: sha256(params.token) },
    include: { account: { select: { name: true } } },
  });

  const user = await currentUser();
  const valid = invite && !invite.acceptedAt && invite.expiresAt.getTime() > Date.now();

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="card w-full max-w-md p-7">
        {!valid ? (
          <>
            <h1 className="text-xl font-semibold text-white">This invite is not usable</h1>
            <p className="mt-1.5 text-sm text-ink-300">
              It may have expired, been revoked, or already been accepted. Ask the store owner for a
              new one.
            </p>
            <Link href="/login" className="btn-ghost mt-6 w-full">
              Go to sign in
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-white">
              Join {invite.account.name}
            </h1>
            <p className="mt-1.5 text-sm text-ink-300">
              You have been invited as {invite.role.toLowerCase()}. The invite is tied to{' '}
              <strong className="text-ink-100">{invite.email}</strong>.
            </p>

            {user ? (
              <ActionForm action={acceptInviteAction} className="mt-6 space-y-4">
                <input type="hidden" name="token" value={params.token} />
                <p className="text-sm text-ink-400">
                  Signed in as {user.email}.
                </p>
                <SubmitButton>Accept the invite</SubmitButton>
              </ActionForm>
            ) : (
              <div className="mt-6 space-y-3">
                <p className="text-sm text-ink-400">
                  Sign in with {invite.email}, or create an account with that address, then open this
                  link again.
                </p>
                <Link href="/login" className="btn-primary w-full">
                  Sign in
                </Link>
                <Link href="/signup" className="btn-ghost w-full">
                  Create an account
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
