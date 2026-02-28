import { useState, useEffect, useRef } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { reportError } from '../lib/errorReporting'

const MIN_PIN = 12
const MAX_PIN = 60
const DEFAULT_PIN = 24

export function MapSettingsPage() {
  const [pinSize, setPinSize] = useState(DEFAULT_PIN)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    getDoc(doc(db, 'settings', 'map'))
      .then(snap => { if (snap.exists()) setPinSize(snap.data().pinSize ?? DEFAULT_PIN) })
      .catch(err => reportError(err, { source: 'MapSettingsPage.load' }))
      .finally(() => setLoading(false))
    return () => { if (savedTimerRef.current) clearTimeout(savedTimerRef.current) }
  }, [])

  function clamp(v: number) { return Math.max(MIN_PIN, Math.min(MAX_PIN, v)) }

  async function handleSave() {
    setSaving(true)
    try {
      await setDoc(doc(db, 'settings', 'map'), { pinSize })
      setSaved(true)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      reportError(err, { source: 'MapSettingsPage.save' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">הגדרות מפה</h2>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">טוען...</p>
      ) : (
        <div className="max-w-sm bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">גודל סיכות על המפה</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPinSize(v => clamp(v - 1))}
                disabled={pinSize <= MIN_PIN}
                className="w-9 h-9 rounded-lg border border-gray-200 text-gray-600 text-lg font-medium hover:bg-gray-50 disabled:opacity-30 transition-colors"
              >
                −
              </button>
              <input
                type="number"
                value={pinSize}
                min={MIN_PIN}
                max={MAX_PIN}
                onChange={e => setPinSize(clamp(Number(e.target.value)))}
                className="w-16 text-center border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-400"
                dir="ltr"
              />
              <span className="text-sm text-gray-400">px</span>
              <button
                onClick={() => setPinSize(v => clamp(v + 1))}
                disabled={pinSize >= MAX_PIN}
                className="w-9 h-9 rounded-lg border border-gray-200 text-gray-600 text-lg font-medium hover:bg-gray-50 disabled:opacity-30 transition-colors"
              >
                +
              </button>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {saving ? 'שומר...' : saved ? '✓ נשמר' : 'שמור'}
          </button>
        </div>
      )}
    </div>
  )
}
