'use client'
import { useState } from 'react'
import { PLATFORM_PRESETS, type PlatformPreset } from '@/lib/platformPresets'
import FormatStep, { type VideoFormat } from './FormatStep'

const PLATFORM_GROUPS = [
  { label: 'YouTube', ids: ['youtube-short', 'youtube-long', 'youtube-4k'] },
  { label: 'Instagram', ids: ['instagram-reel', 'instagram-post', 'instagram-story'] },
  { label: 'TikTok', ids: ['tiktok'] },
  { label: 'Other', ids: ['twitter-x', 'linkedin', 'pinterest'] },
  { label: 'Custom', ids: ['custom'] },
]

interface PlatformStepProps {
  activePreset: PlatformPreset
  onPresetChange: (preset: PlatformPreset) => void
  // Custom preset dimensions (shown when id === 'custom')
  customWidth: number
  customHeight: number
  onCustomWidthChange: (v: number) => void
  onCustomHeightChange: (v: number) => void
  // Visual style (VideoFormat from FormatStep)
  videoFormat: VideoFormat
  onFormatChange: (f: VideoFormat) => void
  standardBgColor: string
  onStandardBgColorChange: (c: string) => void
  socialBgColor: string
  onSocialBgColorChange: (c: string) => void
  cinematicBgColor: string
  onCinematicBgColorChange: (c: string) => void
  videoBarHeight: number
  onVideoBarHeightChange: (v: number) => void
  disabled: boolean
}

export default function PlatformStep({
  activePreset,
  onPresetChange,
  customWidth,
  customHeight,
  onCustomWidthChange,
  onCustomHeightChange,
  videoFormat,
  onFormatChange,
  standardBgColor,
  onStandardBgColorChange,
  socialBgColor,
  onSocialBgColorChange,
  cinematicBgColor,
  onCinematicBgColorChange,
  videoBarHeight,
  onVideoBarHeightChange,
  disabled,
}: PlatformStepProps) {
  const [customWidthInput, setCustomWidthInput] = useState(String(customWidth))
  const [customHeightInput, setCustomHeightInput] = useState(String(customHeight))

  const is4K = activePreset.width > 1920

  const handleCustomDimCommit = (field: 'width' | 'height', raw: string) => {
    const v = parseInt(raw)
    if (isNaN(v) || v < 100 || v > 7680) return
    const even = v % 2 === 0 ? v : v - 1
    if (field === 'width') { onCustomWidthChange(even); setCustomWidthInput(String(even)) }
    else { onCustomHeightChange(even); setCustomHeightInput(String(even)) }
  }

  return (
    <div className={`space-y-5 ${disabled ? 'pointer-events-none opacity-60' : ''}`}>
      {/* Platform preset grid */}
      <div>
        <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Platform</p>
        <div className="space-y-3">
          {PLATFORM_GROUPS.map(group => (
            <div key={group.label}>
              <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider mb-1.5 px-0.5">
                {group.label}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {group.ids.map(id => {
                  const preset = PLATFORM_PRESETS.find(p => p.id === id)
                  if (!preset) return null
                  const isActive = preset.id === activePreset.id
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      onClick={() => onPresetChange(preset)}
                      className={`flex flex-col items-start p-2 rounded-lg border text-left transition-all duration-150 ${
                        isActive
                          ? 'border-violet-500 bg-violet-600/10'
                          : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                      }`}
                    >
                      <span className={`text-xs font-medium leading-tight ${isActive ? 'text-violet-300' : 'text-zinc-300'}`}>
                        {preset.name}
                      </span>
                      <span className="font-mono text-[10px] text-zinc-500 mt-0.5">
                        {preset.aspectLabel}
                        {preset.maxDurationSecs
                          ? ` · ${preset.maxDurationSecs >= 60 ? `${Math.floor(preset.maxDurationSecs / 60)}m` : `${preset.maxDurationSecs}s`}`
                          : ''}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom dimensions */}
      {activePreset.id === 'custom' && (
        <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800 space-y-2">
          <p className="text-xs font-medium text-zinc-400">Output dimensions</p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={100}
              max={7680}
              step={2}
              value={customWidthInput}
              onChange={e => setCustomWidthInput(e.target.value)}
              onBlur={e => handleCustomDimCommit('width', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 font-mono text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
              placeholder="Width"
            />
            <span className="text-zinc-600 text-xs flex-shrink-0">×</span>
            <input
              type="number"
              min={100}
              max={7680}
              step={2}
              value={customHeightInput}
              onChange={e => setCustomHeightInput(e.target.value)}
              onBlur={e => handleCustomDimCommit('height', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 font-mono text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
              placeholder="Height"
            />
          </div>
          <p className="text-[10px] text-zinc-600">Must be even numbers. 30fps.</p>
        </div>
      )}

      {/* 4K warning */}
      {is4K && (
        <div className="flex items-start gap-2 bg-amber-400/8 border border-amber-400/20 rounded-lg px-3 py-2.5">
          <svg className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 3h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <p className="text-[11px] text-amber-400">Large exports may take several minutes depending on your hardware.</p>
        </div>
      )}

      {/* Visual style */}
      <div>
        <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Visual Style</p>
        <FormatStep
          videoFormat={videoFormat}
          onFormatChange={onFormatChange}
          standardBgColor={standardBgColor}
          onStandardBgColorChange={onStandardBgColorChange}
          socialBgColor={socialBgColor}
          onSocialBgColorChange={onSocialBgColorChange}
          cinematicBgColor={cinematicBgColor}
          onCinematicBgColorChange={onCinematicBgColorChange}
          videoBarHeight={videoBarHeight}
          onVideoBarHeightChange={onVideoBarHeightChange}
          disabled={false}
        />
      </div>
    </div>
  )
}
