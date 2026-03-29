'use client'
import { useState } from 'react'
import type { Clip } from '../page'

interface SubtitleLine { id: number; start: number; end: number; text: string }
interface Pos { x: number; y: number }
interface StyleProps { fontSize: number; color: string; position: Pos; fontFamily: string; bold: boolean; outlineWidth: number; textAlign: 'center' | 'left' }

interface SubtitlesStepProps {
  clips: Clip[]
  activeClipId: string | null
  onActiveClipChange: (id: string) => void
  activeTab: 'auto' | 'custom' | 'custom2' | 'emoji'
  onTabChange: (t: 'auto' | 'custom' | 'custom2' | 'emoji') => void

  onToggleAuto: (v: boolean) => void
  onGenerate: () => void
  onAutoLinesChange: (lines: SubtitleLine[]) => void
  autoFontSize: number; onAutoFontSizeChange: (v: number) => void
  autoColor: string; onAutoColorChange: (v: string) => void
  autoFontFamily: string; onAutoFontFamilyChange: (v: string) => void
  autoBold: boolean; onAutoBoldChange: (v: boolean) => void
  autoOutlineWidth: number; onAutoOutlineWidthChange: (v: number) => void
  autoTextAlign: 'center' | 'left'; onAutoTextAlignChange: (v: 'center' | 'left') => void
  autoPosition: Pos

  onToggleCustom: (v: boolean) => void
  onCustomLinesChange: (lines: SubtitleLine[]) => void
  customFontSize: number; onCustomFontSizeChange: (v: number) => void
  customColor: string; onCustomColorChange: (v: string) => void
  customFontFamily: string; onCustomFontFamilyChange: (v: string) => void
  customBold: boolean; onCustomBoldChange: (v: boolean) => void
  customOutlineWidth: number; onCustomOutlineWidthChange: (v: number) => void
  customTextAlign: 'center' | 'left'; onCustomTextAlignChange: (v: 'center' | 'left') => void
  customPosition: Pos

  onToggleCustom2: (v: boolean) => void
  onCustom2LinesChange: (lines: SubtitleLine[]) => void
  custom2FontSize: number; onCustom2FontSizeChange: (v: number) => void
  custom2Color: string; onCustom2ColorChange: (v: string) => void
  custom2FontFamily: string; onCustom2FontFamilyChange: (v: string) => void
  custom2Bold: boolean; onCustom2BoldChange: (v: boolean) => void
  custom2OutlineWidth: number; onCustom2OutlineWidthChange: (v: number) => void
  custom2TextAlign: 'center' | 'left'; onCustom2TextAlignChange: (v: 'center' | 'left') => void
  custom2Position: Pos

  emojiStickers: { id: string; emoji: string; x: number; y: number; size: number }[]
  onAddEmoji: (emoji: string) => void
  onRemoveEmoji: (id: string) => void
  onEmojiSizeChange: (id: string, size: number) => void

  disabled: boolean
}

const PRESET_COLORS = [
  { label: 'White',  value: 'FFFFFF' },
  { label: 'Yellow', value: 'FFFF00' },
  { label: 'Black',  value: '000000' },
  { label: 'Red',    value: 'FF3B30' },
  { label: 'Cyan',   value: '00E5FF' },
]
const FONT_FAMILIES = [
  { label: 'Arial',     value: 'Arial' },
  { label: 'Impact',    value: 'Impact' },
  { label: 'Helvetica', value: 'Helvetica' },
  { label: 'Georgia',   value: 'Georgia' },
  { label: 'Trebuchet', value: 'Trebuchet MS' },
]

interface CaptionPreset { name: string; fontFamily: string; fontSize: number; color: string; bold: boolean; outlineWidth: number }
const CAPTION_PRESETS: CaptionPreset[] = [
  { name: 'Clean',   fontFamily: 'Arial',       fontSize: 48, color: 'FFFFFF', bold: true,  outlineWidth: 3 },
  { name: 'Impact',  fontFamily: 'Impact',      fontSize: 56, color: 'FFFF00', bold: true,  outlineWidth: 4 },
  { name: 'Hormozi', fontFamily: 'Impact',      fontSize: 56, color: 'FFFFFF', bold: true,  outlineWidth: 0 },
  { name: 'Neon',    fontFamily: 'Arial',       fontSize: 48, color: '00E5FF', bold: true,  outlineWidth: 2 },
  { name: 'Soft',    fontFamily: 'Helvetica',   fontSize: 40, color: 'FFFFFF', bold: false, outlineWidth: 1 },
  { name: 'Fire',    fontFamily: 'Impact',      fontSize: 52, color: 'FF3B30', bold: true,  outlineWidth: 3 },
  { name: 'Gold',    fontFamily: 'Georgia',     fontSize: 48, color: 'FFD700', bold: true,  outlineWidth: 2 },
  { name: 'Minimal', fontFamily: 'Arial',       fontSize: 36, color: 'FFFFFF', bold: false, outlineWidth: 0 },
]

function StyleControls({ style, onChange }: { style: StyleProps; onChange: (p: Partial<StyleProps>) => void }) {
  const hexToInput = (h: string) => `#${h}`
  const inputToHex = (v: string) => v.replace('#', '').toUpperCase()
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-xs text-zinc-400">Font</label>
        <div className="flex flex-wrap gap-1.5">
          {FONT_FAMILIES.map(f => (
            <button key={f.value} type="button" onClick={() => onChange({ fontFamily: f.value })}
              className={`px-2.5 py-1 rounded-lg text-xs border transition-all ${style.fontFamily === f.value ? 'border-violet-500 bg-violet-600/20 text-violet-300' : 'border-zinc-700 bg-zinc-800/80 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300'}`}
              style={{ fontFamily: f.value }}>{f.label}</button>
          ))}
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-zinc-400">
          <label>Size</label><span className="font-mono">{style.fontSize}px</span>
        </div>
        <input type="range" min={16} max={96} value={style.fontSize}
          onChange={e => onChange({ fontSize: Number(e.target.value) })} className="w-full" aria-label="Font size" />
      </div>
      <div className="flex gap-3 items-end">
        <div className="space-y-1">
          <label className="text-xs text-zinc-400">Bold</label>
          <button type="button" onClick={() => onChange({ bold: !style.bold })}
            className={`w-9 h-7 rounded-lg text-xs border font-bold transition-all ${style.bold ? 'border-violet-500 bg-violet-600/20 text-violet-300' : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-500'}`}>B</button>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-zinc-400">Align</label>
          <div className="flex gap-1">
            <button type="button" title="Center" onClick={() => onChange({ textAlign: 'center' })}
              className={`w-9 h-7 rounded-lg border text-xs transition-all flex items-center justify-center ${style.textAlign === 'center' ? 'border-violet-500 bg-violet-600/20 text-violet-300' : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-500'}`}>
              <svg viewBox="0 0 14 10" className="w-3.5 h-2.5" fill="currentColor">
                <rect x="0" y="0" width="14" height="1.5" rx="0.75"/><rect x="2" y="3" width="10" height="1.5" rx="0.75"/><rect x="0" y="6" width="14" height="1.5" rx="0.75"/><rect x="2" y="9" width="10" height="1.5" rx="0.75"/>
              </svg>
            </button>
            <button type="button" title="Left" onClick={() => onChange({ textAlign: 'left' })}
              className={`w-9 h-7 rounded-lg border text-xs transition-all flex items-center justify-center ${style.textAlign === 'left' ? 'border-violet-500 bg-violet-600/20 text-violet-300' : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-500'}`}>
              <svg viewBox="0 0 14 10" className="w-3.5 h-2.5" fill="currentColor">
                <rect x="0" y="0" width="14" height="1.5" rx="0.75"/><rect x="0" y="3" width="10" height="1.5" rx="0.75"/><rect x="0" y="6" width="14" height="1.5" rx="0.75"/><rect x="0" y="9" width="8" height="1.5" rx="0.75"/>
              </svg>
            </button>
          </div>
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex justify-between text-xs text-zinc-400">
            <label>Outline</label><span className="font-mono">{style.outlineWidth}px</span>
          </div>
          <input type="range" min={0} max={8} value={style.outlineWidth}
            onChange={e => onChange({ outlineWidth: Number(e.target.value) })} className="w-full" aria-label="Outline width" />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs text-zinc-400">Color</label>
        <div className="flex items-center gap-1.5 flex-wrap">
          {PRESET_COLORS.map(p => (
            <button key={p.value} type="button" onClick={() => onChange({ color: p.value })} title={p.label}
              className={`w-6 h-6 rounded-full border-2 flex-shrink-0 transition-all ${style.color === p.value ? 'border-violet-500 scale-110' : 'border-zinc-600 hover:border-zinc-400'}`}
              style={{ backgroundColor: `#${p.value}` }} />
          ))}
          <label className="flex items-center gap-1 text-xs text-zinc-500 cursor-pointer">
            Custom
            <input type="color" value={hexToInput(style.color)} onChange={e => onChange({ color: inputToHex(e.target.value) })}
              className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 p-0" />
          </label>
        </div>
      </div>
    </div>
  )
}

export default function SubtitlesStep(props: SubtitlesStepProps) {
  const {
    clips, activeClipId, onActiveClipChange, activeTab, onTabChange,
    onToggleAuto, onGenerate, onAutoLinesChange,
    autoFontSize, onAutoFontSizeChange, autoColor, onAutoColorChange,
    autoFontFamily, onAutoFontFamilyChange, autoBold, onAutoBoldChange,
    autoOutlineWidth, onAutoOutlineWidthChange, autoTextAlign, onAutoTextAlignChange, autoPosition,
    onToggleCustom, onCustomLinesChange,
    customFontSize, onCustomFontSizeChange, customColor, onCustomColorChange,
    customFontFamily, onCustomFontFamilyChange, customBold, onCustomBoldChange,
    customOutlineWidth, onCustomOutlineWidthChange, customTextAlign, onCustomTextAlignChange, customPosition,
    onToggleCustom2, onCustom2LinesChange,
    custom2FontSize, onCustom2FontSizeChange, custom2Color, onCustom2ColorChange,
    custom2FontFamily, onCustom2FontFamilyChange, custom2Bold, onCustom2BoldChange,
    custom2OutlineWidth, onCustom2OutlineWidthChange, custom2TextAlign, onCustom2TextAlignChange, custom2Position,
    emojiStickers, onAddEmoji, onRemoveEmoji, onEmojiSizeChange,
    disabled,
  } = props

  const activeClip    = clips.find(c => c.id === activeClipId) ?? clips[0] ?? null
  const autoEnabled   = activeClip?.subtitlesEnabled ?? false
  const autoStatus    = activeClip?.subtitleStatus ?? 'idle'
  const autoError     = activeClip?.subtitleError ?? null
  const autoLines     = activeClip?.subtitleLines ?? []
  const customEnabled = activeClip?.customTextEnabled ?? false
  const customLines   = activeClip?.customTextLines ?? []
  const custom2Enabled = activeClip?.custom2TextEnabled ?? false
  const custom2Lines   = activeClip?.custom2TextLines ?? []
  const clipDuration  = activeClip ? (activeClip.endSecs - activeClip.startSecs) : 0

  const [manualText, setManualText] = useState('')
  const [manualText2, setManualText2] = useState('')

  const handleSetCustomLines = () => {
    const rawLines = manualText.split('\n').map(l => l.trim()).filter(Boolean)
    if (rawLines.length === 0) return
    const duration = clipDuration > 0 ? clipDuration : rawLines.length * 3
    const perLine = duration / rawLines.length
    onCustomLinesChange(rawLines.map((text, i) => ({
      id: i + 1,
      start: parseFloat((i * perLine).toFixed(2)),
      end:   parseFloat(((i + 1) * perLine).toFixed(2)),
      text,
    })))
    onToggleCustom(true)
    setManualText('')
  }

  const handleSetCustom2Lines = () => {
    const rawLines = manualText2.split('\n').map(l => l.trim()).filter(Boolean)
    if (rawLines.length === 0) return
    const duration = clipDuration > 0 ? clipDuration : rawLines.length * 3
    const perLine = duration / rawLines.length
    onCustom2LinesChange(rawLines.map((text, i) => ({
      id: i + 1,
      start: parseFloat((i * perLine).toFixed(2)),
      end: parseFloat(((i + 1) * perLine).toFixed(2)),
      text,
    })))
    onToggleCustom2(true)
    setManualText2('')
  }

  if (clips.length === 0) return <p className="text-sm text-zinc-500">Trim at least one clip to add subtitles.</p>

  const autoStyle: StyleProps   = { fontSize: autoFontSize,   color: autoColor,   fontFamily: autoFontFamily,   bold: autoBold,   outlineWidth: autoOutlineWidth,   position: autoPosition,   textAlign: autoTextAlign }
  const customStyle: StyleProps = { fontSize: customFontSize, color: customColor, fontFamily: customFontFamily, bold: customBold, outlineWidth: customOutlineWidth, position: customPosition, textAlign: customTextAlign }
  const custom2Style: StyleProps = { fontSize: custom2FontSize, color: custom2Color, fontFamily: custom2FontFamily, bold: custom2Bold, outlineWidth: custom2OutlineWidth, position: custom2Position, textAlign: custom2TextAlign }

  return (
    <div className={`space-y-4 ${disabled ? 'pointer-events-none opacity-60' : ''}`}>
      {/* Clip selector */}
      {clips.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400">Clip:</span>
          <select value={activeClip?.id ?? ''} onChange={e => onActiveClipChange(e.target.value)}
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500">
            {clips.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex gap-1 bg-zinc-900 rounded-xl p-1 border border-zinc-800">
        <button type="button" onClick={() => onTabChange('auto')}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg text-[10px] font-medium transition-all ${activeTab === 'auto' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>
          <svg className="h-2.5 w-2.5 text-violet-400 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l1.68 5.17L19 9l-5.32 1.83L12 16l-1.68-5.17L5 9l5.32-1.83L12 2z" />
          </svg>
          Auto
        </button>
        <button type="button" onClick={() => onTabChange('custom')}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg text-[10px] font-medium transition-all ${activeTab === 'custom' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>
          Text 1
          {customEnabled && customLines.length > 0 && (
            <span className="text-[9px] bg-zinc-600/30 text-zinc-400 rounded-full px-1">{customLines.length}</span>
          )}
        </button>
        <button type="button" onClick={() => onTabChange('custom2')}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg text-[10px] font-medium transition-all ${activeTab === 'custom2' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>
          Text 2
          {custom2Enabled && custom2Lines.length > 0 && (
            <span className="text-[9px] bg-zinc-600/30 text-zinc-400 rounded-full px-1">{custom2Lines.length}</span>
          )}
        </button>
        <button type="button" onClick={() => onTabChange('emoji')}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg text-[10px] font-medium transition-all ${activeTab === 'emoji' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>
          Stickers
        </button>
      </div>

      {/* ── AUTO TAB ── */}
      {activeTab === 'auto' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => onToggleAuto(!autoEnabled)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${autoEnabled ? 'bg-violet-600' : 'bg-zinc-700'}`}>
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${autoEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
            <span className="text-sm text-zinc-300">{autoEnabled ? 'Enabled' : 'Disabled'}</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium bg-violet-600/20 text-violet-400 border border-violet-600/30 rounded-full px-2 py-0.5">AI · Whisper</span>
              <span className="text-xs text-zinc-500">Transcribes speech — no internet needed</span>
            </div>
            <button type="button" onClick={onGenerate} disabled={autoStatus === 'loading'}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-4 py-2 text-sm transition-colors">
              {autoStatus === 'loading' ? (
                <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>Transcribing...</>
              ) : (
                <><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/></svg>Generate Subtitles</>
              )}
            </button>
          </div>

          {autoError && <div className="bg-red-900/20 border border-red-800/50 rounded-lg px-3 py-2"><p className="text-red-400 text-xs">{autoError}</p></div>}
          {autoStatus === 'done' && autoLines.length === 0 && <p className="text-xs text-zinc-500">No speech detected.</p>}

          {autoLines.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-zinc-400 font-medium">Edit lines ({autoLines.length})</p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {autoLines.map(line => (
                  <div key={line.id} className="flex gap-2 items-start">
                    <span className="text-[10px] text-zinc-600 mt-1.5 font-mono flex-shrink-0 w-8 text-right">
                      {Math.floor(line.start / 60)}:{String(Math.floor(line.start % 60)).padStart(2,'0')}
                    </span>
                    <textarea value={line.text} rows={1}
                      onChange={e => onAutoLinesChange(autoLines.map(l => l.id === line.id ? { ...l, text: e.target.value } : l))}
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-zinc-100 text-xs focus:outline-none focus:ring-1 focus:ring-violet-500 resize-y" />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-zinc-800 pt-3 space-y-3">
            <div>
              <p className="text-xs font-medium text-zinc-400 mb-2">Presets</p>
              <div className="flex flex-wrap gap-1.5">
                {CAPTION_PRESETS.map(p => (
                  <button key={p.name} type="button"
                    onClick={() => {
                      onAutoFontSizeChange(p.fontSize)
                      onAutoColorChange(p.color)
                      onAutoFontFamilyChange(p.fontFamily)
                      onAutoBoldChange(p.bold)
                      onAutoOutlineWidthChange(p.outlineWidth)
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs border border-zinc-700 bg-zinc-800/80 text-zinc-300 hover:border-violet-500/60 hover:bg-violet-600/10 hover:text-violet-300 transition-all"
                    style={{ fontFamily: p.fontFamily, color: `#${p.color}`, WebkitTextStroke: p.outlineWidth > 0 ? `0.5px #000` : undefined }}
                  >{p.name}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-400 mb-3">Style</p>
              <StyleControls style={autoStyle} onChange={patch => {
                if (patch.fontSize !== undefined)     onAutoFontSizeChange(patch.fontSize)
                if (patch.color !== undefined)        onAutoColorChange(patch.color)
                if (patch.fontFamily !== undefined)   onAutoFontFamilyChange(patch.fontFamily)
                if (patch.bold !== undefined)         onAutoBoldChange(patch.bold)
                if (patch.outlineWidth !== undefined) onAutoOutlineWidthChange(patch.outlineWidth)
                if (patch.textAlign !== undefined)    onAutoTextAlignChange(patch.textAlign)
              }} />
            </div>
            <p className="text-xs text-zinc-600">Position: drag the dot in the preview →</p>
            <p className="text-xs font-mono text-zinc-700">{autoPosition.x}% · {autoPosition.y}%</p>
          </div>
        </div>
      )}

      {/* ── CUSTOM TEXT TAB ── */}
      {activeTab === 'custom' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => onToggleCustom(!customEnabled)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${customEnabled ? 'bg-violet-600' : 'bg-zinc-700'}`}>
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${customEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
            <span className="text-sm text-zinc-300">{customEnabled ? 'Enabled' : 'Disabled'}</span>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-zinc-500">One line per subtitle — evenly spaced across the clip.</p>
            <textarea value={manualText} onChange={e => setManualText(e.target.value)} rows={4}
              placeholder={"First line of text\nSecond line\nEach line = one subtitle"}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-y" />
            <button type="button" onClick={handleSetCustomLines} disabled={!manualText.trim()}
              className="px-4 py-1.5 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-100 rounded-lg text-xs font-medium transition-colors">
              Set as subtitles
            </button>
          </div>

          {customLines.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-zinc-400 font-medium">Edit lines ({customLines.length})</p>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {customLines.map(line => (
                  <div key={line.id} className="flex gap-2 items-start bg-zinc-900/50 rounded-lg p-1.5">
                    {/* Editable timestamps */}
                    <div className="flex flex-col gap-0.5 flex-shrink-0">
                      <label className="text-[9px] text-zinc-600 font-mono text-center">in</label>
                      <input
                        type="number" step={0.1} min={0}
                        value={line.start.toFixed(1)}
                        onChange={e => onCustomLinesChange(customLines.map(l => l.id === line.id ? { ...l, start: parseFloat(e.target.value) || 0 } : l))}
                        className="w-12 bg-zinc-800 border border-zinc-700 rounded px-1 py-0.5 text-[10px] text-zinc-300 font-mono focus:outline-none focus:ring-1 focus:ring-violet-500 text-center"
                      />
                      <label className="text-[9px] text-zinc-600 font-mono text-center">out</label>
                      <input
                        type="number" step={0.1} min={0}
                        value={line.end.toFixed(1)}
                        onChange={e => onCustomLinesChange(customLines.map(l => l.id === line.id ? { ...l, end: parseFloat(e.target.value) || 0 } : l))}
                        className="w-12 bg-zinc-800 border border-zinc-700 rounded px-1 py-0.5 text-[10px] text-zinc-300 font-mono focus:outline-none focus:ring-1 focus:ring-violet-500 text-center"
                      />
                    </div>
                    <textarea value={line.text} rows={2}
                      onChange={e => onCustomLinesChange(customLines.map(l => l.id === line.id ? { ...l, text: e.target.value } : l))}
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-zinc-100 text-xs focus:outline-none focus:ring-1 focus:ring-violet-500 resize-y" />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-zinc-800 pt-3">
            <p className="text-xs font-medium text-zinc-400 mb-3">Style</p>
            <StyleControls style={customStyle} onChange={patch => {
              if (patch.fontSize !== undefined)     onCustomFontSizeChange(patch.fontSize)
              if (patch.color !== undefined)        onCustomColorChange(patch.color)
              if (patch.fontFamily !== undefined)   onCustomFontFamilyChange(patch.fontFamily)
              if (patch.bold !== undefined)         onCustomBoldChange(patch.bold)
              if (patch.outlineWidth !== undefined) onCustomOutlineWidthChange(patch.outlineWidth)
              if (patch.textAlign !== undefined)    onCustomTextAlignChange(patch.textAlign)
            }} />
            <p className="text-xs text-zinc-600 mt-3">Position: drag the dot in the preview →</p>
            <p className="text-xs font-mono text-zinc-700">{customPosition.x}% · {customPosition.y}%</p>
          </div>
        </div>
      )}

      {/* ── TEXT 2 TAB ── */}
      {activeTab === 'custom2' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => onToggleCustom2(!custom2Enabled)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${custom2Enabled ? 'bg-violet-600' : 'bg-zinc-700'}`}>
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${custom2Enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
            <span className="text-sm text-zinc-300">{custom2Enabled ? 'Enabled' : 'Disabled'}</span>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-zinc-500">One line per subtitle — evenly spaced across the clip.</p>
            <textarea value={manualText2} onChange={e => setManualText2(e.target.value)} rows={4}
              placeholder={"First line of text\nSecond line\nEach line = one subtitle"}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-y" />
            <button type="button" onClick={handleSetCustom2Lines} disabled={!manualText2.trim()}
              className="px-4 py-1.5 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-100 rounded-lg text-xs font-medium transition-colors">
              Set as subtitles
            </button>
          </div>

          {custom2Lines.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-zinc-400 font-medium">Edit lines ({custom2Lines.length})</p>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {custom2Lines.map(line => (
                  <div key={line.id} className="flex gap-2 items-start bg-zinc-900/50 rounded-lg p-1.5">
                    <div className="flex flex-col gap-0.5 flex-shrink-0">
                      <label className="text-[9px] text-zinc-600 font-mono text-center">in</label>
                      <input type="number" step={0.1} min={0} value={line.start.toFixed(1)}
                        onChange={e => onCustom2LinesChange(custom2Lines.map(l => l.id === line.id ? { ...l, start: parseFloat(e.target.value) || 0 } : l))}
                        className="w-12 bg-zinc-800 border border-zinc-700 rounded px-1 py-0.5 text-[10px] text-zinc-300 font-mono focus:outline-none focus:ring-1 focus:ring-violet-500 text-center" />
                      <label className="text-[9px] text-zinc-600 font-mono text-center">out</label>
                      <input type="number" step={0.1} min={0} value={line.end.toFixed(1)}
                        onChange={e => onCustom2LinesChange(custom2Lines.map(l => l.id === line.id ? { ...l, end: parseFloat(e.target.value) || 0 } : l))}
                        className="w-12 bg-zinc-800 border border-zinc-700 rounded px-1 py-0.5 text-[10px] text-zinc-300 font-mono focus:outline-none focus:ring-1 focus:ring-violet-500 text-center" />
                    </div>
                    <textarea value={line.text} rows={2}
                      onChange={e => onCustom2LinesChange(custom2Lines.map(l => l.id === line.id ? { ...l, text: e.target.value } : l))}
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-zinc-100 text-xs focus:outline-none focus:ring-1 focus:ring-violet-500 resize-y" />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-zinc-800 pt-3">
            <p className="text-xs font-medium text-zinc-400 mb-3">Style</p>
            <StyleControls style={custom2Style} onChange={patch => {
              if (patch.fontSize !== undefined)     onCustom2FontSizeChange(patch.fontSize)
              if (patch.color !== undefined)        onCustom2ColorChange(patch.color)
              if (patch.fontFamily !== undefined)   onCustom2FontFamilyChange(patch.fontFamily)
              if (patch.bold !== undefined)         onCustom2BoldChange(patch.bold)
              if (patch.outlineWidth !== undefined) onCustom2OutlineWidthChange(patch.outlineWidth)
              if (patch.textAlign !== undefined)    onCustom2TextAlignChange(patch.textAlign)
            }} />
            <p className="text-xs text-zinc-600 mt-3">Position: drag the text in the preview → (select Text 2 tab first)</p>
            <p className="text-xs font-mono text-zinc-700">{custom2Position.x}% · {custom2Position.y}%</p>
          </div>
        </div>
      )}

      {/* ── STICKERS TAB ── */}
      {activeTab === 'emoji' && (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium text-zinc-400 mb-2">Tap to add · drag in preview to position</p>
            <div className="flex flex-wrap gap-1.5">
              {['😀','😂','🥰','😍','🤩','😎','🥳','😭','😤','🤔','😮','🤯','🥺','🙏','👍',
                '👎','👋','💪','❤️','🔥','✨','💯','🎉','🚀','⭐','💫','🎯','🏆','💀','👀',
                '😅','🤣','😴','🤗','😬','🥴','🤦','💁','🌈','🎊'].map(e => (
                <button key={e} type="button" onClick={() => onAddEmoji(e)}
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-500 transition-all text-lg">
                  {e}
                </button>
              ))}
            </div>
          </div>

          {emojiStickers.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-zinc-400 font-medium">Added stickers ({emojiStickers.length})</p>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {emojiStickers.map(s => (
                  <div key={s.id} className="flex items-center gap-2 bg-zinc-900/50 rounded-lg p-2">
                    <span className="text-xl w-8 text-center flex-shrink-0">{s.emoji}</span>
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex items-center justify-between text-[10px] text-zinc-500">
                        <span>Size</span>
                        <span className="font-mono">{s.size}%</span>
                      </div>
                      <input type="range" min={2} max={25} step={1} value={s.size}
                        onChange={e => onEmojiSizeChange(s.id, Number(e.target.value))}
                        className="w-full" />
                    </div>
                    <button type="button" onClick={() => onRemoveEmoji(s.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-800 hover:bg-red-900/40 text-zinc-500 hover:text-red-400 transition-colors flex-shrink-0">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {emojiStickers.length === 0 && (
            <p className="text-xs text-zinc-600">No stickers added yet. Tap an emoji above to add it.</p>
          )}
        </div>
      )}
    </div>
  )
}
