import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const KEY = 'mp-cookie-choice'

/**
 * Cookie consent, done the way the policy says it is done.
 *
 * Nothing optional runs before a choice is made — there is no analytics script
 * on this site waiting to be unblocked, so the banner is a promise we can
 * actually keep rather than a formality over a tracker that already fired.
 *
 * Accept and Decline are given equal weight. A decline hidden behind "manage
 * preferences" is the dark pattern that consent rules exist to stop, and it is
 * the kind of thing that makes a payments company look untrustworthy for the
 * sake of a few percent of analytics coverage.
 */
export function cookieChoice() {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function openCookieSettings() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* private mode — the banner simply shows again next load */
  }
  window.dispatchEvent(new Event('mp-cookie-reopen'))
}

export default function CookieConsent() {
  // Starts closed so the server-rendered HTML and the first client paint agree.
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!cookieChoice()) setOpen(true)
    const reopen = () => setOpen(true)
    window.addEventListener('mp-cookie-reopen', reopen)
    return () => window.removeEventListener('mp-cookie-reopen', reopen)
  }, [])

  const choose = useCallback((value) => {
    try {
      localStorage.setItem(KEY, value)
    } catch {
      /* ignore */
    }
    setOpen(false)
  }, [])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie choices"
      className="fixed inset-x-0 bottom-0 z-[70] p-3 sm:p-5"
    >
      <div className="glass mx-auto flex max-w-3xl flex-col gap-4 bg-ink/95 p-5 shadow-lift backdrop-blur-xl sm:flex-row sm:items-center">
        <p className="min-w-0 flex-1 text-sm leading-relaxed text-zinc-300">
          We use the cookies this site needs to work, and nothing else unless you say yes. No
          advertising cookies, ever.{' '}
          <Link to="/legal/cookies" className="font-medium text-violet-300 underline underline-offset-4">
            What we set
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2.5">
          <button type="button" onClick={() => choose('declined')} className="btn-secondary !px-4 !py-2.5">
            Decline
          </button>
          <button type="button" onClick={() => choose('accepted')} className="btn-primary !px-4 !py-2.5">
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}
