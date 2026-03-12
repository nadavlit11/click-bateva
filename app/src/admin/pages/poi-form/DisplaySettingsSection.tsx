import type { Icon } from '../../types/index.ts'
import { IconPicker } from '../../components/IconPicker.tsx'
import { ColorPickerField } from '../../components/ColorPickerField.tsx'
import type { FormState, SetField } from './types.ts'

interface Props {
  form: FormState
  set: SetField
  icons: Icon[]
}

export function DisplaySettingsSection({ form, set, icons }: Props) {
  return (
    <>
      {/* Icon override */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">אייקון (דריסה)</label>
        <IconPicker icons={icons} value={form.iconId} onChange={v => set('iconId', v)} />
      </div>

      {/* Display overrides */}
      <div className="border border-gray-200 rounded-lg p-4 space-y-3">
        <label className="block text-sm font-semibold text-gray-800 mb-1">
          עקיפות תצוגה (אופציונלי)
        </label>
        <ColorPickerField label="צבע" value={form.color} onChange={v => set('color', v)} />
        <ColorPickerField label="צבע מסגרת" value={form.borderColor} onChange={v => set('borderColor', v)} />
        <div className="flex items-center gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">גודל סמן</label>
            <input
              type="number"
              value={form.markerSize}
              onChange={e => set('markerSize', e.target.value)}
              className="w-24 bg-white border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-green-500"
              placeholder="ברירת מחדל"
              min="8"
              max="128"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">גודל אייקון (%)</label>
            <input
              type="number"
              value={form.iconSize}
              onChange={e => set('iconSize', e.target.value)}
              className="w-24 bg-white border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-green-500"
              placeholder="50%"
              min="10"
              max="100"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer mt-4">
            <input
              type="checkbox"
              checked={form.flicker}
              onChange={e => set('flicker', e.target.checked)}
              className="accent-green-600 w-4 h-4"
            />
            <span className="text-sm text-gray-700">הבהוב</span>
          </label>
        </div>
      </div>

      {/* Active toggles */}
      <div className="border border-gray-200 rounded-lg p-4 space-y-3">
        <label className="block text-sm font-semibold text-gray-800 mb-1">הגדרות תצוגה</label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.active}
            onChange={e => set('active', e.target.checked)}
            className="accent-green-600 w-4 h-4"
          />
          <span className="text-sm font-medium text-gray-700">נקודה פעילה</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isHomeMap}
            onChange={e => set('isHomeMap', e.target.checked)}
            className="accent-amber-600 w-4 h-4"
          />
          <span className="text-sm font-medium text-gray-700">הצג במפת הבית</span>
        </label>
        {form.mapType === 'default' && (
          <>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.agentsActive}
                onChange={e => set('agentsActive', e.target.checked)}
                className="accent-blue-600 w-4 h-4"
              />
              <span className="text-sm font-medium text-gray-700">פעיל במפת סוכנים</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.groupsActive}
                onChange={e => set('groupsActive', e.target.checked)}
                className="accent-purple-600 w-4 h-4"
              />
              <span className="text-sm font-medium text-gray-700">פעיל במפת קבוצות</span>
            </label>
          </>
        )}
      </div>
    </>
  )
}
