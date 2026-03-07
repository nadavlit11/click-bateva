import type { DayHours } from '../../../types/index.ts'
import type { FormState } from './types.ts'
import { DAY_KEYS, DAY_NAMES_HE, DEFAULT_HOURS, EMPTY_HOURS } from './types.ts'

interface Props {
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
}

export function OpeningHoursSection({ form, setForm }: Props) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">שעות פתיחה</label>
      <div className="flex gap-4 mb-2">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="radio"
            name="hoursMode"
            checked={form.openingHours !== 'by_appointment'}
            onChange={() => setForm(prev => ({ ...prev, openingHours: { ...EMPTY_HOURS } }))}
            className="accent-green-600"
          />
          <span className="text-sm text-gray-700">שעות קבועות</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="radio"
            name="hoursMode"
            checked={form.openingHours === 'by_appointment'}
            onChange={() => setForm(prev => ({ ...prev, openingHours: 'by_appointment' }))}
            className="accent-green-600"
          />
          <span className="text-sm text-gray-700">בתיאום מראש</span>
        </label>
      </div>
      {form.openingHours !== 'by_appointment' && (
        <div className="space-y-2">
          {DAY_KEYS.map(day => {
            const hours = (form.openingHours as Record<string, DayHours | null>)[day]
            const isOpen = hours !== null
            return (
              <div key={day} className="flex items-center gap-2">
                <span className="text-sm text-gray-700 w-14 shrink-0">{DAY_NAMES_HE[day]}</span>
                <label className="flex items-center gap-1 cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={isOpen}
                    onChange={() =>
                      setForm(prev => ({
                        ...prev,
                        openingHours: {
                          ...(prev.openingHours as Record<string, DayHours | null>),
                          [day]: isOpen ? null : { ...DEFAULT_HOURS },
                        },
                      }))
                    }
                    className="accent-green-600"
                  />
                  <span className="text-xs text-gray-500">{isOpen ? 'פתוח' : 'סגור'}</span>
                </label>
                {isOpen && (
                  <div className="flex items-center gap-1 flex-1" dir="ltr">
                    <input
                      type="time"
                      value={hours.open}
                      onChange={e =>
                        setForm(prev => ({
                          ...prev,
                          openingHours: {
                            ...(prev.openingHours as Record<string, DayHours | null>),
                            [day]: {
                              ...(prev.openingHours as Record<string, DayHours | null>)[day]!,
                              open: e.target.value,
                            },
                          },
                        }))
                      }
                      className="border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                    <span className="text-gray-400">–</span>
                    <input
                      type="time"
                      value={hours.close}
                      onChange={e =>
                        setForm(prev => ({
                          ...prev,
                          openingHours: {
                            ...(prev.openingHours as Record<string, DayHours | null>),
                            [day]: {
                              ...(prev.openingHours as Record<string, DayHours | null>)[day]!,
                              close: e.target.value,
                            },
                          },
                        }))
                      }
                      className="border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
