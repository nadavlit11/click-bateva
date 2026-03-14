import { useState } from 'react'
import { Modal } from '../../components/Modal.tsx'

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

  return (
    <Modal open={isOpen} onClose={onClose} title={title} disableClose={loading}>
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
    </Modal>
  )
}
