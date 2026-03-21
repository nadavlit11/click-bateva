import { useState, useEffect } from 'react'
import { httpsCallable } from 'firebase/functions'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db, functions } from '../../lib/firebase'
import { reportError } from '../../lib/errorReporting'
import { useAuth } from '../../hooks/useAuth'
import { Modal } from '../../components/Modal'
import type { DayHours } from '../../types/index'
import { DAY_KEYS, DAY_NAMES_HE } from '../pages/poi-form/types'
import type { ApplyFields } from './EnrichModal'

type ExtractionSource =
  | 'programmatic'
  | 'llm'
  | 'both_agree'
  | 'programmatic_preferred'
  | 'llm_rejected'

type FieldProvenance = Record<string, {
  source: ExtractionSource
  programmaticValue: unknown
  llmValue: unknown
  finalValue: unknown
}>

interface DescriptionEnrichmentResult {
  phone: string | null
  whatsapp: string | null
  email: string | null
  openingHours: Record<string, DayHours | null> | 'by_appointment' | null
  price: string | null
  address: string | null
  minPeople: string | null
  maxPeople: string | null
  cleanedDescription: string | null
  provenance?: FieldProvenance
  enrichmentRunId?: string
}

interface CurrentPoiData {
  phone: string
  whatsapp: string
  price: string
  description: string
  openingHours: Record<string, DayHours | null> | 'by_appointment'
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onApply: (fields: Partial<ApplyFields>) => void
  poiId: string
  poiName: string
  currentData: CurrentPoiData
}

type ScalarField = 'phone' | 'whatsapp' | 'price' | 'minPeople' | 'maxPeople'
type Rating = 'good' | 'bad'

const FIELD_LABELS: Record<ScalarField, string> = {
  phone: 'טלפון',
  whatsapp: 'וואטסאפ',
  price: 'מחיר',
  minPeople: 'מינימום משתתפים',
  maxPeople: 'מקסימום משתתפים',
}

type FeedbackField = ScalarField | 'openingHours' | 'cleanedDescription'

const enrichFn = httpsCallable<{ poiId: string }, DescriptionEnrichmentResult>(
  functions, 'enrichPoiFromDescription',
)

export function EnrichFromDescriptionModal({
  isOpen, onClose, onApply, poiId, poiName, currentData,
}: Props) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<DescriptionEnrichmentResult | null>(null)

  const [selectedScalars, setSelectedScalars] = useState<Set<ScalarField>>(new Set())
  const [hoursSelected, setHoursSelected] = useState(false)
  const [cleanedDescSelected, setCleanedDescSelected] = useState(false)

  const [fieldRatings, setFieldRatings] = useState<Record<string, Rating>>({})
  const [feedbackNote, setFeedbackNote] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setLoading(false)
    setApplying(false)
    setError('')
    setResult(null)
    setSelectedScalars(new Set())
    setHoursSelected(false)
    setCleanedDescSelected(false)
    setFieldRatings({})
    setFeedbackNote('')
    handleEnrich()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  async function handleEnrich() {
    setLoading(true)
    setError('')
    try {
      const response = await enrichFn({ poiId })
      const data = response.data
      setResult(data)

      const dataMap = data as unknown as Record<string, unknown>
      const scalars = new Set<ScalarField>()
      for (const field of Object.keys(FIELD_LABELS) as ScalarField[]) {
        const val = dataMap[field]
        if (val) scalars.add(field)
      }
      setSelectedScalars(scalars)
      setHoursSelected(data.openingHours !== null)
      // cleanedDescription unchecked by default — requires intentional review
      setCleanedDescSelected(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'שגיאה בחילוץ נתונים'
      setError(msg)
      reportError(err, { source: 'EnrichFromDescriptionModal' })
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
      const prov = result?.provenance
      const fieldProvenance: Record<string, ExtractionSource> = {}
      if (prov) {
        for (const field of [...appliedFields, ...skippedFields]) {
          if (prov[field]) fieldProvenance[field] = prov[field].source
        }
      }

      await addDoc(collection(db, 'enrichment_feedback'), {
        poiId,
        source: 'description',
        timestamp: serverTimestamp(),
        appliedFields,
        skippedFields,
        fieldRatings,
        note: feedbackNote.trim() || null,
        adminUid: user?.uid || null,
        fieldProvenance: Object.keys(fieldProvenance).length > 0 ? fieldProvenance : null,
        enrichmentRunId: result?.enrichmentRunId ?? null,
      })
    } catch (err) {
      reportError(err, { source: 'EnrichFromDescriptionModal.feedback' })
    }
  }

  async function handleApply() {
    if (!result || applying) return
    setApplying(true)

    const fields: Partial<ApplyFields> = {}
    const applied: string[] = []
    const skipped: string[] = []

    const resultMap = result as unknown as Record<string, unknown>
    for (const field of Object.keys(FIELD_LABELS) as ScalarField[]) {
      const value = resultMap[field] as string | null
      if (selectedScalars.has(field) && value) {
        if (field === 'price') {
          fields.agentsPrice = value
          fields.groupsPrice = value
        } else if (field === 'minPeople') {
          fields.minPeople = value
        } else if (field === 'maxPeople') {
          fields.maxPeople = value
        } else {
          (fields as Record<string, unknown>)[field] = value
        }
        applied.push(field)
      } else if (value) {
        skipped.push(field)
      }
    }

    if (hoursSelected && result.openingHours) {
      fields.openingHours = result.openingHours
      applied.push('openingHours')
    } else if (result.openingHours) {
      skipped.push('openingHours')
    }

    if (cleanedDescSelected && result.cleanedDescription) {
      fields.description = result.cleanedDescription
      applied.push('cleanedDescription')
    } else if (result.cleanedDescription) {
      skipped.push('cleanedDescription')
    }

    const hasFeedback = Object.keys(fieldRatings).length > 0 || feedbackNote.trim()
    if (hasFeedback || applied.length > 0) {
      saveFeedback(applied, skipped)
    }

    onApply(fields)
    onClose()
    setApplying(false)
  }

  const hasSelection = selectedScalars.size > 0 || hoursSelected || cleanedDescSelected

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
      title={`העשרה מהתיאור — ${poiName}`}
      maxWidth="2xl"
      disableClose={loading}
    >
      <div className="px-5 py-4 overflow-y-auto max-h-[70vh]">
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-8 h-8 border-3 border-green-200 border-t-green-600 rounded-full animate-spin" />
            <p className="text-sm text-gray-500">מחלץ נתונים מהתיאור...</p>
            <p className="text-xs text-gray-400">עשוי לקחת מספר שניות</p>
          </div>
        )}

        {error && !loading && (
          <div className="py-8 text-center">
            <p className="text-red-600 text-sm mb-4">{error}</p>
            <button
              type="button"
              onClick={handleEnrich}
              className="px-4 py-2 text-sm font-medium text-green-700
                bg-green-50 border border-green-200 rounded-lg
                hover:bg-green-100 transition-colors"
            >
              נסה שוב
            </button>
          </div>
        )}

        {result && !loading && (
          <div className="space-y-4">
            {/* Scalar fields */}
            {(Object.keys(FIELD_LABELS) as ScalarField[]).map(field => {
              const value = (result as unknown as Record<string, unknown>)[field] as string | null
              const curRaw = field === 'price'
                ? currentData.price
                : field === 'phone'
                  ? currentData.phone
                  : field === 'whatsapp'
                    ? currentData.whatsapp
                    : undefined
              const cur = curRaw?.trim()
              const hasCurrent = !!cur
              const showComparison = hasCurrent && !!value

              if (showComparison) {
                return (
                  <div key={field} className="p-2 rounded-lg hover:bg-gray-50">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedScalars.has(field)}
                        onChange={() => toggleScalar(field)}
                        className="w-4 h-4 text-green-600 rounded border-gray-300"
                      />
                      <span className="text-sm font-medium text-gray-700 min-w-[140px]">
                        {FIELD_LABELS[field]}
                      </span>
                      <RatingButtons field={field} />
                    </label>
                    <div className="mr-7 mt-1 space-y-1">
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-medium text-gray-400 min-w-[32px] shrink-0">נוכחי</span>
                        <span className="text-xs text-gray-500 truncate" dir="ltr">{cur}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-medium text-blue-500 min-w-[32px] shrink-0">חדש</span>
                        <span className="text-sm text-gray-600 truncate" dir="ltr">{value}</span>
                      </div>
                    </div>
                  </div>
                )
              }

              return (
                <label
                  key={field}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedScalars.has(field)}
                    onChange={() => toggleScalar(field)}
                    disabled={!value}
                    className="w-4 h-4 text-green-600 rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700 min-w-[140px]">
                    {FIELD_LABELS[field]}
                  </span>
                  {value ? (
                    <span className="text-sm text-gray-600 truncate" dir="ltr">{value}</span>
                  ) : (
                    <span className="text-sm text-gray-400">לא נמצא</span>
                  )}
                  <RatingButtons field={field} />
                </label>
              )
            })}

            {/* Opening hours */}
            <div className="border-t border-gray-100 pt-3">
              <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hoursSelected}
                  onChange={() => setHoursSelected(!hoursSelected)}
                  disabled={!result.openingHours}
                  className="w-4 h-4 text-green-600 rounded border-gray-300"
                />
                <span className="text-sm font-medium text-gray-700">שעות פתיחה</span>
                {!result.openingHours && (
                  <span className="text-sm text-gray-400">לא נמצא</span>
                )}
                <RatingButtons field="openingHours" />
              </label>
              {hoursSelected && result.openingHours && (
                result.openingHours === 'by_appointment' ? (
                  <div className="mr-7 mt-1">
                    {(currentData.openingHours !== 'by_appointment'
                      && typeof currentData.openingHours === 'object'
                      && Object.values(currentData.openingHours).some(v => v !== null)) && (
                      <p className="text-xs font-medium text-gray-400 mb-1">נוכחי: שעות קבועות</p>
                    )}
                    {currentData.openingHours === 'by_appointment' && (
                      <p className="text-xs font-medium text-gray-400 mb-1">נוכחי: בתיאום מראש</p>
                    )}
                    <p className="text-sm text-gray-600">בתיאום מראש</p>
                  </div>
                ) : (() => {
                  const curHours = currentData.openingHours
                  const hasCurrentHours =
                    curHours !== 'by_appointment'
                    && typeof curHours === 'object'
                    && Object.values(curHours).some(v => v !== null)
                  const isByAppt = curHours === 'by_appointment'
                  const newHours = result.openingHours as Record<string, DayHours | null>
                  return (
                    <div className="mr-7 mt-1 space-y-2">
                      {(hasCurrentHours || isByAppt) && (
                        <>
                          <p className="text-xs font-medium text-gray-400">נוכחי</p>
                          {isByAppt ? (
                            <p className="text-xs text-gray-400 mb-2">לפי תיאום</p>
                          ) : (
                            <div className="grid grid-cols-2 gap-1 mb-2">
                              {DAY_KEYS.map(day => {
                                const h = (curHours as Record<string, DayHours | null>)[day]
                                return (
                                  <div key={day} className="flex items-center gap-2 text-xs text-gray-400">
                                    <span className="font-medium min-w-[40px]">{DAY_NAMES_HE[day]}</span>
                                    {h ? <span dir="ltr">{h.open}–{h.close}</span> : <span>סגור</span>}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </>
                      )}
                      {(hasCurrentHours || isByAppt) && (
                        <p className="text-xs font-medium text-blue-500">חדש</p>
                      )}
                      <div className="grid grid-cols-2 gap-1">
                        {DAY_KEYS.map(day => {
                          const hours = newHours[day]
                          return (
                            <div key={day} className="flex items-center gap-2 text-xs text-gray-600">
                              <span className="font-medium min-w-[40px]">{DAY_NAMES_HE[day]}</span>
                              {hours
                                ? <span dir="ltr">{hours.open}–{hours.close}</span>
                                : <span className="text-gray-400">סגור</span>}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()
              )}
            </div>

            {/* Cleaned description */}
            {result.cleanedDescription && (
              <div className="border-t border-gray-100 pt-3">
                <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cleanedDescSelected}
                    onChange={() => setCleanedDescSelected(!cleanedDescSelected)}
                    className="w-4 h-4 text-green-600 rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">תיאור מנוקה</span>
                  <RatingButtons field="cleanedDescription" />
                </label>
                <div className="mr-7 mt-1 space-y-1">
                  {currentData.description.trim() && (
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-medium text-gray-400 min-w-[32px] shrink-0">נוכחי</span>
                      <span className="text-xs text-gray-500 whitespace-pre-wrap line-clamp-3">
                        {currentData.description}
                      </span>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-medium text-blue-500 min-w-[32px] shrink-0">חדש</span>
                    <span className="text-sm text-gray-600 whitespace-pre-wrap">
                      {result.cleanedDescription}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Feedback textarea */}
            <div className="border-t border-gray-100 pt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                הערות לשיפור
              </label>
              <textarea
                value={feedbackNote}
                onChange={e => setFeedbackNote(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2
                  text-sm focus:outline-none focus:border-green-500 resize-none"
                rows={2}
                placeholder="איך ניתן לשפר את החילוץ? (אופציונלי)"
              />
            </div>
          </div>
        )}
      </div>

      {result && !loading && (
        <div className="flex gap-2 px-5 py-3 border-t border-gray-200">
          <button
            type="button"
            onClick={handleApply}
            disabled={!hasSelection || applying}
            className="px-5 py-2 bg-green-600 text-white text-sm font-medium
              rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {applying ? 'מחיל...' : 'החל שדות נבחרים'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 border border-gray-300 text-gray-700 text-sm
              font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            ביטול
          </button>
        </div>
      )}
    </Modal>
  )
}
