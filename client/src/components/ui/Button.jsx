import { Link } from 'react-router-dom'
import { cn } from '../../utils/cn'

const base =
  'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0'

const variants = {
  primary: 'bg-violet text-white shadow-glow hover:bg-violet-soft hover:shadow-glow-lg hover:-translate-y-0.5',
  secondary: 'glass text-ink hover:border-violet/60 hover:-translate-y-0.5',
  ghost: 'text-dim hover:text-ink hover:bg-white/5',
}

const sizes = {
  sm: 'h-9 px-3.5 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-7 text-base',
}

/** Renders a router <Link> when `to` is given, otherwise a <button>. */
export default function Button({ to, variant = 'primary', size = 'md', className, children, ...rest }) {
  const classes = cn(base, variants[variant], sizes[size], className)
  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {children}
      </Link>
    )
  }
  return (
    <button type="button" className={classes} {...rest}>
      {children}
    </button>
  )
}
