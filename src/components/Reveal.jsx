import { useEffect, useRef, useState } from 'react'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Scroll-triggered fade-up. Falls back to plain content when the user has
 * asked for reduced motion or IntersectionObserver is unavailable.
 */
export default function Reveal({ children, delay = 0, as: Tag = 'div', className = '' }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(() => prefersReducedMotion())

  useEffect(() => {
    if (shown || !ref.current || typeof IntersectionObserver === 'undefined') {
      setShown(true)
      return
    }
    const el = ref.current
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          io.unobserve(el)
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.08 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [shown])

  return (
    <Tag
      ref={ref}
      className={`${className} transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        shown ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'
      }`}
      style={{ transitionDelay: shown ? `${delay}ms` : '0ms' }}
    >
      {children}
    </Tag>
  )
}
