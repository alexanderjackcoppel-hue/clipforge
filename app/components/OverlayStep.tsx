'use client'
import { useRef } from 'react'

type WatermarkPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'custom'

interface OverlayStepProps {
  enabled: boolean
  onToggle: (v: boolean) => void
  overlayFile: File | null
  onOverlayFile: (f: File | null) => void
  previewUrl: string | null
  overlayX: number
  overlayY: number
  onPositionChange: (x: number, y: number) => void
  overlayScale: number
  onScaleChange: (v: number) => void
  overlayRotation: number
  onRotationChange: (v: number) => void
  // Watermark 1
  watermarkEnabled: boolean
  onWatermarkToggle: (v: boolean) => void
  watermarkMode: 'image' | 'text'
  onWatermarkModeChange: (m: 'image' | 'text') => void
  watermarkFile: File | null
  onWatermarkFile: (f: File | null) => void
  watermarkPreviewUrl: string | null
  watermarkText: string
  onWatermarkTextChange: (t: string) => void
  watermarkTextColor: string
  onWatermarkTextColorChange: (c: string) => void
  watermarkTextWeight: number
  onWatermarkTextWeightChange: (w: number) => void
  watermarkPosition: WatermarkPosition
  onWatermarkPositionChange: (pos: WatermarkPosition) => void
  watermarkCustomX: number
  watermarkCustomY: number
  onWatermarkCustomPositionChange: (x: number, y: number) => void
  watermarkScale: number
  onWatermarkScaleChange: (v: number) => void
  watermarkOpacity: number
  onWatermarkOpacityChange: (v: number) => void
  watermarkStroke: number
  onWatermarkStrokeChange: (v: number) => void
  watermarkStrokeColor: string
  onWatermarkStrokeColorChange: (v: string) => void
  // Watermark 2
  watermark2Enabled: boolean
  onWatermark2Toggle: (v: boolean) => void
  watermark2File: File | null
  onWatermark2File: (f: File | null) => void
  watermark2PreviewUrl: string | null
  watermark2Position: WatermarkPosition
  onWatermark2PositionChange: (pos: WatermarkPosition) => void
  watermark2Scale: number
  onWatermark2ScaleChange: (v: number) => void
  watermark2Opacity: number
  onWatermark2OpacityChange: (v: number) => void
  watermark2Stroke: number
  onWatermark2StrokeChange: (v: number) => void
  watermark2StrokeColor: string
  onWatermark2StrokeColorChange: (v: string) => void
  disabled: boolean
}

const WATERMARK_POSITIONS: { value: WatermarkPosition; label: string; icon: string }[] = [
  { value: 'top-left', label: 'Top Left', icon: '◤' },
  { value: 'top-right', label: 'Top Right', icon: '◥' },
  { value: 'bottom-left', label: 'Bottom Left', icon: '◣' },
  { value: 'bottom-right', label: 'Bottom Right', icon: '◢' },
  { value: 'center', label: 'Center', icon: '◇' },
]

export default function OverlayStep({
  enabled,
  onToggle,
  overlayFile,
  onOverlayFile,
  previewUrl,
  overlayX,
  overlayY,
  onPositionChange,
  overlayScale,
  onScaleChange,
  overlayRotation,
  onRotationChange,
  watermarkEnabled, onWatermarkToggle,
  watermarkMode, onWatermarkModeChange,
  watermarkFile, onWatermarkFile, watermarkPreviewUrl,
  watermarkText, onWatermarkTextChange,
  watermarkTextColor, onWatermarkTextColorChange,
  watermarkTextWeight, onWatermarkTextWeightChange,
  watermarkPosition, onWatermarkPositionChange,
  watermarkCustomX, watermarkCustomY, onWatermarkCustomPositionChange,
  watermarkScale, onWatermarkScaleChange,
  watermarkOpacity, onWatermarkOpacityChange,
  watermarkStroke, onWatermarkStrokeChange,
  watermarkStrokeColor, onWatermarkStrokeColorChange,
  watermark2Enabled, onWatermark2Toggle,
  watermark2File, onWatermark2File, watermark2PreviewUrl,
  watermark2Position, onWatermark2PositionChange,
  watermark2Scale, onWatermark2ScaleChange,
  watermark2Opacity, onWatermark2OpacityChange,
  watermark2Stroke, onWatermark2StrokeChange,
  watermark2StrokeColor, onWatermark2StrokeColorChange,
  disabled,
}: OverlayStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const wmFileInputRef = useRef<HTMLInputElement>(null)
  const wm2FileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    onOverlayFile(f)
  }

  return (
    <div className={`space-y-4 ${disabled ? 'pointer-events-none' : ''}`}>
      <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Overlay</p>
      {/* Toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onToggle(!enabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-zinc-900 ${
            enabled ? 'bg-violet-600' : 'bg-surface-3'
          }`}
          aria-pressed={enabled}
          aria-label={enabled ? 'Overlay on' : 'Overlay off'}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span className="text-sm text-zinc-300">{enabled ? 'Overlay on' : 'Overlay off'}</span>
      </div>

      {enabled && (
        <div className="space-y-5">
          {/* File upload */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">Image File</label>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 bg-surface-2 hover:bg-surface-3 border border-border text-zinc-300 rounded-lg px-4 py-2.5 text-sm transition-colors duration-150"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Choose Image
              </button>
              <span className="text-sm text-zinc-400 truncate max-w-xs">
                {overlayFile ? overlayFile.name : 'No file chosen'}
              </span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
            <p className="text-xs text-zinc-600">Supported: PNG, JPEG, WebP (max 100MB)</p>
          </div>

          {/* Position hint — drag directly in the preview */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-600">Drag in the preview to reposition</p>
            <button
              type="button"
              onClick={() => onPositionChange(50, 50)}
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Reset to center
            </button>
          </div>

          {/* Size slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm text-zinc-300">
              <label>Size</label>
              <span className="text-zinc-400 font-mono">{overlayScale}%</span>
            </div>
            <input
              type="range"
              min={5}
              max={100}
              value={overlayScale}
              onChange={e => onScaleChange(Number(e.target.value))}
              className="w-full"
              aria-label="Overlay size"
            />
            <div className="flex justify-between text-xs text-zinc-600">
              <span>5%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Rotation slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm text-zinc-300">
              <label>Rotation</label>
              <span className="text-zinc-400">{overlayRotation}°</span>
            </div>
            <input
              type="range"
              min={0}
              max={359}
              value={overlayRotation}
              onChange={e => onRotationChange(Number(e.target.value))}
              className="w-full"
              aria-label="Overlay rotation"
            />
            <div className="flex justify-between text-xs text-zinc-600">
              <span>0°</span>
              <span>359°</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Watermark section ── */}
      <div className="border-t border-border pt-4 mt-2">
        <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">Watermark</p>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onWatermarkToggle(!watermarkEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-zinc-900 ${
              watermarkEnabled ? 'bg-violet-600' : 'bg-surface-3'
            }`}
            aria-pressed={watermarkEnabled}
            aria-label={watermarkEnabled ? 'Watermark on' : 'Watermark off'}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                watermarkEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className="text-sm text-zinc-300">{watermarkEnabled ? 'Watermark on' : 'Watermark off'}</span>
        </div>

        {watermarkEnabled && (
          <div className="space-y-4 mt-4">
            {/* Mode toggle: Text / Image */}
            <div className="flex gap-0.5 bg-surface-2 rounded-lg p-[3px] border border-border">
              <button type="button" onClick={() => onWatermarkModeChange('text')}
                className={`flex-1 py-1.5 rounded-md text-[11px] font-medium text-center transition-all ${watermarkMode === 'text' ? 'bg-violet-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>
                Text
              </button>
              <button type="button" onClick={() => onWatermarkModeChange('image')}
                className={`flex-1 py-1.5 rounded-md text-[11px] font-medium text-center transition-all ${watermarkMode === 'image' ? 'bg-violet-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>
                Image
              </button>
            </div>

            {watermarkMode === 'text' ? (
              <div className="space-y-3">
                {/* Text input */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-400">Text</label>
                  <input type="text" value={watermarkText} onChange={e => onWatermarkTextChange(e.target.value)}
                    placeholder="@YourHandle"
                    className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-violet-500 input-shadow" />
                </div>

                {/* Color presets + picker */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-400">Color</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {[
                      { label: 'White', hex: 'FFFFFF' },
                      { label: 'Light', hex: 'CCCCCC' },
                      { label: 'Gray', hex: '888888' },
                      { label: 'Black', hex: '000000' },
                      { label: 'Violet', hex: '7C3AED' },
                      { label: 'Red', hex: 'EF4444' },
                      { label: 'Blue', hex: '3B82F6' },
                      { label: 'Green', hex: '22C55E' },
                      { label: 'Gold', hex: 'EAB308' },
                    ].map(c => (
                      <button key={c.hex} type="button" onClick={() => onWatermarkTextColorChange(c.hex)}
                        title={c.label}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${
                          watermarkTextColor.toUpperCase() === c.hex ? 'border-violet-400 scale-110' : 'border-border hover:border-bright'
                        }`}
                        style={{ backgroundColor: `#${c.hex}` }} />
                    ))}
                    <input type="color" value={`#${watermarkTextColor}`}
                      onChange={e => onWatermarkTextColorChange(e.target.value.replace('#', ''))}
                      className="w-6 h-6 rounded border border-border cursor-pointer bg-transparent" title="Custom color" />
                  </div>
                </div>

                {/* Weight / thickness slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm text-zinc-300">
                    <label>Thickness</label>
                    <span className="text-zinc-400 font-mono">
                      {watermarkTextWeight <= 100 ? 'Thin' : watermarkTextWeight <= 300 ? 'Light' : watermarkTextWeight <= 400 ? 'Regular' : watermarkTextWeight <= 500 ? 'Medium' : watermarkTextWeight <= 700 ? 'Bold' : 'Black'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={100}
                    max={900}
                    step={100}
                    value={watermarkTextWeight}
                    onChange={e => onWatermarkTextWeightChange(Number(e.target.value))}
                    className="w-full"
                    aria-label="Text thickness"
                  />
                  <div className="flex justify-between text-xs text-zinc-600">
                    <span>Thin</span>
                    <span>Black</span>
                  </div>
                </div>

                {/* Preview */}
                <div className="relative w-full h-16 bg-surface-1 rounded-lg border border-border/50 overflow-hidden flex items-center justify-center">
                  <span style={{
                    fontFamily: "'Trebuchet MS', 'DejaVu Sans', var(--font-ui), sans-serif",
                    fontWeight: watermarkTextWeight,
                    color: `#${watermarkTextColor}`,
                    opacity: watermarkOpacity,
                    fontSize: '16px',
                    letterSpacing: '0.02em',
                    ...(watermarkStroke > 0 ? {
                      textShadow: `0 0 ${watermarkStroke}px #${watermarkStrokeColor}, 0 0 ${watermarkStroke}px #${watermarkStrokeColor}`,
                    } : {}),
                  }}>
                    {watermarkText || '@YourHandle'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Image upload */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">Logo / Image</label>
                  <div className="flex items-center gap-3 flex-wrap">
                    <button type="button" onClick={() => wmFileInputRef.current?.click()}
                      className="flex items-center gap-2 bg-surface-2 hover:bg-surface-3 border border-border text-zinc-300 rounded-lg px-4 py-2.5 text-sm transition-colors duration-150">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Choose Image
                    </button>
                    <span className="text-sm text-zinc-400 truncate max-w-xs">{watermarkFile ? watermarkFile.name : 'No file chosen'}</span>
                  </div>
                  <input ref={wmFileInputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={e => onWatermarkFile(e.target.files?.[0] ?? null)} className="hidden" />
                </div>

                {watermarkPreviewUrl && (
                  <div className="relative w-[108px] h-[192px] bg-surface-1 rounded-lg border border-border/50 overflow-hidden flex-shrink-0">
                    <img src={watermarkPreviewUrl} alt="watermark preview" draggable={false}
                      className="absolute object-contain"
                      style={{
                        width: `${watermarkScale}%`, opacity: watermarkOpacity,
                        ...(watermarkStroke > 0 ? { filter: `drop-shadow(0 0 ${watermarkStroke}px #${watermarkStrokeColor})` } : {}),
                        ...(watermarkPosition === 'top-left' && { top: '3%', left: '3%' }),
                        ...(watermarkPosition === 'top-right' && { top: '3%', right: '3%' }),
                        ...(watermarkPosition === 'bottom-left' && { bottom: '3%', left: '3%' }),
                        ...(watermarkPosition === 'bottom-right' && { bottom: '3%', right: '3%' }),
                        ...(watermarkPosition === 'center' && { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }),
                      }} />
                  </div>
                )}
              </div>
            )}

            {/* Position selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-zinc-400">Position</label>
                {watermarkPosition === 'custom' && (
                  <span className="text-[10px] text-zinc-500 font-mono">{Math.round(watermarkCustomX)}%, {Math.round(watermarkCustomY)}%</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {WATERMARK_POSITIONS.map(p => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => onWatermarkPositionChange(p.value)}
                    className={`text-xs px-2.5 py-1.5 rounded-md border transition-all ${
                      watermarkPosition === p.value
                        ? 'border-violet-500 bg-violet-600/20 text-violet-300'
                        : 'border-border bg-surface-2 text-zinc-400 hover:border-bright hover:text-zinc-200'
                    }`}
                  >
                    <span className="mr-1">{p.icon}</span>{p.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => onWatermarkPositionChange('custom')}
                  className={`text-xs px-2.5 py-1.5 rounded-md border transition-all ${
                    watermarkPosition === 'custom'
                      ? 'border-violet-500 bg-violet-600/20 text-violet-300'
                      : 'border-border bg-surface-2 text-zinc-400 hover:border-bright hover:text-zinc-200'
                  }`}
                >
                  <span className="mr-1">✥</span>Custom
                </button>
              </div>
              {watermarkPosition === 'custom' && (
                <p className="text-[11px] text-zinc-500">Drag the watermark in the preview to reposition</p>
              )}
            </div>

            {/* Size slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm text-zinc-300">
                <label>Size</label>
                <span className="text-zinc-400 font-mono">{watermarkScale}%</span>
              </div>
              <input
                type="range"
                min={3}
                max={50}
                value={watermarkScale}
                onChange={e => onWatermarkScaleChange(Number(e.target.value))}
                className="w-full"
                aria-label="Watermark size"
              />
              <div className="flex justify-between text-xs text-zinc-600">
                <span>3%</span>
                <span>50%</span>
              </div>
            </div>

            {/* Opacity slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm text-zinc-300">
                <label>Opacity</label>
                <span className="text-zinc-400 font-mono">{Math.round(watermarkOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                value={Math.round(watermarkOpacity * 100)}
                onChange={e => onWatermarkOpacityChange(Number(e.target.value) / 100)}
                className="w-full"
                aria-label="Watermark opacity"
              />
              <div className="flex justify-between text-xs text-zinc-600">
                <span>10%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Stroke/outline thickness + color */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm text-zinc-300">
                <label>Outline</label>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400 font-mono">{watermarkStroke}px</span>
                  {watermarkStroke > 0 && (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={`#${watermarkStrokeColor}`}
                        onChange={e => onWatermarkStrokeColorChange(e.target.value.replace('#', ''))}
                        className="w-5 h-5 rounded border border-border cursor-pointer bg-transparent"
                        aria-label="Outline color"
                      />
                    </div>
                  )}
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                value={watermarkStroke}
                onChange={e => onWatermarkStrokeChange(Number(e.target.value))}
                className="w-full"
                aria-label="Watermark outline thickness"
              />
              <div className="flex justify-between text-xs text-zinc-600">
                <span>None</span>
                <span>10px</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Watermark 2 section ── */}
      <div className="border-t border-border pt-4 mt-2">
        <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">Watermark 2</p>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onWatermark2Toggle(!watermark2Enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-zinc-900 ${
              watermark2Enabled ? 'bg-violet-600' : 'bg-surface-3'
            }`}
            aria-pressed={watermark2Enabled}
            aria-label={watermark2Enabled ? 'Watermark 2 on' : 'Watermark 2 off'}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${watermark2Enabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
          <span className="text-sm text-zinc-300">{watermark2Enabled ? 'Watermark 2 on' : 'Watermark 2 off'}</span>
        </div>

        {watermark2Enabled && (
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Logo / Image</label>
              <div className="flex items-center gap-3 flex-wrap">
                <button type="button" onClick={() => wm2FileInputRef.current?.click()}
                  className="flex items-center gap-2 bg-surface-2 hover:bg-surface-3 border border-border text-zinc-300 rounded-lg px-4 py-2.5 text-sm transition-colors duration-150">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Choose Image
                </button>
                <span className="text-sm text-zinc-400 truncate max-w-xs">{watermark2File ? watermark2File.name : 'No file chosen'}</span>
              </div>
              <input ref={wm2FileInputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={e => onWatermark2File(e.target.files?.[0] ?? null)} className="hidden" />
            </div>

            {watermark2PreviewUrl && (
              <div className="flex items-center gap-3">
                <div className="relative w-[108px] h-[192px] bg-surface-1 rounded-lg border border-border/50 overflow-hidden flex-shrink-0">
                  <img src={watermark2PreviewUrl} alt="watermark 2 preview" draggable={false}
                    className="absolute object-contain"
                    style={{
                      width: `${watermark2Scale}%`, opacity: watermark2Opacity,
                      ...(watermark2Stroke > 0 ? { filter: `drop-shadow(0 0 ${watermark2Stroke}px #${watermark2StrokeColor})` } : {}),
                      ...(watermark2Position === 'top-left' && { top: '3%', left: '3%' }),
                      ...(watermark2Position === 'top-right' && { top: '3%', right: '3%' }),
                      ...(watermark2Position === 'bottom-left' && { bottom: '3%', left: '3%' }),
                      ...(watermark2Position === 'bottom-right' && { bottom: '3%', right: '3%' }),
                      ...(watermark2Position === 'center' && { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }),
                    }} />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Position</label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {WATERMARK_POSITIONS.map(p => (
                  <button key={p.value} type="button" onClick={() => onWatermark2PositionChange(p.value)}
                    className={`text-xs px-2.5 py-1.5 rounded-md border transition-all ${
                      watermark2Position === p.value
                        ? 'border-violet-500 bg-violet-600/20 text-violet-300'
                        : 'border-border bg-surface-2 text-zinc-400 hover:border-bright hover:text-zinc-200'
                    }`}>
                    <span className="mr-1">{p.icon}</span>{p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-sm text-zinc-300"><label>Size</label><span className="text-zinc-400 font-mono">{watermark2Scale}%</span></div>
              <input type="range" min={3} max={50} value={watermark2Scale} onChange={e => onWatermark2ScaleChange(Number(e.target.value))} className="w-full" aria-label="Watermark 2 size" />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm text-zinc-300"><label>Opacity</label><span className="text-zinc-400 font-mono">{Math.round(watermark2Opacity * 100)}%</span></div>
              <input type="range" min={10} max={100} value={Math.round(watermark2Opacity * 100)} onChange={e => onWatermark2OpacityChange(Number(e.target.value) / 100)} className="w-full" aria-label="Watermark 2 opacity" />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm text-zinc-300">
                <label>Outline</label>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400 font-mono">{watermark2Stroke}px</span>
                  {watermark2Stroke > 0 && (
                    <input type="color" value={`#${watermark2StrokeColor}`}
                      onChange={e => onWatermark2StrokeColorChange(e.target.value.replace('#', ''))}
                      className="w-5 h-5 rounded border border-border cursor-pointer bg-transparent" aria-label="Outline color" />
                  )}
                </div>
              </div>
              <input type="range" min={0} max={10} value={watermark2Stroke} onChange={e => onWatermark2StrokeChange(Number(e.target.value))} className="w-full" aria-label="Watermark 2 outline" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
