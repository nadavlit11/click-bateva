export function AppHeader() {
  return (
    <div className="p-6 border-b border-gray-100">
      <div className="flex items-center gap-3">
        <img src="/icon-192.png" alt="קליק בטבע" className="w-12 h-12 rounded-2xl object-contain shrink-0" />
        <div>
          <h1 className="text-2xl font-bold text-gray-800">קליק בטבע</h1>
          <p className="text-sm text-gray-500">גלה את ישראל</p>
        </div>
      </div>
    </div>
  );
}
