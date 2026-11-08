/**
 * Where the hosted app lives.
 *
 * The marketing site and the platform are separate deployments — in
 * development they are two ports, in production they will be two hosts — so
 * links between them are real URLs rather than router routes. Set
 * VITE_APP_URL at build time to point this at production.
 */
const APP_URL = (import.meta.env.VITE_APP_URL || 'http://localhost:3000').replace(/\/$/, '')

export const signUpUrl = `${APP_URL}/signup`
export const signInUrl = `${APP_URL}/login`

export default APP_URL
