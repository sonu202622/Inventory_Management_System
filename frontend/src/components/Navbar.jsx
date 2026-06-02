export default function Navbar({ onToggleSidebar }) {
  return (
    <header className="flex h-16 items-center gap-4 border-b border-gray-200 bg-white px-4 lg:px-6">
      <button
        onClick={onToggleSidebar}
        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
        aria-label="Toggle sidebar"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <h1 className="text-xl font-bold text-indigo-700">Inventory Manager</h1>
    </header>
  );
}
