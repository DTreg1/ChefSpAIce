import { useTheme } from "@/contexts/ThemeContext";

export function WebHeader() {
  const { isDark } = useTheme();

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
        </nav>
      </div>
    </header>
  );
}
