import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Info } from 'lucide-react'

const ToastContext = createContext(() => {})

/** Call const toast = useToast(); toast('Saved!') to show a short message. */
export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const nextId = useRef(0)

  const push = useCallback((message, type = 'success') => {
    const id = nextId.current++
    setItems((list) => [...list.slice(-2), { id, message, type }])
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 2600)
  }, [])

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-5 z-[100] flex flex-col items-center gap-2 px-4"
        role="status"
        aria-live="polite"
      >
        <AnimatePresence>
          {items.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8 }}
              className="glass pointer-events-auto flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm shadow-glow"
            >
              {t.type === 'success' ? (
                <Check size={16} className="text-success" />
              ) : (
                <Info size={16} className="text-cyan" />
              )}
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
