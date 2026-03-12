export function EmptyMapOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-10 pointer-events-auto cursor-pointer" onClick={onClose}>
      {/* Desktop: 3-column layout — [spacer] [card at center] [arrow centered in remaining space] */}
      <div className="hidden md:flex items-center absolute inset-0" style={{ direction: "ltr" }}>
        {/* Left spacer — same width as right half so card stays centered */}
        <div className="flex-1" />
        {/* Card */}
        <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl px-8 py-6 shadow-lg text-center max-w-xs cursor-default" style={{ direction: "rtl" }} onClick={e => e.stopPropagation()}>
          <button onClick={onClose} className="absolute top-2 start-2 w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
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
        {/* Right half — arrow centered within this space */}
        <div className="flex-1 flex items-center justify-center">
          <svg
            className="w-20 h-20 animate-bounce-x"
            fill="none"
            viewBox="0 0 24 24"
            style={{ filter: "drop-shadow(0 4px 12px rgba(34,197,94,0.4))" }}
          >
            <path stroke="black" strokeLinecap="round" strokeLinejoin="round" strokeWidth={5} d="M4 12h12m0 0l-5-5m5 5l-5 5" />
            <path stroke="#22c55e" strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 12h12m0 0l-5-5m5 5l-5 5" />
          </svg>
        </div>
      </div>

      {/* Mobile: card centered (arrow rendered directly below the menu button in App.tsx) */}
      <div className="md:hidden absolute inset-0">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl px-8 py-6 shadow-lg text-center max-w-xs cursor-default" onClick={e => e.stopPropagation()}>
            <button onClick={onClose} className="absolute top-2 start-2 w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
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
              לחצו על הכפתור למעלה
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce-x {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(24px); }
        }
        .animate-bounce-x {
          animation: bounce-x 0.8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
