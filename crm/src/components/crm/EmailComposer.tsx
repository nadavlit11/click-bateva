import { useState, useRef } from 'react'
import {
  ref, uploadBytes, getDownloadURL,
} from 'firebase/storage'
import {
  collection, addDoc, serverTimestamp,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { storage, db, functions } from '../../lib/firebase.ts'
import { reportError } from '../../lib/errorReporting.ts'
import { useAuth } from '../../hooks/useAuth'

interface Props {
  isOpen: boolean
  onClose: () => void
  contactId: string
  contactEmail: string
}

export function EmailComposer({
  isOpen, onClose, contactId, contactEmail,
}: Props) {
  const { user } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  function reset() {
    setSubject('')
    setBody('')
    setFiles([])
    setError('')
    setSuccess(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleFiles(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const selected = e.target.files
    if (selected) {
      setFiles(prev => [...prev, ...Array.from(selected)])
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  function removeFile(idx: number) {
    setFiles(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!subject.trim()) {
      setError('נושא הוא שדה חובה')
      return
    }
    setSending(true)
    setError('')

    try {
      // Upload files to Storage
      const attachments: {
        name: string; url: string
      }[] = []

      for (const file of files) {
        const ts = Date.now()
        const path =
          `crm-attachments/${contactId}/${ts}_${file.name}`
        const storageRef = ref(storage, path)
        await uploadBytes(storageRef, file)
        const url = await getDownloadURL(storageRef)
        attachments.push({ name: file.name, url })

        // Save attachment metadata to Firestore
        await addDoc(
          collection(
            db, 'crm_contacts', contactId, 'attachments',
          ),
          {
            name: file.name,
            url,
            contentType: file.type || 'application/octet-stream',
            size: file.size,
            emailSubject: subject.trim(),
            uploadedBy: user?.uid ?? '',
            uploadedByEmail: user?.email ?? '',
            createdAt: serverTimestamp(),
          },
        )
      }

      // Send email via Cloud Function
      const sendEmail = httpsCallable(
        functions, 'sendContactEmail',
      )
      await sendEmail({
        to: contactEmail,
        subject: subject.trim(),
        body: body || '',
        attachments,
      })

      setSuccess(true)
      setTimeout(() => handleClose(), 1500)
    } catch (err: unknown) {
      setError('שגיאה בשליחת האימייל')
      reportError(err, {
        source: 'EmailComposer.send',
      })
    } finally {
      setSending(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          שליחת אימייל
        </h2>

        {success ? (
          <div className="text-center py-8">
            <p className="text-green-600 font-medium">
              האימייל נשלח בהצלחה
            </p>
          </div>
        ) : (
          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                אל
              </label>
              <input
                type="email"
                value={contactEmail}
                readOnly
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                נושא <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                תוכן
              </label>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={5}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                קבצים מצורפים
              </label>
              <input
                ref={fileRef}
                type="file"
                multiple
                onChange={handleFiles}
                className="block w-full text-sm text-gray-500 file:ml-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
              />
              {files.length > 0 && (
                <div className="mt-2 space-y-1">
                  {files.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded"
                    >
                      <span className="truncate flex-1">
                        {f.name}
                      </span>
                      <span className="text-gray-400">
                        {(f.size / 1024).toFixed(0)} KB
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="text-red-500 hover:text-red-700"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                ביטול
              </button>
              <button
                type="submit"
                disabled={sending}
                className="px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {sending ? 'שולח...' : 'שלח אימייל'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
