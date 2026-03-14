import { useState, useRef } from 'react'
import { Modal } from '../../components/Modal.tsx'

interface Props {
  label: string
  value: string
  onChange: (value: string) => void
  allowClear?: boolean
}

const PRESET_COLORS = [
  // Grays
  '#000000', '#1F2937', '#374151', '#6B7280',
  '#9CA3AF', '#D1D5DB', '#E5E7EB', '#FFFFFF',
  // Reds
  '#7F1D1D', '#991B1B', '#DC2626', '#EF4444',
  '#F87171', '#FCA5A5', '#FECACA', '#FEE2E2',
  // Oranges
  '#9A3412', '#EA580C', '#F97316', '#FB923C',
  '#FDBA74', '#FED7AA', '#FFEDD5', '#FFF7ED',
  // Yellows
  '#854D0E', '#CA8A04', '#EAB308', '#FACC15',
  '#FDE047', '#FEF08A', '#FBBF24', '#FFFF00',
  // Greens
  '#14532D', '#166534', '#16A34A', '#22C55E',
  '#4ADE80', '#86EFAC', '#84CC16', '#059669',
  // Teals & Cyans
  '#065F46', '#0D9488', '#14B8A6', '#2DD4BF',
  '#06B6D4', '#22D3EE', '#67E8F9', '#A5F3FC',
  // Blues
  '#1E3A5F', '#1E40AF', '#2563EB', '#3B82F6',
  '#60A5FA', '#93C5FD', '#0EA5E9', '#0284C7',
  // Purples
  '#3B0764', '#6D28D9', '#7C3AED', '#8B5CF6',
  '#A855F7', '#C084FC', '#4F46E5', '#6366F1',
  // Pinks
  '#831843', '#BE185D', '#EC4899', '#F472B6',
  '#D946EF', '#F0ABFC', '#F43F5E', '#FB7185',
]

export function ColorPickerField(
  { label, value, onChange, allowClear = true }: Props,
) {
  const [open, setOpen] = useState(false)
  const colorInputRef = useRef<HTMLInputElement>(null)
  const isCustom = value && !PRESET_COLORS.includes(value)

  const handleSelect = (color: string) => {
    onChange(color)
    setOpen(false)
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-8 h-8 rounded-full border-2 border-gray-300
            cursor-pointer transition-transform hover:scale-110"
          style={value
            ? { backgroundColor: value }
            : {
              background:
                'conic-gradient(red,yellow,lime,aqua,blue,magenta,red)',
              border: '2px dashed #9CA3AF',
            }}
        />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sm text-blue-600 hover:text-blue-800
            cursor-pointer"
        >
          בחר צבע
        </button>
        {allowClear && value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-xs text-red-500 hover:text-red-700 ms-1"
          >
            נקה
          </button>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={label}>
            <div className="px-5 py-4 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-8 gap-2">
                {PRESET_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handleSelect(color)}
                    className="w-8 h-8 rounded-full border-2
                      cursor-pointer transition-transform
                      hover:scale-110"
                    style={{
                      backgroundColor: color,
                      borderColor: value === color
                        ? '#3B82F6' : '#D1D5DB',
                      boxShadow: value === color
                        ? '0 0 0 2px #3B82F6' : 'none',
                    }}
                  />
                ))}
              </div>

              <div className="border-t border-gray-200 pt-3">
                <label className="block text-sm font-medium
                  text-gray-700 mb-2"
                >
                  צבע מותאם אישית
                </label>
                <div className="flex items-center gap-3">
                  <input
                    ref={colorInputRef}
                    type="color"
                    value={value || '#000000'}
                    onChange={e => onChange(e.target.value)}
                    className="sr-only"
                  />
                  <button
                    type="button"
                    onClick={() => colorInputRef.current?.click()}
                    className="w-8 h-8 rounded-full border-2
                      cursor-pointer transition-transform
                      hover:scale-110"
                    style={isCustom
                      ? {
                        backgroundColor: value,
                        borderColor: '#3B82F6',
                        boxShadow: '0 0 0 2px #3B82F6',
                      }
                      : {
                        background:
                          'conic-gradient(red,yellow,lime,aqua,blue,magenta,red)',
                        borderColor: '#D1D5DB',
                      }}
                  />
                  {isCustom && (
                    <span className="text-sm text-gray-600
                      font-mono"
                    >
                      {value}
                    </span>
                  )}
                </div>
              </div>
            </div>
      </Modal>
    </div>
  )
}
