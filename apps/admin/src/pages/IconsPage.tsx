import { useState, useEffect, useRef } from 'react'
import { collection, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../lib/firebase.ts'
import type { Icon } from '../types/index.ts'

export function IconsPage() {
  const [icons, setIcons] = useState<Icon[]>([])
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({})
  const [name, setName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return onSnapshot(collection(db, 'icons'), snap => {
      setIcons(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Icon))
    })
  }, [])

  useEffect(() => {
    if (icons.length === 0) return
    Promise.all(
      icons.map(async icon => {
        const url = await getDownloadURL(ref(storage, icon.path))
        return [icon.id, url] as const
      })
    ).then(entries => {
      setResolvedUrls(Object.fromEntries(entries))
    }).catch(console.error)
  }, [icons])

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const iconName = name.trim() || file.name.replace(/\.[^.]+$/, '')
    setUploading(true)
    setError('')
    try {
      const ext = file.name.split('.').pop() ?? ''
      const path = `icons/${crypto.randomUUID()}.${ext}`
      const storageRef = ref(storage, path)
      await uploadBytes(storageRef, file)
      await addDoc(collection(db, 'icons'), { name: iconName, path, createdAt: serverTimestamp() })
      setName('')
    } catch (err) {
      setError('שגיאה בהעלאת האייקון')
      console.error(err)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('האם אתה בטוח שברצונך למחוק אייקון זה?')) return
    try {
      await deleteDoc(doc(db, 'icons', id))
    } catch (err) {
      setError('שגיאה במחיקה. נסה שוב.')
      console.error(err)
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">אייקונים</h1>
      </div>

      {/* Upload form */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">העלאת אייקון חדש</h2>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-600 mb-1">שם האייקון</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="למשל: מסעדה"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
            />
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {uploading ? 'מעלה...' : '+ בחר קובץ'}
          </button>
        </div>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      </div>

      {/* Icons table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-right px-4 py-3 font-medium text-gray-600">תמונה</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">שם</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {icons.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center py-10 text-gray-400">
                  אין אייקונים עדיין
                </td>
              </tr>
            )}
            {icons.map(icon => (
              <tr key={icon.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3">
                  {resolvedUrls[icon.id] ? (
                    <img
                      src={resolvedUrls[icon.id]}
                      alt={icon.name}
                      className="w-10 h-10 object-contain rounded border border-gray-200 bg-gray-50"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded border border-gray-200 bg-gray-100 animate-pulse" />
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">{icon.name}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => { handleDelete(icon.id) }}
                    className="text-red-500 hover:text-red-700 text-xs font-medium"
                  >
                    מחיקה
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
