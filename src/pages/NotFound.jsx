import { Link } from 'react-router-dom'
import useSeo from '../lib/useSeo.js'
import Glow from '../components/Glow.jsx'

export default function NotFound() {
  useSeo({
    title: 'Page not found',
    description: 'That page does not exist. Head back to MethodePay.',
    path: '/404',
  })

  return (
    <section className="relative overflow-hidden">
      <Glow className="-top-20 left-1/2 -translate-x-1/2" size={520} />
      <div className="container-page relative py-32 text-center">
        <p className="font-mono text-sm text-violet-400">404</p>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tightest text-white sm:text-5xl">
          That page took a different rail.
        </h1>
        <p className="lead mx-auto mt-4 max-w-md">
          The link is broken or the page moved. Everything else is one click away.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/" className="btn-primary">
            Back to home
          </Link>
          <Link to="/docs" className="btn-secondary">
            Read the docs
          </Link>
        </div>
      </div>
    </section>
  )
}
