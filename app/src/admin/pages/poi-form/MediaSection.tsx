import { useRef, useState } from 'react'
import { reportError } from '../../../lib/errorReporting.ts'
import type { FormState } from './types.ts'
import { uploadFile } from './utils.ts'

interface Props {
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  fieldErrors: Set<string>
  setFieldErrors: React.Dispatch<React.SetStateAction<Set<string>>>
  setError: (msg: string) => void
}

export function MediaSection({ form, setForm, fieldErrors, setFieldErrors, setError }: Props) {
  const [uploadingImages, setUploadingImages] = useState(false)
  const [videoInput, setVideoInput] = useState('')
  const imagesRef = useRef<HTMLInputElement>(null)

  async function handleImagesSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    setUploadingImages(true)
    try {
      const urls = await Promise.all(files.map(f => uploadFile(f)))
      setForm(prev => ({ ...prev, images: [...prev.images, ...urls] }))
      setFieldErrors(prev => { const next = new Set(prev); next.delete('images'); return next })
    } catch (err) {
      setError('שגיאה בהעלאת תמונות')
      reportError(err, { source: 'PoiEditPage.uploadImages' })
    } finally {
      setUploadingImages(false)
      e.target.value = ''
    }
  }

  function addVideoLink() {
    const url = (videoInput ?? '').trim()
    if (!url) return
    setForm(prev => ({ ...prev, videos: [...prev.videos, url] }))
    setVideoInput('')
  }

  function removeImage(index: number) {
    setForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }))
  }

  function removeVideo(index: number) {
    setForm(prev => ({ ...prev, videos: prev.videos.filter((_, i) => i !== index) }))
  }

  return (
    <>
      {/* Images */}
      <div data-field="images">
        <label className="block text-sm font-medium text-gray-700 mb-1">תמונות</label>
        <input
          ref={imagesRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleImagesSelect}
        />
        {form.images.length > 0 && (
          <div className="space-y-2 mb-2">
            <div className="relative">
              <img
                src={form.images[0]}
                alt="תמונה ראשית"
                className="w-full max-h-40 object-cover rounded-lg border-2 border-green-400"
                loading="lazy"
                decoding="async"
              />
              <span className="absolute bottom-1 left-1 bg-green-600 text-white text-[10px] px-1.5 py-0.5 rounded">ראשית</span>
              <button
                type="button"
                onClick={() => removeImage(0)}
                className="absolute top-1 right-1 bg-white rounded-full w-5 h-5 flex items-center justify-center text-red-500 hover:text-red-700 text-xs shadow"
              >
                ✕
              </button>
            </div>
            {form.images.length > 1 && (
              <div className="grid grid-cols-3 gap-2">
                {form.images.slice(1).map((url, i) => (
                  <div key={i} className="relative">
                    <img
                      src={url}
                      alt={`תמונה ${i + 2}`}
                      className="w-full h-20 object-cover rounded-lg border border-gray-200"
                      loading="lazy"
                      decoding="async"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(i + 1)}
                      className="absolute top-1 right-1 bg-white rounded-full w-5 h-5 flex items-center justify-center text-red-500 hover:text-red-700 text-xs shadow"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <button
          type="button"
          disabled={uploadingImages}
          onClick={() => imagesRef.current?.click()}
          className="text-green-600 hover:text-green-800 text-sm font-medium disabled:opacity-50"
        >
          {uploadingImages ? 'מעלה...' : '+ הוסף תמונות'}
        </button>
        {fieldErrors.has('images') && <p className="text-red-500 text-xs mt-1">יש להעלות לפחות תמונה אחת</p>}
      </div>

      {/* Videos (links) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">סרטונים (קישורים)</label>
        {form.videos.length > 0 && (
          <div className="space-y-1 mb-2">
            {form.videos.map((url, i) => (
              <div key={i} className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-800 truncate">{url}</a>
                <button
                  type="button"
                  onClick={() => removeVideo(i)}
                  className="text-red-500 hover:text-red-700 text-sm font-medium shrink-0"
                >
                  הסר
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="url"
            value={videoInput}
            onChange={e => setVideoInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addVideoLink() } }}
            placeholder="https://www.youtube.com/watch?v=..."
            className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
          />
          <button
            type="button"
            onClick={addVideoLink}
            className="px-3 py-2 text-green-600 hover:text-green-800 text-sm font-medium"
          >
            + הוסף
          </button>
        </div>
      </div>
    </>
  )
}
