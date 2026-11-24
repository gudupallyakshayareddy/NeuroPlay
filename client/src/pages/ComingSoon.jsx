import { Hammer } from 'lucide-react'
import Button from '../components/ui/Button.jsx'

/** Honest placeholder for pages whose backend does not exist yet. */
export default function ComingSoon({ title, phase, text }) {
  return (
    <div className="section-pad grid min-h-[60vh] place-items-center py-16">
      <div className="glass max-w-md rounded-2xl p-8 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-violet/15 text-violet-soft">
          <Hammer size={26} />
        </div>
        <span className="rounded-full border border-cyan/40 px-3 py-1 text-xs font-medium text-cyan">Coming in {phase}</span>
        <h1 className="mt-4 text-2xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-dim">{text}</p>
        <div className="mt-6 flex justify-center gap-2">
          <Button to="/games">Browse games</Button>
          <Button to="/" variant="secondary">Home</Button>
        </div>
      </div>
    </div>
  )
}
