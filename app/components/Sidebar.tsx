'use client'

export type EditorStep = 'import' | 'trim' | 'platform' | 'subtitles' | 'voiceover' | 'overlay' | 'export'

const STEPS: { id: EditorStep; label: string; num: number }[] = [
  { id: 'import',    label: 'Import',    num: 1 },
  { id: 'trim',      label: 'Trim',      num: 2 },
  { id: 'platform',  label: 'Platform',  num: 3 },
  { id: 'subtitles', label: 'Subtitles', num: 4 },
  { id: 'voiceover', label: 'Audio',     num: 5 },
  { id: 'overlay',   label: 'Overlay',   num: 6 },
]

interface SidebarProps {
  activeStep: EditorStep
  onStepChange: (step: EditorStep) => void
  completedSteps: Set<EditorStep>
  lockedSteps: Set<EditorStep>
  errorSteps: Set<EditorStep>
}

export default function Sidebar({
  activeStep,
  onStepChange,
  completedSteps,
  lockedSteps,
  errorSteps,
}: SidebarProps) {
  return (
    <nav
      role="navigation"
      aria-label="Editor steps"
      className="w-48 flex-shrink-0 bg-zinc-950 border-r border-zinc-800 flex flex-col py-3"
    >
      <div className="flex-1">
        {STEPS.map(step => {
          const isActive    = activeStep === step.id
          const isComplete  = completedSteps.has(step.id)
          const isLocked    = lockedSteps.has(step.id)
          const hasError    = errorSteps.has(step.id)

          return (
            <button
              key={step.id}
              type="button"
              disabled={isLocked}
              aria-current={isActive ? 'step' : undefined}
              onClick={() => !isLocked && onStepChange(step.id)}
              className={`relative w-full flex items-center gap-2.5 px-3.5 py-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-500 focus-visible:ring-inset ${
                isLocked
                  ? 'opacity-35 cursor-not-allowed text-zinc-500'
                  : isActive
                    ? 'text-zinc-100 bg-zinc-800'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              {/* Active indicator bar */}
              {isActive && (
                <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-violet-600 rounded-r" />
              )}

              {/* Step number / status */}
              <span className={`relative flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                isActive
                  ? 'bg-violet-600 text-white'
                  : isComplete && !hasError
                    ? 'bg-transparent text-emerald-400'
                    : hasError
                      ? 'bg-transparent text-red-400'
                      : 'bg-zinc-800 text-zinc-500'
              }`}>
                {isComplete && !hasError ? (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : hasError ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                ) : (
                  step.num
                )}
              </span>

              <span className="truncate">{step.label}</span>
            </button>
          )
        })}
      </div>

      {/* Divider + export link */}
      <div className="px-3.5 pt-2 mt-1 border-t border-zinc-800">
        <button
          type="button"
          aria-current={activeStep === 'export' ? 'step' : undefined}
          onClick={() => onStepChange('export')}
          className={`w-full text-left text-xs font-medium transition-colors duration-150 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-500 focus-visible:ring-inset ${
            activeStep === 'export' ? 'text-violet-400' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          export ↗
        </button>
      </div>
    </nav>
  )
}
