import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { readLinkToken, startBuyerSession } from '@/lib/buyer-session';

export const dynamic = 'force-dynamic';

/** The link from the sign-in email: turn it into a portal session. */
export async function GET(request: Request, { params }: { params: { account: string } }) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') ?? '';
  const store = await prisma.account.findUnique({ where: { slug: params.account }, select: { id: true, slug: true } });
  const claim = readLinkToken(token);

  if (!store || !claim || claim.accountId !== store.id) {
    return NextResponse.redirect(new URL(`/my/${params.account}?expired=1`, url.origin));
  }
  startBuyerSession(store.id, claim.email);
  return NextResponse.redirect(new URL(`/my/${store.slug}`, url.origin));
}
