'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface AuthScreenProps {
  onLogin: (user: any) => void
}

export default function AuthScreen({ onLogin }: AuthScreenProps) {
  const [identificador, setIdentificador] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  
  // Defesas contra Força Bruta
  const [tentativas, setTentativas] = useState(0)
  const [lockoutTimer, setLockoutTimer] = useState(0)

  // Cronômetro do Lockout
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (lockoutTimer > 0) {
      timer = setTimeout(() => setLockoutTimer(lockoutTimer - 1), 1000)
    } else if (lockoutTimer === 0 && tentativas >= 3) {
      setTentativas(0)
      setErro('')
    }
    return () => clearTimeout(timer)
  }, [lockoutTimer, tentativas])

  const cleanId = identificador.trim()
  const isAdminFlow = cleanId.toUpperCase() === 'ADM-CESAR'

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cleanId || lockoutTimer > 0) return

    setLoading(true)
    setErro('')

    // 1. Sanitização Avançada de Input (apenas letras, números e hífen)
    const identificadorSanitizado = cleanId.replace(/[^a-zA-Z0-9-]/g, '')

    // Fluxo Admin (Agora usando Supabase Auth real)
    if (isAdminFlow) {
      // IMPORTANTE: Substitua pelo e-mail real do administrador cadastrado no painel do Supabase
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@pitchrater.com' 
      
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: adminEmail,
        password: senha
      })

      if (authError || !authData.user) {
        registrarFalha('Credenciais de administrador incorretas.')
        return
      }

      setTentativas(0)
      // Mapeia o usuário autenticado para o formato esperado pelo front-end
      onLogin({ 
        id: authData.user.id, 
        nome: 'Organização', 
        cargo: 'admin' 
      })
      return
    }

    // Fluxo Jurado (Acesso via PIN)
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('pin', identificadorSanitizado)
        .eq('cargo', 'avaliador')
        .single()

      if (error || !data) {
        registrarFalha('PIN inválido ou não encontrado.')
        return
      }

      setTentativas(0)
      onLogin(data)
    } catch {
      registrarFalha('Erro ao verificar o acesso. Tente novamente.')
    }
  }

  // Lógica de punição por erros sequenciais
  const registrarFalha = (mensagem: string) => {
    const novosErros = tentativas + 1
    setTentativas(novosErros)
    setLoading(false)

    if (novosErros >= 3) {
      setLockoutTimer(30)
      setErro('Muitas tentativas falhas. Aguarde 30 segundos.')
    } else {
      setErro(`${mensagem} (Tentativa ${novosErros}/3)`)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-start pt-8 pb-8 sm:justify-center sm:py-4 min-h-[100dvh] overflow-y-auto px-4 bg-[#fffeee] font-sans antialiased">
      
      <div className="w-full max-w-[560px] bg-white rounded-3xl overflow-hidden border border-[#818b9d]/30 shadow-sm shrink-0">
        
        {/* Cabeçalho Escuro CESAR - Logotipo Oficial */}
        <div className="h-36 sm:h-52 bg-[#161616] flex flex-col items-center justify-center relative">
          <div className="flex items-center gap-2 select-none font-sans font-black tracking-tight text-4xl sm:text-6xl">
            <span className="text-[#fffeee]">Pitch</span>
            <span className="text-[#ff6002]">Rater</span>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-[3px] bg-[#ff6002]"></div>
        </div>

        {/* Formulário */}
        <div className="p-6 sm:p-12 flex flex-col items-center bg-white">
          <div className="text-center mb-6 sm:mb-8 w-full">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#161616] mb-2">
              Acesso à Banca
            </h2>
            <p className="text-[#3f3f3f] text-sm font-medium">
              Insira o PIN fornecido pela organização
            </p>
          </div>

          <form onSubmit={handleLogin} className="w-full max-w-[380px] space-y-4" aria-label="Formulário de acesso à banca">
            <div>
              <label htmlFor="pin-input" className="sr-only">Insira o PIN fornecido pela organização</label>
              <input
                id="pin-input"
                type="text"
                required
                disabled={lockoutTimer > 0}
                value={identificador}
                onChange={(e) => setIdentificador(e.target.value)}
                placeholder="Ex: 1001"
                aria-invalid={!!erro && tentativas > 0}
                aria-describedby={erro ? "login-error" : undefined}
                className="w-full px-5 py-4 text-center text-base font-bold text-[#161616] bg-[#fffeee] border-2 border-[#818b9d]/30 rounded-xl outline-none focus:border-[#ff6002] transition-colors placeholder:text-[#818b9d] placeholder:font-normal disabled:opacity-50"
                autoComplete="off"
              />
            </div>

            {isAdminFlow && (
              <div className="animate-in fade-in duration-200">
                <label htmlFor="admin-password" className="sr-only">Senha de Administrador</label>
                <input
                  id="admin-password"
                  type="password"
                  required
                  disabled={lockoutTimer > 0}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Senha de Administrador"
                  className="w-full px-5 py-4 text-center text-base tracking-widest font-bold text-[#161616] bg-[#fffeee] border-2 border-[#818b9d]/30 rounded-xl outline-none focus:border-[#ff6002] transition-colors placeholder:text-[#818b9d] placeholder:font-normal placeholder:tracking-normal disabled:opacity-50"
                />
              </div>
            )}

            {erro && (
              <div id="login-error" aria-live="assertive" className="text-center text-red-600 text-xs sm:text-sm font-bold px-4 py-3 bg-red-50 rounded-xl border border-red-200">
                {erro}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || lockoutTimer > 0}
              aria-busy={loading}
              className={`w-full text-white px-6 py-4 rounded-xl text-base font-bold transition-colors flex items-center justify-center mt-2 ${
                lockoutTimer > 0 
                  ? 'bg-[#818b9d] cursor-not-allowed' 
                  : 'bg-[#ff6002] hover:bg-[#dd4012] cursor-pointer'
              }`}
            >
              {loading ? (
                <svg className="w-5 h-5 animate-spin text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
              ) : lockoutTimer > 0 ? (
                `Bloqueado (${lockoutTimer}s)`
              ) : isAdminFlow ? (
                'Acessar Painel'
              ) : (
                'Acessar Avaliação'
              )}
            </button>
          </form>
        </div>
      </div>
      
    </div>
  )
}