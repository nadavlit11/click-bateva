import type { MapKey } from "../../../hooks/useFirestoreData";
import { MAP_LABELS } from "../../../lib/constants";

interface AppHeaderProps {
  mapKey: MapKey;
  canSeeAgents: boolean;
  onMapKeyChange: (key: MapKey) => void;
  welcomeName?: string | null;
}

export function AppHeader({ mapKey, canSeeAgents, onMapKeyChange, welcomeName }: AppHeaderProps) {
  const keys: MapKey[] = canSeeAgents
    ? ["agents", "groups", "families"]
    : ["groups", "families"];

  return (
    <div className="p-6 border-b border-gray-100">
      <div className="flex items-center gap-3">
        <img src="/icon-192.png" alt="קליק בטבע" className="w-18 h-18 rounded-2xl object-contain shrink-0" />
        <h1 className="text-2xl font-bold text-gray-800">קליק בטבע</h1>
      </div>
      {welcomeName !== undefined && welcomeName !== null && (
        <p className="text-sm text-green-700 font-medium mt-2">
          {welcomeName ? `${welcomeName}, ברוך הבא למפת קליק בטבע` : "ברוך הבא למפת קליק בטבע"}
        </p>
      )}
      <div className="flex mt-3 rounded-xl border-2 border-gray-300 overflow-hidden">
        {keys.map((key) => (
          <button
            key={key}
            onClick={() => onMapKeyChange(key)}
            className={`flex-1 py-3 text-base font-bold transition-all ${
              mapKey === key
                ? "bg-green-600 text-white"
                : "bg-white text-gray-500 hover:bg-gray-100"
            }`}
          >
            {MAP_LABELS[key]}
          </button>
        ))}
      </div>
    </div>
  );
}
