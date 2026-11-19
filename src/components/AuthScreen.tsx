import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface AuthScreenProps {
  onLogin: (user: any) => void
}

export default function AuthScreen({ onLogin }: AuthScreenProps) {
  const [identificador, setIdentificador] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const isAdminFlow = identificador.trim().toUpperCase() === 'ADM-CESAR'

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!identificador.trim()) return

    setLoading(true)
    setErro('')

    if (isAdminFlow) {
      if (senha.trim() === 'SenhaSegura@2026') {
        onLogin({ id: 'admin', nome: 'Organização', cargo: 'admin' })
        return
      } else {
        setErro('Senha de administrador incorreta.')
        setLoading(false)
        return
      }
    }

    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('pin', identificador.trim())
        .eq('cargo', 'avaliador')
        .single()

      if (error || !data) {
        setErro('PIN inválido ou não encontrado.')
        setLoading(false)
        return
      }

      onLogin(data)
    } catch {
      setErro('Erro ao verificar o acesso. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center min-h-screen px-4 bg-[#fffeee] font-sans antialiased">
      
      <div className="w-full max-w-[560px] bg-white rounded-3xl overflow-hidden border border-[#818b9d]/30 shadow-sm">
        
        {/* Cabeçalho Escuro CESAR - Logotipo Oficial */}
        <div className="h-44 sm:h-52 bg-[#161616] flex flex-col items-center justify-center relative">
          <div className="flex items-center gap-2 select-none font-sans font-black tracking-tight text-5xl sm:text-6xl">
            <span className="text-[#fffeee]">Pitch</span>
            <span className="text-[#ff6002]">Rater</span>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-[3px] bg-[#ff6002]"></div>
        </div>

        {/* Formulário */}
        <div className="p-8 sm:p-12 flex flex-col items-center bg-white">
          <div className="text-center mb-8 w-full">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#161616] mb-2">
              Acesso à Banca
            </h2>
            <p className="text-[#3f3f3f] text-sm font-medium">
              Insira o PIN fornecido pela organização
            </p>
          </div>

          <form onSubmit={handleLogin} className="w-full max-w-[380px] space-y-4">
            <div>
              <input
                type="text"
                required
                value={identificador}
                onChange={(e) => setIdentificador(e.target.value)}
                placeholder="Ex: 1001"
                className="w-full px-5 py-4 text-center text-sm font-bold text-[#161616] bg-[#fffeee] border-2 border-[#818b9d]/30 rounded-xl outline-none focus:border-[#ff6002] transition-colors placeholder:text-[#818b9d] placeholder:font-normal"
                autoComplete="off"
              />
            </div>

            {isAdminFlow && (
              <div className="animate-in fade-in duration-200">
                <input
                  type="password"
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Senha de Administrador"
                  className="w-full px-5 py-4 text-center text-base tracking-widest font-bold text-[#161616] bg-[#fffeee] border-2 border-[#818b9d]/30 rounded-xl outline-none focus:border-[#ff6002] transition-colors placeholder:text-[#818b9d] placeholder:font-normal placeholder:tracking-normal"
                />
              </div>
            )}

            {erro && (
              <div className="text-center text-red-600 text-xs sm:text-sm font-bold px-4 py-3 bg-red-50 rounded-xl border border-red-200">
                {erro}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#ff6002] hover:bg-[#dd4012] text-white px-6 py-4 rounded-xl text-base font-bold transition-colors flex items-center justify-center cursor-pointer mt-2"
            >
              {loading ? (
                <svg className="w-5 h-5 animate-spin text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
              ) : (
                isAdminFlow ? 'Acessar Painel' : 'Acessar Avaliação'
              )}
            </button>
          </form>
        </div>
      </div>
      
    </div>
  )
}