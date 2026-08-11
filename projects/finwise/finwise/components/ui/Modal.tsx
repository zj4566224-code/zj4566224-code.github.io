'use client'

import { ReactNode, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface ModalProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  width?: number | string
}

export default function Modal({ open, onClose, children, width = 410 }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          aria-modal="true"
          role="dialog"
          initial={{ opacity: 0, pointerEvents: 'none' }}
          animate={{ opacity: 1, pointerEvents: 'auto' }}
          exit={{ opacity: 0, pointerEvents: 'none' }}
          transition={{ duration: 0.16 }}
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.92, pointerEvents: 'none' }}
            animate={{ opacity: 1, y: 0, scale: 1, pointerEvents: 'auto' }}
            exit={{ opacity: 0, y: 14, scale: 0.92, pointerEvents: 'none' }}
            transition={{ duration: 0.22, ease: [0.34, 1.3, 0.64, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="modal-glass"
            style={{
              width,
              maxWidth: 'calc(100vw - 32px)',
              maxHeight: 'calc(100vh - 48px)',
              overflowY: 'auto',
              borderRadius: 26,
              padding: 34,
            }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
