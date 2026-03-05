import type { MapKey } from "../../hooks/useFirestoreData";
import { MAP_LABELS } from "../../lib/constants";

interface AppHeaderProps {
  mapKey: MapKey;
  isAgent: boolean;
  onMapKeyChange?: (key: MapKey) => void;
}

export function AppHeader({ mapKey, isAgent, onMapKeyChange }: AppHeaderProps) {
  return (
    <div className="p-6 border-b border-gray-100">
      <div className="flex items-center gap-3">
        <img src="/icon-192.png" alt="קליק בטבע" className="w-12 h-12 rounded-2xl object-contain shrink-0" />
        <div>
          <h1 className="text-2xl font-bold text-gray-800">קליק בטבע</h1>
          {isAgent ? (
            <div className="inline-flex bg-gray-100 rounded-full p-0.5 text-xs font-medium mt-1">
              {(["groups", "agents"] as const).map((key) => (
                <button
                  key={key}
                  onClick={() => onMapKeyChange?.(key)}
                  className={`px-2.5 py-1 rounded-full transition-colors ${
                    mapKey === key
                      ? "bg-green-600 text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {MAP_LABELS[key]}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              מפת {MAP_LABELS[mapKey]}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
