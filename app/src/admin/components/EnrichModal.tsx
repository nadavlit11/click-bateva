import { useState, useEffect } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../../lib/firebase'
import { reportError } from '../../lib/errorReporting'
import { Modal } from '../../components/Modal'
import type { DayHours } from '../../types/index'
import { DAY_KEYS, DAY_NAMES_HE } from '../pages/poi-form/types'

interface EnrichmentResult {
  phone: string | null
  whatsapp: string | null
  email: string | null
  videos: string[]
  images: string[]
  facebook: string | null
  openingHours: Record<string, DayHours | null> | null
  price: string | null
}

interface EnrichRequest {
  website: string
  poiName: string
  poiId: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onApply: (fields: Partial<ApplyFields>) => void
  website: string
  poiName: string
  poiId: string
}

export interface ApplyFields {
  phone: string
  whatsapp: string
  facebook: string
  images: string[]
  videos: string[]
  openingHours: Record<string, DayHours | null>
  agentsPrice: string
  groupsPrice: string
}

type ScalarField = 'phone' | 'whatsapp' | 'facebook' | 'price'

const FIELD_LABELS: Record<ScalarField, string> = {
  phone: 'טלפון',
  whatsapp: 'וואטסאפ',
  facebook: 'פייסבוק',
  price: 'מחיר',
}

const enrichPoiFn = httpsCallable<EnrichRequest, EnrichmentResult>(
  functions, 'enrichPoiFromWebsite',
)

export function EnrichModal({ isOpen, onClose, onApply, website, poiName, poiId }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<EnrichmentResult | null>(null)

  // Cherry-pick state
  const [selectedScalars, setSelectedScalars] = useState<Set<ScalarField>>(new Set())
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set())
  const [selectedVideos, setSelectedVideos] = useState<Set<number>>(new Set())
  const [hoursSelected, setHoursSelected] = useState(false)

  // Reset state and auto-fetch when modal opens
  useEffect(() => {
    if (!isOpen) return
    setLoading(false)
    setError('')
    setResult(null)
    setSelectedScalars(new Set())
    setSelectedImages(new Set())
    setSelectedVideos(new Set())
    setHoursSelected(false)
    handleEnrich()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  async function handleEnrich() {
    setLoading(true)
    setError('')
    try {
      const response = await enrichPoiFn({ website, poiName, poiId })
      const data = response.data
      setResult(data)

      // Pre-select non-null fields
      const scalars = new Set<ScalarField>()
      for (const field of Object.keys(FIELD_LABELS) as ScalarField[]) {
        if (data[field]) scalars.add(field)
      }
      setSelectedScalars(scalars)

      setSelectedImages(new Set(data.images.map((_, i) => i)))
      setSelectedVideos(new Set(data.videos.map((_, i) => i)))
      setHoursSelected(data.openingHours !== null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'שגיאה בהעשרת הנתונים'
      setError(msg)
      reportError(err, { source: 'EnrichModal' })
    } finally {
      setLoading(false)
    }
  }

  function toggleScalar(field: ScalarField) {
    setSelectedScalars(prev => {
      const next = new Set(prev)
      if (next.has(field)) next.delete(field)
      else next.add(field)
      return next
    })
  }

  function toggleImage(idx: number) {
    setSelectedImages(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  function toggleVideo(idx: number) {
    setSelectedVideos(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  function handleApply() {
    if (!result) return

    const fields: Partial<ApplyFields> = {}

    if (selectedScalars.has('phone') && result.phone) {
      fields.phone = result.phone
    }
    if (selectedScalars.has('whatsapp') && result.whatsapp) {
      fields.whatsapp = result.whatsapp
    }
    if (selectedScalars.has('facebook') && result.facebook) {
      fields.facebook = result.facebook
    }
    if (selectedScalars.has('price') && result.price) {
      // Price goes to both agents and groups price fields
      fields.agentsPrice = result.price
      fields.groupsPrice = result.price
    }

    if (selectedImages.size > 0) {
      fields.images = result.images.filter((_, i) => selectedImages.has(i))
    }
    if (selectedVideos.size > 0) {
      fields.videos = result.videos.filter((_, i) => selectedVideos.has(i))
    }

    if (hoursSelected && result.openingHours) {
      fields.openingHours = result.openingHours
    }

    onApply(fields)
    onClose()
  }

  const hasSelection = selectedScalars.size > 0 ||
    selectedImages.size > 0 ||
    selectedVideos.size > 0 ||
    hoursSelected

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="העשרה מהאתר"
      maxWidth="lg"
      disableClose={loading}
    >
      <div className="px-5 py-4 overflow-y-auto max-h-[70vh]">
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-sm text-gray-500">מעשיר נתונים מהאתר...</p>
            <p className="text-xs text-gray-400">התהליך עשוי לקחת עד דקה</p>
          </div>
        )}

        {error && !loading && (
          <div className="py-8 text-center">
            <p className="text-red-600 text-sm mb-4">{error}</p>
            <button
              type="button"
              onClick={handleEnrich}
              className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              נסה שוב
            </button>
          </div>
        )}

        {result && !loading && (
          <div className="space-y-4">
            {/* Scalar fields */}
            {(Object.keys(FIELD_LABELS) as ScalarField[]).map(field => {
              const value = result[field]
              if (!value) return null
              return (
                <label key={field} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedScalars.has(field)}
                    onChange={() => toggleScalar(field)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700 min-w-[70px]">
                    {FIELD_LABELS[field]}
                  </span>
                  <span className="text-sm text-gray-600 truncate" dir="ltr">
                    {value}
                  </span>
                </label>
              )
            })}

            {/* Opening hours */}
            {result.openingHours && (
              <div className="border-t border-gray-100 pt-3">
                <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hoursSelected}
                    onChange={() => setHoursSelected(!hoursSelected)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">שעות פתיחה</span>
                </label>
                {hoursSelected && (
                  <div className="mr-7 mt-1 grid grid-cols-2 gap-1">
                    {DAY_KEYS.map(day => {
                      const hours = result.openingHours?.[day]
                      return (
                        <div key={day} className="flex items-center gap-2 text-xs text-gray-600">
                          <span className="font-medium min-w-[40px]">{DAY_NAMES_HE[day]}</span>
                          {hours ? (
                            <span dir="ltr">{hours.open}–{hours.close}</span>
                          ) : (
                            <span className="text-gray-400">סגור</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Images */}
            {result.images.length > 0 && (
              <div className="border-t border-gray-100 pt-3">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  תמונות ({selectedImages.size}/{result.images.length})
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {result.images.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleImage(idx)}
                      className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-colors ${
                        selectedImages.has(idx) ? 'border-blue-500' : 'border-gray-200 opacity-60'
                      }`}
                    >
                      <img
                        src={url}
                        alt={`תמונה ${idx + 1}`}
                        className="w-full h-full object-cover"
                        onError={e => { e.currentTarget.hidden = true }}
                      />
                      {selectedImages.has(idx) && (
                        <div className="absolute top-1 start-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Videos */}
            {result.videos.length > 0 && (
              <div className="border-t border-gray-100 pt-3">
                <p className="text-sm font-medium text-gray-700 mb-2">סרטונים</p>
                {result.videos.map((url, idx) => (
                  <label key={idx} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedVideos.has(idx)}
                      onChange={() => toggleVideo(idx)}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-600 truncate" dir="ltr">{url}</span>
                  </label>
                ))}
              </div>
            )}

            {/* No results message */}
            {!result.phone && !result.email && !result.whatsapp && !result.facebook &&
             !result.price && !result.openingHours && result.images.length === 0 &&
             result.videos.length === 0 && (
              <p className="text-center text-gray-500 py-4 text-sm">
                לא נמצאו נתונים חדשים באתר
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer buttons */}
      {result && !loading && (
        <div className="flex gap-2 px-5 py-3 border-t border-gray-200">
          <button
            type="button"
            onClick={handleApply}
            disabled={!hasSelection}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            החל שדות נבחרים
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            ביטול
          </button>
        </div>
      )}
    </Modal>
  )
}
