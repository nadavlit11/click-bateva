export function EmptyMapOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
      <div className="flex flex-col items-center">
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

        {/* Desktop arrow — points right (toward sidebar in RTL) */}
        <div className="hidden md:flex justify-end w-full mt-2 pe-4">
          <svg
            className="w-8 h-8 text-green-600 animate-bounce-x"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>

        {/* Mobile arrow — points down (toward bottom sheet) */}
        <div className="md:hidden mt-2">
          <svg
            className="w-8 h-8 text-green-600 animate-bounce"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>

      <style>{`
        @keyframes bounce-x {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(8px); }
        }
        .animate-bounce-x {
          animation: bounce-x 1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
