import type { Metadata } from 'next';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import type { Role } from '@prisma/client';
import { requireTenant, assertRole, ForbiddenError } from '@/lib/tenancy';
import { prisma } from '@/lib/db';
import { randomToken, sha256 } from '@/lib/crypto';
import { entitlementsFor, withinSeatLimit } from '@/lib/entitlements';
import { env } from '@/lib/env';
import { Banner, Field, PageHeader, Section } from '@/components/ui';
import { ActionForm, SubmitButton, type ActionState } from '@/components/action-form';

export const metadata: Metadata = { title: 'Team' };

const ROLE_COPY: Record<Role, string> = {
  OWNER: 'Everything, including billing, API keys and removing people.',
  ADMIN: 'Products, methods, design, coupons and refunds. No billing.',
  STAFF: 'Orders only: confirm payments, add notes, mark shipped.',
};

async function inviteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  'use server';
  try {
    const tenant = await requireTenant();
    assertRole(tenant, 'OWNER');

    const email = String(formData.get('email') ?? '').trim().toLowerCase();
    if (!email.includes('@')) return { error: 'Enter a valid email address.' };

    const requested = String(formData.get('role') ?? 'STAFF');
    const role: Role = requested === 'ADMIN' || requested === 'OWNER' ? (requested as Role) : 'STAFF';

    const ent = entitlementsFor(tenant.account);
    const [members, pending] = await Promise.all([
      prisma.membership.count({ where: { accountId: tenant.account.id } }),
      prisma.invite.count({
        where: { accountId: tenant.account.id, acceptedAt: null, expiresAt: { gt: new Date() } },
      }),
    ]);
    // Pending invites count against the seat limit, or a store could invite
    // twenty people on a one-seat plan and let them all walk in.
    if (!withinSeatLimit(ent, members + pending)) {
      return {
        error: `The ${ent.label} plan covers ${ent.seats} seat${ent.seats === 1 ? '' : 's'}, and you have ${members + pending} in use or pending.`,
      };
    }

    const already = await prisma.membership.findFirst({
      where: { accountId: tenant.account.id, user: { email } },
    });
    if (already) return { error: 'That person is already on the team.' };

    const token = randomToken(24);
    await prisma.invite.create({
      data: {
        accountId: tenant.account.id,
        email,
        role,
        tokenHash: sha256(token),
        expiresAt: new Date(Date.now() + 7 * 86_400_000),
      },
    });

    revalidatePath('/dashboard/team');
    // Emailing the invite needs SMTP, which many deployments will not have on
    // day one. Handing back the link always works, and the owner can send it
    // however they already talk to their team.
    return {
      message: `Invite created for ${email}. Send them this link — it expires in 7 days:\n${env.appUrl}/invite/${token}`,
    };
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }
}

async function revokeInviteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  'use server';
  try {
    const tenant = await requireTenant();
    assertRole(tenant, 'OWNER');
    await prisma.invite.deleteMany({
      where: { id: String(formData.get('id') ?? ''), accountId: tenant.account.id },
    });
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }
  revalidatePath('/dashboard/team');
  return { message: 'Invite revoked.' };
}

async function changeRoleAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  'use server';
  try {
    const tenant = await requireTenant();
    assertRole(tenant, 'OWNER');

    const membershipId = String(formData.get('id') ?? '');
    const requested = String(formData.get('role') ?? 'STAFF');
    const role: Role = requested === 'ADMIN' || requested === 'OWNER' ? (requested as Role) : 'STAFF';

    const membership = await prisma.membership.findFirst({
      where: { id: membershipId, accountId: tenant.account.id },
    });
    if (!membership) return { error: 'That person is no longer on the team.' };

    // Demoting the last owner locks the store out of its own billing.
    if (membership.role === 'OWNER' && role !== 'OWNER') {
      const owners = await prisma.membership.count({
        where: { accountId: tenant.account.id, role: 'OWNER' },
      });
      if (owners <= 1) {
        return { error: 'Promote someone else to owner first — a store cannot be left without one.' };
      }
    }

    await prisma.membership.update({ where: { id: membership.id }, data: { role } });
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }
  revalidatePath('/dashboard/team');
  return { message: 'Role updated.' };
}

async function removeMemberAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  'use server';
  try {
    const tenant = await requireTenant();
    assertRole(tenant, 'OWNER');

    const membership = await prisma.membership.findFirst({
      where: { id: String(formData.get('id') ?? ''), accountId: tenant.account.id },
    });
    if (!membership) return { error: 'That person is no longer on the team.' };
    if (membership.userId === tenant.user.id) {
      return { error: 'You cannot remove yourself. Ask another owner to do it.' };
    }
    if (membership.role === 'OWNER') {
      const owners = await prisma.membership.count({
        where: { accountId: tenant.account.id, role: 'OWNER' },
      });
      if (owners <= 1) return { error: 'That is the only owner.' };
    }

    await prisma.membership.delete({ where: { id: membership.id } });
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }
  revalidatePath('/dashboard/team');
  return { message: 'Removed from the team.' };
}

export default async function TeamPage() {
  const { account, role, user } = await requireTenant();
  const ent = entitlementsFor(account);

  const [members, invites] = await Promise.all([
    prisma.membership.findMany({
      where: { accountId: account.id },
      include: { user: { select: { id: true, email: true, name: true, lastLoginAt: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.invite.findMany({
      where: { accountId: account.id, acceptedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const isOwner = role === 'OWNER';

  return (
    <>
      <PageHeader
        title="Team"
        description={`${members.length} of ${ent.seats} seat${ent.seats === 1 ? '' : 's'} used on the ${ent.label} plan.`}
      />

      {!isOwner ? (
        <Banner tone="info">
          Only an owner can invite people or change roles. You are signed in as {role.toLowerCase()}.
        </Banner>
      ) : null}

      <div className="space-y-6">
        <Section title="People">
          <ul className="space-y-2.5">
            {members.map((member) => (
              <li
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-600/70 bg-ink-900/40 px-3.5 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {member.user.name ?? member.user.email}
                    {member.user.id === user.id ? (
                      <span className="ml-2 text-xs font-normal text-ink-400">you</span>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-ink-400">
                    {member.user.email} ·{' '}
                    {member.user.lastLoginAt
                      ? `last in ${member.user.lastLoginAt.toISOString().slice(0, 10)}`
                      : 'never signed in'}
                  </p>
                </div>

                {isOwner ? (
                  <div className="flex items-center gap-2">
                    <ActionForm action={changeRoleAction} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={member.id} />
                      <select
                        name="role"
                        defaultValue={member.role}
                        aria-label={`Role for ${member.user.email}`}
                        className="input !w-auto !py-1.5 !text-xs"
                      >
                        <option value="STAFF">Staff</option>
                        <option value="ADMIN">Admin</option>
                        <option value="OWNER">Owner</option>
                      </select>
                      <SubmitButton variant="ghost" className="!px-2.5 !py-1.5 !text-xs">
                        Save
                      </SubmitButton>
                    </ActionForm>

                    {member.user.id !== user.id ? (
                      <ActionForm action={removeMemberAction}>
                        <input type="hidden" name="id" value={member.id} />
                        <SubmitButton
                          variant="danger"
                          className="!px-2.5 !py-1.5 !text-xs"
                          confirm={`Remove ${member.user.email} from ${account.name}?`}
                        >
                          Remove
                        </SubmitButton>
                      </ActionForm>
                    ) : null}
                  </div>
                ) : (
                  <span className="chip">{member.role.toLowerCase()}</span>
                )}
              </li>
            ))}
          </ul>

          <dl className="mt-5 space-y-1.5 border-t border-ink-600/70 pt-4 text-xs">
            {(Object.keys(ROLE_COPY) as Role[]).map((r) => (
              <div key={r} className="flex gap-2">
                <dt className="w-14 shrink-0 font-medium text-ink-200">{r.toLowerCase()}</dt>
                <dd className="text-ink-400">{ROLE_COPY[r]}</dd>
              </div>
            ))}
          </dl>
        </Section>

        {isOwner ? (
          <Section
            title="Invite someone"
            description="They create their own password; you never see or set it."
          >
            <ActionForm action={inviteAction}>
              <div className="grid gap-4 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
                <Field label="Email" htmlFor="email">
                  <input id="email" name="email" type="email" required className="input" />
                </Field>
                <Field label="Role" htmlFor="role">
                  <select id="role" name="role" defaultValue="STAFF" className="input">
                    <option value="STAFF">Staff</option>
                    <option value="ADMIN">Admin</option>
                    <option value="OWNER">Owner</option>
                  </select>
                </Field>
                <SubmitButton>Create invite</SubmitButton>
              </div>
            </ActionForm>

            {invites.length > 0 ? (
              <ul className="mt-5 space-y-2 border-t border-ink-600/70 pt-5">
                {invites.map((invite) => (
                  <li key={invite.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate">
                      <span className="text-ink-100">{invite.email}</span>
                      <span className="ml-2 text-xs text-ink-400">
                        {invite.role.toLowerCase()} · expires{' '}
                        {invite.expiresAt.toISOString().slice(0, 10)}
                      </span>
                    </span>
                    <ActionForm action={revokeInviteAction} className="shrink-0">
                      <input type="hidden" name="id" value={invite.id} />
                      <SubmitButton variant="ghost" className="!px-2.5 !py-1.5 !text-xs">
                        Revoke
                      </SubmitButton>
                    </ActionForm>
                  </li>
                ))}
              </ul>
            ) : null}
          </Section>
        ) : null}

        <p className="text-xs text-ink-400">
          Need more seats?{' '}
          <Link href="/dashboard/billing" className="text-mint hover:underline">
            Compare plans
          </Link>
          .
        </p>
      </div>
    </>
  );
}
