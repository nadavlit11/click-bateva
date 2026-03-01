import { useState, useEffect, useRef } from 'react'
import { reportError } from '../lib/errorReporting.ts'
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
// Bounding box with padding to keep the map focused on Israel
const ISRAEL_BOUNDS: L.LatLngBoundsExpression = [[29.2, 33.8], [33.5, 36.0]]

interface PlaceSuggestion {
  placeId: string
  name: string
  address: string
}

export function MapPicker({ lat, lng, onChange }: Props) {
  const [search, setSearch] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(false)
  const [map, setMap] = useState<L.Map | null>(null)
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const parsedLat = parseFloat(lat)
  const parsedLng = parseFloat(lng)
  const hasPin = !isNaN(parsedLat) && !isNaN(parsedLng) && (parsedLat !== 0 || parsedLng !== 0)

  const center: [number, number] = hasPin ? [parsedLat, parsedLng] : ISRAEL_CENTER

  useEffect(() => {
    if (map && hasPin) {
      map.flyTo([parsedLat, parsedLng], map.getZoom())
    }
  }, [lat, lng, map, hasPin, parsedLat, parsedLng])

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  function handleMapClick(lat: number, lng: number) {
    onChange(lat.toFixed(6), lng.toFixed(6))
  }

  async function fetchSuggestions(query: string) {
    if (!query.trim()) { setSuggestions([]); return }
    setSuggestionsLoading(true)
    try {
      const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': import.meta.env.VITE_GOOGLE_MAPS_API_KEY },
        body: JSON.stringify({
          input: query,
          locationBias: { rectangle: { low: { latitude: 29.5, longitude: 34.2 }, high: { latitude: 33.3, longitude: 35.9 } } },
          languageCode: 'he',
          regionCode: 'IL',
        }),
      })
      if (!res.ok) {
        reportError(new Error(`Places API ${res.status}: ${res.statusText}`), { source: 'MapPicker.fetchSuggestions' })
        setSuggestions([])
        return
      }
      const data = await res.json()
      const results = (data.suggestions ?? []).slice(0, 5).map((s: { placePrediction?: { placeId?: string; text?: { text?: string }; structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } } } }) => ({
        placeId: s.placePrediction?.placeId ?? '',
        name: s.placePrediction?.structuredFormat?.mainText?.text ?? s.placePrediction?.text?.text ?? '',
        address: s.placePrediction?.structuredFormat?.secondaryText?.text ?? '',
      }))
      setSuggestions(results)
    } catch (err) {
      reportError(err, { source: 'MapPicker.fetchSuggestions' })
      setSuggestions([])
    } finally {
      setSuggestionsLoading(false)
    }
  }

  function handleSearchChange(value: string) {
    setSearch(value)
    setSearchError(false)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 300)
  }

  async function selectPlace(suggestion: PlaceSuggestion) {
    setSuggestions([])
    setSearch(suggestion.name)
    // Get place details for coordinates
    setSearching(true)
    setSearchError(false)
    try {
      const res = await fetch(`https://places.googleapis.com/v1/places/${suggestion.placeId}?fields=location&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.location) {
        onChange(data.location.latitude.toFixed(6), data.location.longitude.toFixed(6))
        map?.flyTo([data.location.latitude, data.location.longitude], 15)
      }
    } catch (err) {
      reportError(err, { source: 'MapPicker.selectPlace' })
      // Fallback to geocoding
      await handleGeocode(suggestion.name)
    } finally {
      setSearching(false)
    }
  }

  async function handleGeocode(query?: string) {
    const q = query ?? search
    if (!q.trim()) return
    setSearching(true)
    setSearchError(false)
    setSuggestions([])
    try {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&language=he&region=IL&components=country:IL&key=${apiKey}`
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.status === 'OK' && data.results?.[0]) {
        const loc = data.results[0].geometry.location
        onChange(loc.lat.toFixed(6), loc.lng.toFixed(6))
        map?.flyTo([loc.lat, loc.lng], 15)
      } else {
        setSearchError(true)
      }
    } catch (err) {
      reportError(err, { source: 'MapPicker.search' })
      setSearchError(true)
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <div className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleGeocode() } }}
            placeholder="חפש מיקום או עסק..."
            className={`flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 ${searchError ? 'border-red-400' : 'border-gray-300'}`}
          />
          <button
            type="button"
            onClick={() => handleGeocode()}
            disabled={searching}
            className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {searching ? '...' : 'חפש'}
          </button>
        </div>
        {(suggestions.length > 0 || suggestionsLoading) && (
          <div className="absolute z-[1000] w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {suggestionsLoading && suggestions.length === 0 && (
              <div className="px-3 py-2 text-sm text-gray-400">מחפש...</div>
            )}
            {suggestions.map(s => (
              <button
                key={s.placeId}
                type="button"
                onClick={() => selectPlace(s)}
                className="w-full text-start px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-50 last:border-0"
              >
                <span className="font-medium">{s.name}</span>
                {s.address && <span className="text-gray-400 ms-2 text-xs">{s.address}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
      {searchError && (
        <p className="text-xs text-red-500">לא נמצאו תוצאות. נסה חיפוש אחר.</p>
      )}

      <MapContainer
        center={center}
        zoom={hasPin ? 14 : 8}
        minZoom={7}
        maxBounds={ISRAEL_BOUNDS}
        maxBoundsViscosity={1.0}
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
