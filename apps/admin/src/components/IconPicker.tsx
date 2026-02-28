import { useState, useEffect, useRef } from 'react'
import { ref, getDownloadURL } from 'firebase/storage'
import { storage } from '../lib/firebase.ts'
import type { Icon } from '../types/index.ts'

interface Props {
  icons: Icon[]
  value: string
  onChange: (id: string) => void
}

export function IconPicker({ icons, value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [urls, setUrls] = useState<Record<string, string>>({})
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (icons.length === 0) return
    Promise.all(
      icons.map(async icon => {
        const url = await getDownloadURL(ref(storage, icon.path))
        return [icon.id, url] as const
      })
    ).then(entries => setUrls(Object.fromEntries(entries)))
    .catch(() => {})
  }, [icons])

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const selected = icons.find(i => i.id === value)

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-green-500 text-start"
      >
        {selected ? (
          <>
            {urls[selected.id] ? (
              <img src={urls[selected.id]} alt="" className="w-5 h-5 object-contain flex-shrink-0" />
            ) : (
              <div className="w-5 h-5 rounded bg-gray-100 flex-shrink-0 animate-pulse" />
            )}
            <span className="text-gray-900">{selected.name}</span>
          </>
        ) : (
          <span className="text-gray-400">ללא אייקון</span>
        )}
        <svg className="w-4 h-4 text-gray-400 ms-auto flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-52 overflow-y-auto">
          <button
            type="button"
            onClick={() => { onChange(''); setOpen(false) }}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-start hover:bg-gray-50 ${!value ? 'bg-green-50 text-green-700' : 'text-gray-500'}`}
          >
            ללא אייקון
          </button>
          {icons.map(icon => (
            <button
              type="button"
              key={icon.id}
              onClick={() => { onChange(icon.id); setOpen(false) }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-start hover:bg-gray-50 ${value === icon.id ? 'bg-green-50 text-green-700' : 'text-gray-700'}`}
            >
              {urls[icon.id] ? (
                <img src={urls[icon.id]} alt="" className="w-5 h-5 object-contain flex-shrink-0" />
              ) : (
                <div className="w-5 h-5 rounded bg-gray-100 flex-shrink-0 animate-pulse" />
              )}
              {icon.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
