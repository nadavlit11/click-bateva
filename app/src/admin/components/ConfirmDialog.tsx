import { useState } from 'react'

interface Props {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  title: string
  message: string
  confirmLabel?: string
}

export function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'מחיקה' }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    setLoading(true)
    try {
      await onConfirm()
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={loading ? undefined : onClose} />

      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          {!loading && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
              ✕
            </button>
          )}
        </div>

        <div className="px-5 py-4 space-y-4">
          <p className="text-sm text-gray-600">{message}</p>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="px-5 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'מוחק...' : confirmLabel}
            </button>
            <button
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              ביטול
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
