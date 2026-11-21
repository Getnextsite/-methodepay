# On-ramp checkout proxy

`checkout.methodepay.com` in front of the on-ramp Worker.

## Why this exists

The on-ramp runs as a Cloudflare Worker. Buyers are redirected to it mid-payment,
so that URL is the one thing in the flow they actually read — it should carry the
brand they just handed money to.

It cannot simply be a DNS record. `methodepay.com` answers from Vercel
nameservers, and a Cloudflare Worker custom domain needs the zone on Cloudflare,
so `checkout.methodepay.com` resolved to Vercel and returned
`DEPLOYMENT_NOT_FOUND`. Pointing a CNAME at `workers.dev` does not rescue it
either — Cloudflare routes on the hostname it is given and answers `403`.

So the host is served by Vercel, which already holds the zone, and every request
is rewritten to the Worker. Vercel sets the upstream `Host` to the destination,
which is exactly what the Worker needs to recognise the request as its own.

## What it is

No build, no framework, no code: a `vercel.json` and a placeholder page the
catch-all rewrite means nobody ever sees. The whole project is one rewrite rule,
deliberately — anything living here would be in the path of a payment.

## Changing the upstream

The Worker hostname appears twice: in `vercel.json` here, and as the default in
`platform/src/lib/gateway/onramp-hosts.ts`. They are separate on purpose — this
one is where the buyer is sent, and that one is where the server talks. A
merchant can override both per store from the dashboard without a deploy.

## Checking it works

```bash
curl -s "https://checkout.methodepay.com/control/convert.php?value=10&from=eur"
```

A healthy response is JSON with `status`, `value_coin` and `exchange_rate`. If it
returns Vercel's `DEPLOYMENT_NOT_FOUND`, the domain is not attached to this
project.
