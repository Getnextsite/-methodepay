import { Link } from 'react-router-dom'
import Glow from './Glow.jsx'
import Reveal from './Reveal.jsx'
import { ArrowRight } from './Icons.jsx'
import { signUpUrl } from '../lib/appUrl.js'

export default function CtaBand({
  title = 'Stop losing sales to a payment page.',
  sub = 'Install MethodePay, switch on the rails that work where you sell, and take money today. 14-day money-back guarantee.',
}) {
  return (
    <section className="container-page py-20 sm:py-28">
      <Reveal className="relative overflow-hidden rounded-3xl border border-white/[0.09] bg-gradient-to-b from-violet-500/[0.12] to-transparent px-6 py-14 text-center sm:px-12">
        <Glow className="-top-32 left-1/2 -translate-x-1/2" size={620} />
        <div className="relative">
          <h2 className="mx-auto max-w-2xl text-3xl font-extrabold leading-[1.1] tracking-tightest text-white sm:text-4xl">
            {title}
          </h2>
          <p className="lead mx-auto mt-4 max-w-xl">{sub}</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a href={signUpUrl} className="btn-primary">
              Start free <ArrowRight width={16} height={16} />
            </a>
            <Link to="/pricing" className="btn-secondary">
              Compare plans
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  )
}
