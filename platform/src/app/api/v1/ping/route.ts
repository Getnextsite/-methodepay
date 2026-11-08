import { apiError, authenticateApiRequest } from '@/lib/api-keys';
import { entitlementsFor } from '@/lib/entitlements';

export const dynamic = 'force-dynamic';

/** Cheapest possible call to prove a key works and see what it can do. */
export async function GET(request: Request) {
  const caller = await authenticateApiRequest(request);
  if (!caller) return apiError('Invalid or missing API key.', 401, 'unauthorized');

  const ent = entitlementsFor(caller.account);
  return Response.json({
    ok: true,
    account: { id: caller.account.id, name: caller.account.name, slug: caller.account.slug },
    plan: {
      tier: ent.tier,
      label: ent.label,
      products: ent.products,
      seats: ent.seats,
      webhooks: ent.webhooks,
    },
    scopes: caller.scopes,
  });
}
