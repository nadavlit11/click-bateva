interface Props {
  label: string
  value: string
  onChange: (value: string) => void
  allowClear?: boolean
}

const PRESET_COLORS = [
  '#000000', '#FFFFFF', '#EF4444', '#F97316', '#F59E0B',
  '#22C55E', '#16A34A', '#14B8A6', '#3B82F6', '#6366F1',
  '#8B5CF6', '#EC4899', '#78716C', '#A855F7', '#0EA5E9',
]

export function ColorPickerField({ label, value, onChange, allowClear = true }: Props) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex flex-wrap gap-2 items-center">
        {PRESET_COLORS.map(color => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className="w-7 h-7 rounded-full border-2 cursor-pointer transition-transform hover:scale-110"
            style={{
              backgroundColor: color,
              borderColor: value === color ? '#3B82F6' : '#D1D5DB',
              boxShadow: value === color ? '0 0 0 2px #3B82F6' : 'none',
            }}
          />
        ))}
        {allowClear && value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-xs text-red-500 hover:text-red-700 mr-1"
          >נקה</button>
        )}
      </div>
    </div>
  )
}
