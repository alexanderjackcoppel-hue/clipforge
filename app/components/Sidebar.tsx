'use client'

import { Download, Scissors, Frame, Subtitles, Volume2, Layers, Upload } from 'lucide-react'
import Tooltip from './Tooltip'

export type EditorStep = 'import' | 'trim' | 'platform' | 'subtitles' | 'voiceover' | 'overlay' | 'export'

const STEPS: { id: EditorStep; label: string; icon: typeof Download }[] = [
  { id: 'import',    label: 'Import',   icon: Download },
  { id: 'trim',      label: 'Trim',     icon: Scissors },
  { id: 'platform',  label: 'Format',   icon: Frame },
  { id: 'subtitles', label: 'Captions', icon: Subtitles },
  { id: 'voiceover', label: 'Audio',    icon: Volume2 },
  { id: 'overlay',   label: 'Overlay',  icon: Layers },
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
      className="w-[72px] flex-shrink-0 glass-panel border-r flex flex-col items-center py-3 relative z-20 overflow-visible gap-1"
    >
      <div className="flex-1 flex flex-col items-center gap-1 w-full">
        {STEPS.map(step => {
          const isActive    = activeStep === step.id
          const isComplete  = completedSteps.has(step.id)
          const isLocked    = lockedSteps.has(step.id)
          const hasError    = errorSteps.has(step.id)
          const Icon = step.icon

          const btn = (
            <button
              key={isLocked ? undefined : step.id}
              type="button"
              disabled={isLocked}
              aria-current={isActive ? 'step' : undefined}
              onClick={() => !isLocked && onStepChange(step.id)}
              className={`relative w-[56px] flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-500 ${
                isLocked
                  ? 'opacity-30 cursor-not-allowed'
                  : isActive
                    ? 'bg-surface-3 border border-violet-500/20'
                    : 'hover:bg-surface-3/50 border border-transparent'
              }`}
            >
              {/* Icon */}
              <span className="relative">
                <Icon
                  size={20}
                  strokeWidth={1.8}
                  className={`transition-colors duration-150 ${
                    isActive
                      ? 'text-violet-400'
                      : isLocked
                        ? 'text-zinc-600'
                        : 'text-zinc-500'
                  }`}
                />
                {/* Completed dot */}
                {isComplete && !hasError && (
                  <span className="absolute -top-0.5 -right-1 w-[6px] h-[6px] rounded-full bg-emerald-400" />
                )}
                {/* Error dot */}
                {hasError && (
                  <span className="absolute -top-0.5 -right-1 w-[6px] h-[6px] rounded-full bg-red-400" />
                )}
              </span>

              {/* Label */}
              <span className={`text-[10px] font-medium leading-none transition-colors duration-150 ${
                isActive ? 'text-zinc-200' : isLocked ? 'text-zinc-600' : 'text-zinc-500'
              }`}>
                {step.label}
              </span>
            </button>
          )

          return isLocked ? (
            <Tooltip key={step.id} text="Import a video first">{btn}</Tooltip>
          ) : btn
        })}
      </div>

      {/* Separator + Export */}
      <div className="w-10 border-t border-border/40 my-1" />
      <button
        type="button"
        aria-current={activeStep === 'export' ? 'step' : undefined}
        onClick={() => onStepChange('export')}
        className={`w-[56px] flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-500 ${
          activeStep === 'export'
            ? 'bg-surface-3 border border-violet-500/20'
            : 'hover:bg-surface-3/50 border border-transparent'
        }`}
      >
        <Upload
          size={20}
          strokeWidth={1.8}
          className={`transition-colors duration-150 ${
            activeStep === 'export' ? 'text-violet-400' : 'text-zinc-500'
          }`}
        />
        <span className={`text-[10px] font-medium leading-none transition-colors duration-150 ${
          activeStep === 'export' ? 'text-zinc-200' : 'text-zinc-500'
        }`}>
          Export
        </span>
      </button>
    </nav>
  )
}
