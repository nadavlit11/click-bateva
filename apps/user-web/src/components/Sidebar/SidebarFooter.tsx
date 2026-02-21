interface SidebarFooterProps {
  count: number;
  onClearAll: () => void;
}

export function SidebarFooter({ count, onClearAll }: SidebarFooterProps) {
  return (
    <div className="p-4 bg-gray-50 shrink-0" style={{ boxShadow: "0 -4px 12px rgba(0,0,0,0.08)" }}>
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>נמצאו {count} מקומות</span>
        <button
          onClick={onClearAll}
          className="text-green-600 font-medium hover:text-green-700 transition-colors"
        >
          נקה הכל
        </button>
      </div>
    </div>
  );
}
