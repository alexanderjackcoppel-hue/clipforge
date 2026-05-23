'use client'
import { useState, useRef, useEffect } from 'react'
import { PLATFORM_PRESETS, type PlatformPreset } from '@/lib/platformPresets'
import Tooltip from './Tooltip'

interface TopBarProps {
  activePreset: PlatformPreset
  onPresetChange: (preset: PlatformPreset) => void
  onExport: () => void
  canExport: boolean
  displayWidth?: number
  displayHeight?: number
  onSaveProject?: () => void
  onLoadProject?: () => void
  onUndo?: () => void
  onRedo?: () => void
  canUndo?: boolean
  canRedo?: boolean
}

const PRESET_GROUPS = [
  { label: 'YouTube', ids: ['youtube-short', 'youtube-long', 'youtube-4k'] },
  { label: 'Instagram', ids: ['instagram-reel', 'instagram-post', 'instagram-story'] },
  { label: 'Other', ids: ['tiktok', 'twitter-x', 'linkedin', 'pinterest', 'custom'] },
]

export default function TopBar({ activePreset, onPresetChange, onExport, canExport, displayWidth, displayHeight, onSaveProject, onLoadProject, onUndo, onRedo, canUndo, canRedo }: TopBarProps) {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="h-12 glass-panel border-b flex items-center px-4 gap-3 flex-shrink-0 relative z-10">
      {/* Logo */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="bg-violet-600 rounded-md p-1">
          <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        <span className="text-sm font-bold text-zinc-100 tracking-tight">ClipForge</span>
      </div>

      {/* Undo / Redo */}
      {onUndo && onRedo && (
        <div className="flex items-center gap-0.5">
          <Tooltip text="Undo (⌘Z)" position="bottom">
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-surface-3 transition-colors disabled:opacity-30 disabled:pointer-events-none"
              aria-label="Undo"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a5 5 0 015 5v2M3 10l4-4M3 10l4 4" />
              </svg>
            </button>
          </Tooltip>
          <Tooltip text="Redo (⌘⇧Z)" position="bottom">
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-surface-3 transition-colors disabled:opacity-30 disabled:pointer-events-none"
              aria-label="Redo"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 10H11a5 5 0 00-5 5v2M21 10l-4-4M21 10l-4 4" />
              </svg>
            </button>
          </Tooltip>
        </div>
      )}

      <div className="flex-1" />

      {/* Preset picker */}
      <div className="relative" ref={dropdownRef}>
        <Tooltip text="Change output format and resolution" position="bottom">
          <button
            type="button"
            onClick={() => setOpen(v => !v)}
            aria-haspopup="listbox"
            aria-expanded={open}
            className="flex items-center gap-2 bg-surface-2 hover:bg-surface-3 border border-border hover:border-violet-500 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-100 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-500"
          >
            {activePreset.name}
            <span className="font-mono text-xs text-zinc-400">{activePreset.aspectLabel} · {displayWidth ?? activePreset.width}×{displayHeight ?? activePreset.height}</span>
            {activePreset.width > 1920 && (
              <span className="text-[10px] font-medium text-amber-400 bg-amber-400/10 rounded px-1 py-0.5">4K — slow encode</span>
            )}
            <svg className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </Tooltip>

        {open && (
          <div
            role="listbox"
            className="absolute top-full mt-1 right-0 z-50 w-72 glass-panel border rounded-xl shadow-2xl py-2 overflow-hidden"
          >
            {PRESET_GROUPS.map(group => (
              <div key={group.label}>
                <div className="px-3 py-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                  {group.label}
                </div>
                {group.ids.map(id => {
                  const preset = PLATFORM_PRESETS.find(p => p.id === id)
                  if (!preset) return null
                  const isActive = preset.id === activePreset.id
                  return (
                    <button
                      key={preset.id}
                      role="option"
                      aria-selected={isActive}
                      type="button"
                      onClick={() => { onPresetChange(preset); setOpen(false) }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors duration-100 focus-visible:outline-none focus-visible:bg-surface-2 ${
                        isActive
                          ? 'bg-violet-600/15 text-violet-300'
                          : 'text-zinc-300 hover:bg-surface-3'
                      }`}
                    >
                      <span className="font-medium">{preset.name}</span>
                      <span className="font-mono text-xs text-zinc-500">
                        {preset.aspectLabel} · {preset.maxDurationSecs ? `${preset.maxDurationSecs >= 60 ? `${Math.floor(preset.maxDurationSecs / 60)}m` : `${preset.maxDurationSecs}s`} max` : '∞'}
                      </span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1" />

      {/* Save / Load project */}
      {onLoadProject && (
        <Tooltip text="Open a saved .clipforge project" position="bottom">
          <button
            type="button"
            onClick={onLoadProject}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-surface-3 border border-transparent hover:border-border transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            Load
          </button>
        </Tooltip>
      )}
      {onSaveProject && (
        <Tooltip text="Save project as .clipforge file" position="bottom">
          <button
            type="button"
            onClick={onSaveProject}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-surface-3 border border-transparent hover:border-border transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            Save
          </button>
        </Tooltip>
      )}

      {/* Primary export button */}
      <Tooltip text={canExport ? 'Export all trimmed clips' : 'Trim at least one clip first'} position="bottom">
        <button
          type="button"
          onClick={onExport}
          disabled={!canExport}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
            canExport
              ? 'btn-gradient btn-press text-white'
              : 'bg-surface-2 text-zinc-600 cursor-not-allowed'
          } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-1 focus-visible:ring-offset-surface-base`}
        >
          Export
        </button>
      </Tooltip>
    </div>
  )
}
