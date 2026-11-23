export default function Header({ usuario, onLogout }: any) {
  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-sm border-b border-[#818b9d]/20 transition-all">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        
        {/* Logo Pitch Rater - Variação Light Mode */}
        <div className="flex items-center gap-1.5 font-sans font-black tracking-tight text-2xl select-none">
          <span className="text-[#161616]">Pitch</span>
          <span className="text-[#ff6002]">Rater</span>
        </div>

        {/* Botão Sair */}
        {usuario && (
          <button
            onClick={onLogout}
            className="text-sm font-bold text-[#ff6002] hover:text-[#dd4012] transition-colors cursor-pointer py-2 pl-4"
          >
            Sair
          </button>
        )}

      </div>
    </header>
  )
}