interface StepCardProps {
  number: number
  title: string
  enabled?: boolean
  onToggle?: (v: boolean) => void
  hasToggle?: boolean
  disabled?: boolean
  children: React.ReactNode
}

export default function StepCard({
  number,
  title,
  enabled = true,
  onToggle,
  hasToggle = false,
  disabled = false,
  children,
}: StepCardProps) {
  return (
    <div
      className={`bg-surface-1 border border-border rounded-xl p-6 transition-all duration-200 ${
        disabled ? 'opacity-40 pointer-events-none select-none' : ''
      }`}
    >
      <div className="flex items-center gap-3 mb-5">
        <span className="bg-gradient-to-br from-violet-500 to-violet-700 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-sm shadow-violet-600/30">
          {number}
        </span>
        <h2 className="text-xl font-semibold text-zinc-100 flex-1 tracking-tight">{title}</h2>
        {hasToggle && onToggle && (
          <button
            type="button"
            onClick={() => onToggle(!enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-zinc-900 ${
              enabled ? 'bg-violet-600' : 'bg-surface-3'
            }`}
            aria-pressed={enabled}
            aria-label={`Toggle ${title}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        )}
      </div>
      <div>{children}</div>
    </div>
  )
}
