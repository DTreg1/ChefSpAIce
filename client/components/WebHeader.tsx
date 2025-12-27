import { useWebTheme } from "@/contexts/WebThemeContext";

export function WebHeader() {
  const { isDark, toggleTheme } = useWebTheme();

  return (
    <header className={`border-b ${isDark ? "bg-[#1A1F25] border-white/10" : "bg-white border-gray-200"}`}>
      <div className="container mx-auto py-4 px-4">
        <nav className="flex justify-between items-center">
          <a 
            href="/" 
            className="text-2xl font-bold text-[#27AE60]" 
            data-testid="link-home"
          >
            ChefSpAIce
          </a>
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg transition-colors ${
              isDark 
                ? "bg-white/10 hover:bg-white/20 text-white" 
                : "bg-gray-100 hover:bg-gray-200 text-gray-800"
            }`}
            data-testid="button-theme-toggle"
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>
        </nav>
      </div>
    </header>
  );
}
