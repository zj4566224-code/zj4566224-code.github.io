'use client'

import { useRef, useEffect } from 'react'

interface GlowOverlayProps {
  radius?: number
  intensity?: number
}

export default function GlowOverlay({ radius = 260, intensity = 0.07 }: GlowOverlayProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    const parent = el?.parentElement
    if (!el || !parent) return

    let pending = false
    let nextX = 0
    let nextY = 0

    const flush = () => {
      pending = false
      el.style.background = `radial-gradient(${radius}px circle at ${nextX}px ${nextY}px, rgb(var(--glow-rgb) / ${intensity}) 0%, transparent 70%)`
    }

    const handleMove = (e: globalThis.MouseEvent) => {
      const rect = parent.getBoundingClientRect()
      nextX = e.clientX - rect.left
      nextY = e.clientY - rect.top
      if (!pending) {
        pending = true
        requestAnimationFrame(flush)
      }
    }
    const handleLeave = () => {
      el.style.background = ''
    }

    parent.addEventListener('mousemove', handleMove)
    parent.addEventListener('mouseleave', handleLeave)
    return () => {
      parent.removeEventListener('mousemove', handleMove)
      parent.removeEventListener('mouseleave', handleLeave)
    }
  }, [radius, intensity])

  return (
    <div
      ref={ref}
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
      }}
    />
  )
}
