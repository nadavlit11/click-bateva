import { useState, useRef } from 'react'
import { read, utils } from 'xlsx'
import {
  collection, writeBatch, doc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../../lib/firebase.ts'
import { reportError } from '../../lib/errorReporting.ts'
import { useAuth } from '../../hooks/useAuth'

interface Props {
  isOpen: boolean
  onClose: () => void
  onImported: () => void
}

interface ParsedRow {
  name: string
  businessName: string
  nameInMap: string
  phone: string
  email: string
}

const HEADER_MAP: Record<string, keyof ParsedRow> = {
  'שם': 'name',
  'name': 'name',
  'עסק': 'businessName',
  'שם העסק': 'businessName',
  'businessname': 'businessName',
  'business name': 'businessName',
  'business': 'businessName',
  'שם במפה': 'nameInMap',
  'name in map': 'nameInMap',
  'nameinmap': 'nameInMap',
  'טלפון': 'phone',
  'phone': 'phone',
  'אימייל': 'email',
  'email': 'email',
  'מייל': 'email',
}

export function ExcelImportModal({
  isOpen, onClose, onImported,
}: Props) {
  const { user } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [fileName, setFileName] = useState('')
  const [parseError, setParseError] = useState('')
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')

  function reset() {
    setRows([])
    setFileName('')
    setParseError('')
    setImportError('')
    if (fileRef.current) fileRef.current.value = ''
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleFile(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    setParseError('')
    setImportError('')
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)

    try {
      const buf = await file.arrayBuffer()
      const wb = read(buf)
      const ws = wb.Sheets[wb.SheetNames[0]]
      const raw = utils.sheet_to_json<Record<string, unknown>>(
        ws, { defval: '' },
      )

      if (raw.length === 0) {
        setParseError('הקובץ ריק')
        return
      }

      // Map headers
      const firstRow = raw[0]
      const colMap: Record<string, keyof ParsedRow> = {}
      for (const key of Object.keys(firstRow)) {
        const normalized = key.trim().toLowerCase()
        if (HEADER_MAP[normalized]) {
          colMap[key] = HEADER_MAP[normalized]
        }
      }

      if (!Object.values(colMap).includes('name')) {
        setParseError(
          'לא נמצאה עמודת "שם" בקובץ. ודא שהשורה הראשונה מכילה כותרות.',
        )
        return
      }

      const parsed: ParsedRow[] = raw
        .map(row => {
          const out: ParsedRow = {
            name: '', businessName: '', nameInMap: '', phone: '', email: '',
          }
          for (const [col, field] of Object.entries(colMap)) {
            out[field] = String(row[col] ?? '').trim()
          }
          return out
        })
        .filter(r => r.name)

      if (parsed.length === 0) {
        setParseError('לא נמצאו שורות עם שם')
        return
      }

      setRows(parsed)
    } catch (err: unknown) {
      setParseError('שגיאה בקריאת הקובץ')
      reportError(err, {
        source: 'ExcelImportModal.parseFile',
      })
    }
  }

  async function handleImport() {
    if (rows.length === 0) return
    setImporting(true)
    setImportError('')

    try {
      // Firestore batch max 500 writes
      const chunks: ParsedRow[][] = []
      for (let i = 0; i < rows.length; i += 500) {
        chunks.push(rows.slice(i, i + 500))
      }

      for (const chunk of chunks) {
        const batch = writeBatch(db)
        for (const row of chunk) {
          const ref = doc(collection(db, 'crm_contacts'))
          batch.set(ref, {
            name: row.name,
            businessName: row.businessName,
            nameInMap: row.nameInMap,
            phone: row.phone,
            email: row.email,
            createdBy: user?.uid ?? '',
            createdByEmail: user?.email ?? '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        }
        await batch.commit()
      }

      onImported()
      handleClose()
    } catch (err: unknown) {
      setImportError('שגיאה בייבוא')
      reportError(err, {
        source: 'ExcelImportModal.import',
      })
    } finally {
      setImporting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          ייבוא אנשי קשר מאקסל
        </h2>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            העלה קובץ Excel (.xlsx / .xls) עם כותרות:
            שם, עסק, שם במפה, טלפון, אימייל
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFile}
            className="block w-full text-sm text-gray-500 file:ml-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
          />
          {fileName && (
            <p className="text-xs text-gray-400 mt-1">{fileName}</p>
          )}
          {parseError && (
            <p className="text-sm text-red-600 mt-1">{parseError}</p>
          )}
        </div>

        {rows.length > 0 && (
          <>
            <p className="text-sm font-medium text-gray-700 mb-2">
              {rows.length} שורות נמצאו — תצוגה מקדימה:
            </p>
            <div className="flex-1 overflow-auto border border-gray-200 rounded-lg mb-4">
              <table className="w-full text-sm min-w-[500px]">
                <thead>
                  <tr className="border-b bg-gray-50 sticky top-0">
                    <th className="text-right px-3 py-2 font-medium text-gray-600">
                      שם
                    </th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600">
                      עסק
                    </th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600">
                      שם במפה
                    </th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600">
                      טלפון
                    </th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600">
                      אימייל
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 50).map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-gray-100"
                    >
                      <td className="px-3 py-1.5 text-gray-900">
                        {row.name}
                      </td>
                      <td className="px-3 py-1.5 text-gray-700">
                        {row.businessName || '—'}
                      </td>
                      <td className="px-3 py-1.5 text-gray-700">
                        {row.nameInMap || '—'}
                      </td>
                      <td className="px-3 py-1.5 text-gray-600" dir="ltr">
                        {row.phone || '—'}
                      </td>
                      <td className="px-3 py-1.5 text-gray-600" dir="ltr">
                        {row.email || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 50 && (
                <p className="text-xs text-gray-400 text-center py-2">
                  מציג 50 מתוך {rows.length}...
                </p>
              )}
            </div>
          </>
        )}

        {importError && (
          <p className="text-sm text-red-600 mb-2">{importError}</p>
        )}

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            ביטול
          </button>
          {rows.length > 0 && (
            <button
              onClick={handleImport}
              disabled={importing}
              className="px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {importing
                ? `מייבא ${rows.length} אנשי קשר...`
                : `ייבא ${rows.length} אנשי קשר`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
