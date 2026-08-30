import Reveal from './Reveal.jsx'

export default function SectionHeading({ eyebrow, title, sub, align = 'center', id }) {
  const centered = align === 'center'
  return (
    <Reveal className={centered ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
      <h2
        id={id}
        className="text-3xl font-extrabold leading-[1.1] tracking-tightest text-white sm:text-4xl"
      >
        {title}
      </h2>
      {sub && <p className="lead mt-4">{sub}</p>}
    </Reveal>
  )
}
