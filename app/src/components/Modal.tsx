import type { ReactNode } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  maxWidth?: 'sm' | 'md' | 'lg'
  children: ReactNode
  /** Hide the close button and disable backdrop click (e.g. during loading) */
  disableClose?: boolean
}

type MaxWidth = NonNullable<Props['maxWidth']>

const MAX_W: Record<MaxWidth, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
}

export function Modal({
  open, onClose, title, maxWidth = 'sm', children, disableClose,
}: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={disableClose ? undefined : onClose}
      />

      <div className={`relative bg-white rounded-xl shadow-2xl w-full ${MAX_W[maxWidth]} mx-4 max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          {!disableClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            >
              ✕
            </button>
          )}
        </div>

        {children}
      </div>
    </div>
  )
}
