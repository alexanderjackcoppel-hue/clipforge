'use client'
import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface TooltipProps {
  text: string
  children: ReactNode
  position?: 'top' | 'bottom'
  delay?: number
}

export default function Tooltip({ text, children, position = 'top', delay = 350 }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const [coords, setCoords] = useState({ x: 0, y: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = useCallback(() => {
    timerRef.current = setTimeout(() => {
      if (!triggerRef.current) return
      const rect = triggerRef.current.getBoundingClientRect()
      setCoords({
        x: rect.left + rect.width / 2,
        y: position === 'top' ? rect.top - 8 : rect.bottom + 8,
      })
      setVisible(true)
    }, delay)
  }, [delay, position])

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
    setVisible(false)
  }, [])

  // Clamp tooltip to viewport after render
  useEffect(() => {
    if (!visible || !tooltipRef.current) return
    const el = tooltipRef.current
    const rect = el.getBoundingClientRect()
    const pad = 8
    if (rect.left < pad) {
      el.style.left = `${pad}px`
      el.style.transform = position === 'top' ? 'translateY(-100%)' : 'none'
    } else if (rect.right > window.innerWidth - pad) {
      el.style.left = `${window.innerWidth - pad - rect.width}px`
      el.style.transform = position === 'top' ? 'translateY(-100%)' : 'none'
    }
  }, [visible, coords, position])

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className="inline-flex"
      >
        {children}
      </div>
      {visible && createPortal(
        <div
          ref={tooltipRef}
          className="fixed z-[9999] pointer-events-none"
          style={{
            left: coords.x,
            top: coords.y,
            transform: position === 'top'
              ? 'translate(-50%, -100%)'
              : 'translate(-50%, 0)',
          }}
        >
          <div
            className="relative px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-200 whitespace-nowrap"
            style={{
              background: 'rgba(39, 39, 42, 0.95)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
            }}
          >
            {text}
            {/* Arrow */}
            <div
              className="absolute left-1/2 -translate-x-1/2"
              style={{
                [position === 'top' ? 'bottom' : 'top']: -4,
                width: 0,
                height: 0,
                borderLeft: '5px solid transparent',
                borderRight: '5px solid transparent',
                ...(position === 'top'
                  ? { borderTop: '5px solid rgba(39, 39, 42, 0.95)' }
                  : { borderBottom: '5px solid rgba(39, 39, 42, 0.95)' }),
              }}
            />
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
