import type { Poi } from '../types/index.ts'

interface PoiCardProps {
  poi: Poi
}

export function PoiCard({ poi }: PoiCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
      {/* Image */}
      {poi.mainImage ? (
        <img src={poi.mainImage} alt={poi.name} className="w-full h-36 object-cover" />
      ) : (
        <div className="w-full h-36 bg-gray-100 flex items-center justify-center text-gray-400 text-2xl">📍</div>
      )}
      {/* Body */}
      <div className="p-3">
        <h3 className="font-semibold text-gray-900 text-sm">{poi.name}</h3>
        {poi.description && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{poi.description}</p>
        )}
        <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full ${poi.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {poi.active ? 'פעיל' : 'לא פעיל'}
        </span>
      </div>
    </div>
  )
}
