import { useRef, useState } from 'react'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { storage } from '../lib/firebase.ts'
import { reportError } from '../lib/errorReporting.ts'

interface ImageUploaderProps {
  poiId: string
  images: string[]
  onChange: (images: string[]) => void
}

export function ImageUploader({ poiId, images, onChange }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  async function handleFiles(files: FileList) {
    setUploading(true)
    setUploadError('')
    const newUrls: string[] = []
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop() ?? 'jpg'
        const path = `poi-media/${poiId}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const storageRef = ref(storage, path)
        await uploadBytesResumable(storageRef, file)
        const url = await getDownloadURL(storageRef)
        newUrls.push(url)
      }
      onChange([...images, ...newUrls])
    } catch (err) {
      reportError(err, { source: 'ImageUploader.upload' })
      setUploadError('שגיאה בהעלאת התמונה')
    } finally {
      setUploading(false)
    }
  }

  function removeImage(url: string) {
    onChange(images.filter(u => u !== url))
  }

  return (
    <div className="space-y-3">
      {/* Preview grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map(url => (
            <div key={url} className="relative group">
              <img src={url} alt="" className="w-full h-24 object-cover rounded-lg" />
              <button
                onClick={() => removeImage(url)}
                className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="הסר תמונה"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => { if (e.target.files?.length) handleFiles(e.target.files) }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
      >
        {uploading ? 'מעלה...' : '+ הוסף תמונות'}
      </button>
      {uploadError && <p className="text-red-500 text-xs">{uploadError}</p>}
    </div>
  )
}
