/**
 * Decorative radial glow. Purely visual — never announced.
 */
export default function Glow({ className = '', color = 'rgb(var(--p)/0.35)', size = 520 }) {
  return (
    <span
      aria-hidden="true"
      className={`glow ${className}`}
      style={{ width: size, height: size, background: color }}
    />
  )
}
