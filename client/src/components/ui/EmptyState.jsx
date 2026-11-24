/** Friendly message shown when a list has nothing to display. */
export default function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="glass mx-auto flex max-w-md flex-col items-center rounded-2xl px-6 py-12 text-center">
      {Icon && (
        <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-violet/15 text-violet-soft">
          <Icon size={26} />
        </div>
      )}
      <h3 className="text-lg font-semibold">{title}</h3>
      {text && <p className="mt-1.5 text-sm text-dim">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
