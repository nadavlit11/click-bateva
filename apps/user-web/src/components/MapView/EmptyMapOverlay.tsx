export function EmptyMapOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
      {/* Desktop: card then arrow on physical right (toward sidebar) */}
      <div className="hidden md:flex items-center gap-6" style={{ direction: "ltr" }}>
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl px-8 py-6 shadow-lg text-center max-w-xs" style={{ direction: "rtl" }}>
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
          <p className="text-gray-500 text-sm mt-1">
            בחרו מהתפריט בצד
          </p>
        </div>
        <svg
          className="w-20 h-20 text-green-500 animate-bounce-x"
          fill="currentColor"
          viewBox="0 0 24 24"
          style={{ filter: "drop-shadow(0 4px 12px rgba(34,197,94,0.4))" }}
        >
          <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
        </svg>
      </div>

      {/* Mobile: card + large arrow below (pointing down toward bottom sheet) */}
      <div className="md:hidden flex flex-col items-center">
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
          <p className="text-gray-500 text-sm mt-1">
            בחרו מהתפריט למטה
          </p>
        </div>
        <svg
          className="w-20 h-20 text-green-500 animate-bounce mt-3"
          fill="currentColor"
          viewBox="0 0 24 24"
          style={{ filter: "drop-shadow(0 4px 12px rgba(34,197,94,0.4))" }}
        >
          <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
        </svg>
      </div>

      <style>{`
        @keyframes bounce-x {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(16px); }
        }
        .animate-bounce-x {
          animation: bounce-x 0.8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
