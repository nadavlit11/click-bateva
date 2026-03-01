import { useState, useEffect, useRef } from 'react'
import { collection, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../lib/firebase.ts'
import { reportError } from '../lib/errorReporting.ts'
import type { Icon } from '../types/index.ts'
import { useUserRole } from '../hooks/useUserRole.ts'

type BulkItemStatus = 'pending' | 'uploading' | 'done' | 'error'
interface BulkItem { name: string; status: BulkItemStatus }
const BULK_STATUS: Record<BulkItemStatus, { dot: string; label: string }> = {
  pending:   { dot: 'bg-gray-300',                      label: 'ממתין'  },
  uploading: { dot: 'bg-yellow-400 animate-pulse',       label: 'מעלה...' },
  done:      { dot: 'bg-green-500',                      label: '✓'      },
  error:     { dot: 'bg-red-500',                        label: 'שגיאה'  },
}

export function IconsPage() {
  const role = useUserRole()
  const [icons, setIcons] = useState<Icon[]>([])
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({})
  const [name, setName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const bulkFileRef = useRef<HTMLInputElement>(null)
  const [bulkItems, setBulkItems] = useState<BulkItem[]>([])
  const [bulkUploading, setBulkUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

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
    }).catch(err => reportError(err, { source: 'IconsPage.resolveUrls' }))
  }, [icons])

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const iconName = name.trim()
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
      reportError(err, { source: 'IconsPage.upload' })
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleBulkSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    const items: BulkItem[] = files.map(f => ({
      name: f.name.replace(/\.[^.]+$/, ''),
      status: 'pending',
    }))
    setBulkItems(items)
    setBulkUploading(true)
    await Promise.all(files.map(async (file, i) => {
      setBulkItems(prev => prev.map((it, j) => j === i ? { ...it, status: 'uploading' } : it))
      try {
        const ext = file.name.split('.').pop() ?? ''
        const path = `icons/${crypto.randomUUID()}.${ext}`
        const storageRef = ref(storage, path)
        await uploadBytes(storageRef, file)
        await addDoc(collection(db, 'icons'), { name: items[i].name, path, createdAt: serverTimestamp() })
        setBulkItems(prev => prev.map((it, j) => j === i ? { ...it, status: 'done' } : it))
      } catch (err) {
        setBulkItems(prev => prev.map((it, j) => j === i ? { ...it, status: 'error' } : it))
        reportError(err, { source: 'IconsPage.bulkUpload' })
      }
    }))
    setBulkUploading(false)
    e.target.value = ''
  }

  async function handleDelete(id: string) {
    if (!confirm('האם אתה בטוח שברצונך למחוק אייקון זה?')) return
    try {
      await deleteDoc(doc(db, 'icons', id))
    } catch (err) {
      setError('שגיאה במחיקה. נסה שוב.')
      reportError(err, { source: 'IconsPage.delete' })
    }
  }

  const sortedIcons = [...icons]
    .sort((a, b) => a.name.localeCompare(b.name, 'he'))
    .filter(i => !searchQuery || i.name.includes(searchQuery))

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
            onClick={() => {
              if (!name.trim()) { setError('יש להזין שם לאייקון'); return }
              setError('')
              fileRef.current?.click()
            }}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {uploading ? 'מעלה...' : '+ בחר קובץ'}
          </button>
        </div>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      </div>

      {/* Bulk upload */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">העלאה מרובה (שם הקובץ = שם האייקון)</h2>
          <input
            ref={bulkFileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleBulkSelect}
          />
          <button
            type="button"
            disabled={bulkUploading}
            onClick={() => { setBulkItems([]); bulkFileRef.current?.click() }}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {bulkUploading ? 'מעלה...' : 'בחר קבצים'}
          </button>
        </div>
        {bulkItems.length > 0 && (
          <ul className="space-y-1 max-h-48 overflow-y-auto">
            {bulkItems.map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${BULK_STATUS[item.status].dot}`} />
                <span className="text-gray-700 truncate">{item.name}</span>
                <span className="text-xs text-gray-400 ms-auto flex-shrink-0">
                  {BULK_STATUS[item.status].label}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="חפש אייקון..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
        />
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
            {sortedIcons.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center py-10 text-gray-400">
                  {icons.length > 0 ? 'לא נמצאו אייקונים' : 'אין אייקונים עדיין'}
                </td>
              </tr>
            )}
            {sortedIcons.map(icon => (
              <tr key={icon.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3">
                  {resolvedUrls[icon.id] ? (
                    <img
                      src={resolvedUrls[icon.id]}
                      alt={icon.name}
                      className="w-10 h-10 object-contain rounded border border-gray-200 bg-gray-50"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded border border-gray-200 bg-gray-100 animate-pulse" />
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">{icon.name}</td>
                <td className="px-4 py-3">
                  {role === 'admin' && (
                    <button
                      onClick={() => { handleDelete(icon.id) }}
                      className="text-red-500 hover:text-red-700 text-xs font-medium"
                    >
                      מחיקה
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
