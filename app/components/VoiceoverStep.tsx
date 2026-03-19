'use client'
import { useRef } from 'react'

interface VoiceoverStepProps {
  enabled: boolean
  onToggle: (v: boolean) => void
  voiceoverFile: File | null
  onVoiceoverFile: (f: File | null) => void
  originalVolume: number
  onOriginalVolume: (v: number) => void
  voiceoverVolume: number
  onVoiceoverVolume: (v: number) => void
  disabled: boolean
}

export default function VoiceoverStep({
  enabled,
  onToggle,
  voiceoverFile,
  onVoiceoverFile,
  originalVolume,
  onOriginalVolume,
  voiceoverVolume,
  onVoiceoverVolume,
  disabled,
}: VoiceoverStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    onVoiceoverFile(f)
  }

  return (
    <div className={`space-y-4 ${disabled ? 'pointer-events-none' : ''}`}>
      {/* Toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onToggle(!enabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-zinc-900 ${
            enabled ? 'bg-violet-600' : 'bg-zinc-700'
          }`}
          aria-pressed={enabled}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span className="text-sm text-zinc-300">{enabled ? 'Voiceover on' : 'Voiceover off'}</span>
      </div>

      {enabled && (
        <div className="space-y-5">
          {/* File upload */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">Audio File</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 rounded-lg px-4 py-2.5 text-sm transition-colors duration-150"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                Choose Audio
              </button>
              <span className="text-sm text-zinc-400 truncate max-w-xs">
                {voiceoverFile ? voiceoverFile.name : 'No file chosen'}
              </span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/mpeg,audio/mp3,audio/wav,audio/wave,audio/mp4,audio/x-m4a,audio/aac"
              onChange={handleFileChange}
              className="hidden"
            />
            <p className="text-xs text-zinc-600">Supported: MP3, WAV, M4A, AAC (max 100MB)</p>
          </div>

          {/* Volume sliders */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm text-zinc-300">
                <label>Original Audio</label>
                <span className="text-zinc-400">{Math.round(originalVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={originalVolume}
                onChange={e => onOriginalVolume(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-zinc-600">
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-sm text-zinc-300">
                <label>Voiceover Volume</label>
                <span className="text-zinc-400">{Math.round(voiceoverVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={voiceoverVolume}
                onChange={e => onVoiceoverVolume(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-zinc-600">
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
