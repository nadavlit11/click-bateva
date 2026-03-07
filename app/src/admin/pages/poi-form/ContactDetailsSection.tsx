import type { FormState, SetField } from './types.ts'

interface Props {
  form: FormState
  set: SetField
  fieldErrors: Set<string>
}

export function ContactDetailsSection({ form, set, fieldErrors }: Props) {
  return (
    <>
      {/* Phone */}
      <div data-field="phone">
        <label className="block text-sm font-medium text-gray-700 mb-1">טלפון</label>
        <input
          type="tel"
          value={form.phone}
          onChange={e => set('phone', e.target.value)}
          className={`w-full border-2 rounded-lg px-3 py-2 text-sm focus:outline-none bg-green-50/30 ${fieldErrors.has('phone') ? 'border-red-500 bg-red-50/30 focus:border-red-500' : 'border-green-200 focus:border-green-500'}`}
          placeholder="03-000-0000"
        />
        {fieldErrors.has('phone') && <p className="text-red-500 text-xs mt-1">מספר טלפון לא תקין</p>}
      </div>

      {/* WhatsApp */}
      <div data-field="whatsapp">
        <label className="block text-sm font-medium text-gray-700 mb-1">וואטסאפ</label>
        <input
          type="tel"
          value={form.whatsapp}
          onChange={e => set('whatsapp', e.target.value)}
          className={`w-full border-2 rounded-lg px-3 py-2 text-sm focus:outline-none bg-green-50/30 ${fieldErrors.has('whatsapp') ? 'border-red-500 bg-red-50/30 focus:border-red-500' : 'border-green-200 focus:border-green-500'}`}
          placeholder="050-000-0000"
        />
        {fieldErrors.has('whatsapp') && <p className="text-red-500 text-xs mt-1">מספר וואטסאפ לא תקין</p>}
      </div>

      {/* Contact name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          שם איש קשר{" "}
          <span className="text-xs text-gray-400 font-normal">(לשימוש פנימי בלבד — לא מוצג למשתמשים)</span>
        </label>
        <input
          type="text"
          value={form.contactName}
          onChange={e => set("contactName", e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
          placeholder="למשל: ישראל ישראלי"
        />
      </div>

      {/* Website */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">אתר</label>
        <input
          type="url"
          value={form.website}
          onChange={e => set('website', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
          placeholder="https://www.example.co.il"
        />
      </div>

      {/* Facebook */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">פייסבוק</label>
        <input
          type="url"
          value={form.facebook}
          onChange={e => set('facebook', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
          placeholder="https://facebook.com/businesspage"
        />
      </div>

      {/* Capacity */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">כמות אנשים מקסימלית</label>
        <input
          type="text"
          value={form.capacity}
          onChange={e => set("capacity", e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
          placeholder="למשל: עד 200 אנשים"
        />
      </div>
    </>
  )
}
