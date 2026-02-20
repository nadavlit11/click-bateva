interface SearchBarProps {
  value: string;
  onChange: (q: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="p-4">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="חפש מקום..."
          className="w-full py-3 px-4 ps-12 bg-gray-50 border-2 border-gray-100 rounded-2xl text-gray-700 placeholder-gray-400 focus:outline-none focus:border-green-400 focus:bg-white transition-all"
        />
        <svg
          className="w-5 h-5 text-gray-400 absolute start-4 top-1/2 -translate-y-1/2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
    </div>
  );
}
