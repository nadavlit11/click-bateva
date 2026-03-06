interface SidebarFooterProps {
  count: number;
  onClearAll: () => void;
}

export function SidebarFooter({ count, onClearAll }: SidebarFooterProps) {
  return (
    <div className="p-4 bg-gray-50 shrink-0 relative z-10" style={{ boxShadow: "0 -6px 16px rgba(0,0,0,0.10)" }}>
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
