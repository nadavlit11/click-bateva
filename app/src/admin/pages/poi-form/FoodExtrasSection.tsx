import type { SetField } from './types.ts'
import { uploadFile } from './utils.ts'

interface Props {
  kashrutCertUrl: string
  menuUrl: string
  set: SetField
  setError: (msg: string) => void
}

function ImageUploadField({ label, url, fieldName, set, setError }: {
  label: string
  url: string
  fieldName: 'kashrutCertUrl' | 'menuUrl'
  set: SetField
  setError: (msg: string) => void
}) {
  const errorMsg = fieldName === 'kashrutCertUrl' ? 'שגיאה בהעלאת תעודת כשרות' : 'שגיאה בהעלאת תפריט'

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const downloadUrl = await uploadFile(file)
      set(fieldName, downloadUrl)
    } catch {
      setError(errorMsg)
    }
    e.target.value = ''
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {url ? (
        <div className="space-y-2">
          <img src={url} alt={label} className="w-full max-h-40 object-cover rounded-lg border border-gray-200" loading="lazy" decoding="async" />
          <div className="flex gap-3">
            <label className="text-blue-600 hover:text-blue-800 text-sm font-medium cursor-pointer">
              שנה
              <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            </label>
            <button type="button" onClick={() => set(fieldName, '')} className="text-red-500 hover:text-red-700 text-sm font-medium">הסר</button>
          </div>
        </div>
      ) : (
        <label className="inline-block px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors">
          בחר תמונה
          <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        </label>
      )}
    </div>
  )
}

export function FoodExtrasSection({ kashrutCertUrl, menuUrl, set, setError }: Props) {
  return (
    <>
      <ImageUploadField label="תעודת כשרות" url={kashrutCertUrl} fieldName="kashrutCertUrl" set={set} setError={setError} />
      <ImageUploadField label="תפריט" url={menuUrl} fieldName="menuUrl" set={set} setError={setError} />
    </>
  )
}
