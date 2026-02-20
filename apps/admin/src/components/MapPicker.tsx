import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet default marker icon broken by bundlers
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

interface Props {
  lat: string
  lng: string
  onChange: (lat: string, lng: string) => void
}

function ClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: e => onMapClick(e.latlng.lat, e.latlng.lng) })
  return null
}

const ISRAEL_CENTER: [number, number] = [31.5, 34.75]

export function MapPicker({ lat, lng, onChange }: Props) {
  const [search, setSearch] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(false)
  const [map, setMap] = useState<L.Map | null>(null)

  const parsedLat = parseFloat(lat)
  const parsedLng = parseFloat(lng)
  const hasPin = !isNaN(parsedLat) && !isNaN(parsedLng) && (parsedLat !== 0 || parsedLng !== 0)

  const center: [number, number] = hasPin ? [parsedLat, parsedLng] : ISRAEL_CENTER

  useEffect(() => {
    if (map && hasPin) {
      map.flyTo([parsedLat, parsedLng], map.getZoom())
    }
  }, [lat, lng, map, hasPin, parsedLat, parsedLng])

  function handleMapClick(lat: number, lng: number) {
    onChange(lat.toFixed(6), lng.toFixed(6))
  }

  async function handleSearch() {
    if (!search.trim()) return
    setSearching(true)
    setSearchError(false)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(search)}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'he' } }
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const results = await res.json() as Array<{ lat: string; lon: string }>
      if (results[0]) {
        const newLat = parseFloat(results[0].lat)
        const newLng = parseFloat(results[0].lon)
        onChange(newLat.toFixed(6), newLng.toFixed(6))
        map?.flyTo([newLat, newLng], 15)
      } else {
        setSearchError(true)
      }
    } catch (err) {
      console.error(err)
      setSearchError(true)
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setSearchError(false) }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSearch() } }}
          placeholder="חפש מיקום..."
          className={`flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 ${searchError ? 'border-red-400' : 'border-gray-300'}`}
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching}
          className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {searching ? '...' : 'חפש'}
        </button>
      </div>
      {searchError && (
        <p className="text-xs text-red-500">לא נמצאו תוצאות. נסה חיפוש אחר.</p>
      )}

      <MapContainer
        center={center}
        zoom={hasPin ? 14 : 8}
        style={{ height: '280px', borderRadius: '8px', border: '1px solid #e5e7eb' }}
        ref={setMap}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <ClickHandler onMapClick={handleMapClick} />
        {hasPin && (
          <Marker
            position={[parsedLat, parsedLng]}
            draggable
            eventHandlers={{
              dragend: e => {
                const pos = (e.target as L.Marker).getLatLng()
                onChange(pos.lat.toFixed(6), pos.lng.toFixed(6))
              },
            }}
          />
        )}
      </MapContainer>

      {hasPin && (
        <p className="text-xs text-gray-400 text-center">
          {parsedLat.toFixed(6)}, {parsedLng.toFixed(6)}
        </p>
      )}
    </div>
  )
}
