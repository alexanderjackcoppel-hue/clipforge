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
  muteOriginalAudio: boolean
  onMuteOriginalAudio: (v: boolean) => void
  bgMusicEnabled: boolean
  onBgMusicToggle: (v: boolean) => void
  bgMusicFile: File | null
  onBgMusicFile: (f: File | null) => void
  bgMusicVolume: number
  onBgMusicVolume: (v: number) => void
  bgMusicFadeIn: boolean
  onBgMusicFadeIn: (v: boolean) => void
  bgMusicFadeOut: boolean
  onBgMusicFadeOut: (v: boolean) => void
  disabled: boolean
}

function Toggle({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-zinc-900 ${on ? 'bg-violet-600' : 'bg-zinc-700'}`}
        aria-pressed={on}
        aria-label={label}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${on ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
      <span className="text-sm text-zinc-300">{label}</span>
    </div>
  )
}

export default function VoiceoverStep({
  enabled, onToggle, voiceoverFile, onVoiceoverFile,
  originalVolume, onOriginalVolume, voiceoverVolume, onVoiceoverVolume,
  muteOriginalAudio, onMuteOriginalAudio,
  bgMusicEnabled, onBgMusicToggle, bgMusicFile, onBgMusicFile,
  bgMusicVolume, onBgMusicVolume, bgMusicFadeIn, onBgMusicFadeIn,
  bgMusicFadeOut, onBgMusicFadeOut,
  disabled,
}: VoiceoverStepProps) {
  const voiceInputRef = useRef<HTMLInputElement>(null)
  const musicInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className={`space-y-5 ${disabled ? 'pointer-events-none' : ''}`}>

      {/* ── Original audio mute ── */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={muteOriginalAudio}
            onChange={e => onMuteOriginalAudio(e.target.checked)}
            className="w-4 h-4 accent-violet-500"
          />
          <span className="text-sm text-zinc-300">Mute original audio</span>
        </label>
        {!muteOriginalAudio && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-zinc-400">
              <label>Original volume</label>
              <span>{Math.round(originalVolume * 100)}%</span>
            </div>
            <input
              type="range" min={0} max={1} step={0.01} value={originalVolume}
              onChange={e => onOriginalVolume(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
        )}
      </div>

      <div className="border-t border-zinc-800" />

      {/* ── Voiceover ── */}
      <div className="space-y-4">
        <Toggle on={enabled} onToggle={() => onToggle(!enabled)} label={enabled ? 'Voiceover on' : 'Voiceover off'} />

        {enabled && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Audio File</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => voiceInputRef.current?.click()}
                  className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 rounded-lg px-4 py-2.5 text-sm transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                  Choose Audio
                </button>
                <span className="text-sm text-zinc-400 truncate max-w-xs">{voiceoverFile ? voiceoverFile.name : 'No file chosen'}</span>
              </div>
              <input ref={voiceInputRef} type="file"
                accept="audio/mpeg,audio/mp3,audio/wav,audio/wave,audio/mp4,audio/x-m4a,audio/aac"
                onChange={e => onVoiceoverFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-zinc-400">
                <label>Voiceover volume</label>
                <span>{Math.round(voiceoverVolume * 100)}%</span>
              </div>
              <input
                type="range" min={0} max={1} step={0.01} value={voiceoverVolume}
                onChange={e => onVoiceoverVolume(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-zinc-800" />

      {/* ── Background music ── */}
      <div className="space-y-4">
        <Toggle on={bgMusicEnabled} onToggle={() => onBgMusicToggle(!bgMusicEnabled)} label={bgMusicEnabled ? 'Background music on' : 'Background music off'} />

        {bgMusicEnabled && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Music File (MP3/WAV — loops if shorter than clip)</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => musicInputRef.current?.click()}
                  className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 rounded-lg px-4 py-2.5 text-sm transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                  Choose Music
                </button>
                <span className="text-sm text-zinc-400 truncate max-w-xs">{bgMusicFile ? bgMusicFile.name : 'No file chosen'}</span>
              </div>
              <input ref={musicInputRef} type="file"
                accept="audio/mpeg,audio/mp3,audio/wav,audio/wave"
                onChange={e => onBgMusicFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-zinc-400">
                <label>Music volume</label>
                <span>{Math.round(bgMusicVolume * 100)}%</span>
              </div>
              <input
                type="range" min={0} max={1} step={0.01} value={bgMusicVolume}
                onChange={e => onBgMusicVolume(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="flex items-center gap-5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={bgMusicFadeIn} onChange={e => onBgMusicFadeIn(e.target.checked)} className="w-3.5 h-3.5 accent-violet-500" />
                <span className="text-xs text-zinc-400">Fade in (1s)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={bgMusicFadeOut} onChange={e => onBgMusicFadeOut(e.target.checked)} className="w-3.5 h-3.5 accent-violet-500" />
                <span className="text-xs text-zinc-400">Fade out (1s)</span>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
