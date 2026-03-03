export function EmptyMapOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl px-8 py-6 shadow-lg text-center max-w-xs">
        <svg
          className="w-12 h-12 mx-auto mb-3 text-green-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
          />
        </svg>
        <p className="text-gray-800 font-semibold text-lg leading-relaxed">
          בחרו קטגוריות כדי לגלות מקומות
        </p>
        <p className="text-gray-500 text-sm mt-1 hidden md:block">
          בחרו מהתפריט בצד
        </p>
        <p className="text-gray-500 text-sm mt-1 md:hidden">
          בחרו מהתפריט למטה
        </p>
      </div>
    </div>
  );
}
