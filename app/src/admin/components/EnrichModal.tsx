import { useState, useEffect } from 'react'
import { httpsCallable } from 'firebase/functions'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db, functions } from '../../lib/firebase'
import { reportError } from '../../lib/errorReporting'
import { useAuth } from '../../hooks/useAuth'
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
type Rating = 'good' | 'bad'

const FIELD_LABELS: Record<ScalarField, string> = {
  phone: 'טלפון',
  whatsapp: 'וואטסאפ',
  facebook: 'פייסבוק',
  price: 'מחיר',
}

const ALL_FEEDBACK_FIELDS = [
  ...Object.keys(FIELD_LABELS),
  'openingHours', 'images', 'videos',
] as const
type FeedbackField = typeof ALL_FEEDBACK_FIELDS[number]

const enrichPoiFn = httpsCallable<EnrichRequest, EnrichmentResult>(
  functions, 'enrichPoiFromWebsite',
)

export function EnrichModal({ isOpen, onClose, onApply, website, poiName, poiId }: Props) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<EnrichmentResult | null>(null)

  // Cherry-pick state
  const [selectedScalars, setSelectedScalars] = useState<Set<ScalarField>>(new Set())
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set())
  const [selectedVideos, setSelectedVideos] = useState<Set<number>>(new Set())
  const [hoursSelected, setHoursSelected] = useState(false)

  // Feedback state
  const [fieldRatings, setFieldRatings] = useState<Record<string, Rating>>({})
  const [feedbackNote, setFeedbackNote] = useState('')

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
    setFieldRatings({})
    setFeedbackNote('')
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

  function setRating(field: FeedbackField, rating: Rating) {
    setFieldRatings(prev => {
      if (prev[field] === rating) {
        const next = { ...prev }
        delete next[field]
        return next
      }
      return { ...prev, [field]: rating }
    })
  }

  async function saveFeedback(appliedFields: string[], skippedFields: string[]) {
    try {
      await addDoc(collection(db, 'enrichment_feedback'), {
        poiId,
        website,
        timestamp: serverTimestamp(),
        appliedFields,
        skippedFields,
        fieldRatings,
        note: feedbackNote.trim() || null,
        adminUid: user?.uid || null,
      })
    } catch (err) {
      reportError(err, { source: 'EnrichModal.feedback' })
    }
  }

  function handleApply() {
    if (!result) return

    const fields: Partial<ApplyFields> = {}
    const applied: string[] = []
    const skipped: string[] = []

    if (selectedScalars.has('phone') && result.phone) {
      fields.phone = result.phone
      applied.push('phone')
    } else if (result.phone) {
      skipped.push('phone')
    }
    if (selectedScalars.has('whatsapp') && result.whatsapp) {
      fields.whatsapp = result.whatsapp
      applied.push('whatsapp')
    } else if (result.whatsapp) {
      skipped.push('whatsapp')
    }
    if (selectedScalars.has('facebook') && result.facebook) {
      fields.facebook = result.facebook
      applied.push('facebook')
    } else if (result.facebook) {
      skipped.push('facebook')
    }
    if (selectedScalars.has('price') && result.price) {
      fields.agentsPrice = result.price
      fields.groupsPrice = result.price
      applied.push('price')
    } else if (result.price) {
      skipped.push('price')
    }

    if (selectedImages.size > 0) {
      fields.images = result.images.filter((_, i) => selectedImages.has(i))
      applied.push('images')
    } else if (result.images.length > 0) {
      skipped.push('images')
    }
    if (selectedVideos.size > 0) {
      fields.videos = result.videos.filter((_, i) => selectedVideos.has(i))
      applied.push('videos')
    } else if (result.videos.length > 0) {
      skipped.push('videos')
    }

    if (hoursSelected && result.openingHours) {
      fields.openingHours = result.openingHours
      applied.push('openingHours')
    } else if (result.openingHours) {
      skipped.push('openingHours')
    }

    // Save feedback asynchronously (don't block apply)
    const hasFeedback = Object.keys(fieldRatings).length > 0 || feedbackNote.trim()
    if (hasFeedback || applied.length > 0) {
      saveFeedback(applied, skipped)
    }

    onApply(fields)
    onClose()
  }

  const hasSelection = selectedScalars.size > 0 ||
    selectedImages.size > 0 ||
    selectedVideos.size > 0 ||
    hoursSelected

  function RatingButtons({ field }: { field: FeedbackField }) {
    return (
      <span className="flex gap-0.5 mr-auto">
        <button
          type="button"
          onClick={() => setRating(field, 'good')}
          className={`px-1.5 py-0.5 text-xs rounded transition-colors ${
            fieldRatings[field] === 'good'
              ? 'bg-green-100 text-green-700'
              : 'text-gray-400 hover:text-green-600'
          }`}
          title="דירוג טוב"
        >
          👍
        </button>
        <button
          type="button"
          onClick={() => setRating(field, 'bad')}
          className={`px-1.5 py-0.5 text-xs rounded transition-colors ${
            fieldRatings[field] === 'bad'
              ? 'bg-red-100 text-red-700'
              : 'text-gray-400 hover:text-red-600'
          }`}
          title="דירוג גרוע"
        >
          👎
        </button>
      </span>
    )
  }

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
                  <RatingButtons field={field} />
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
                  <RatingButtons field="openingHours" />
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
                <div className="flex items-center mb-2">
                  <p className="text-sm font-medium text-gray-700">
                    תמונות ({selectedImages.size}/{result.images.length})
                  </p>
                  <RatingButtons field="images" />
                </div>
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
                <div className="flex items-center mb-2">
                  <p className="text-sm font-medium text-gray-700">סרטונים</p>
                  <RatingButtons field="videos" />
                </div>
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

            {/* Feedback textarea */}
            <div className="border-t border-gray-100 pt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                הערות לשיפור
              </label>
              <textarea
                value={feedbackNote}
                onChange={e => setFeedbackNote(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none"
                rows={2}
                placeholder="איך ניתן לשפר את ההעשרה? (אופציונלי)"
              />
            </div>
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
