'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'

interface RankingItem {
  equipe: string
  media: number
}

const formatarNota = (nota?: number) => {
  if (nota === undefined || nota === null || Number.isNaN(nota)) return '0'
  return Number(nota.toFixed(2)).toString()
}

const Confetti = () => {
  const pieces = useMemo(() => {
    const colors = ['#ff6002', '#fffeee', '#818b9d', '#dd4012']
    return Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      color: colors[i % colors.length],
      duration: `${Math.random() * 2.5 + 2}s`,
      delay: `${Math.random() * 1.2}s`
    }))
  }, [])

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute top-0 w-2.5 h-2.5 rounded-sm opacity-0"
          style={{
            left: p.left,
            backgroundColor: p.color,
            animation: `fall ${p.duration} linear forwards`,
            animationDelay: p.delay
          }}
        />
      ))}
      <style>{`
        @keyframes fall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

export default function StageModePodium() {
  const [ranking, setRanking] = useState<RankingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  const [step, setStep] = useState(0)
  const TOTAL_STEPS = 3

  const carregarDados = useCallback(async () => {
    setLoading(true)
    setErro('')
    try {
      const { data, error } = await supabase
        .from('vw_ranking_consolidado')
        .select('equipe, media_final')
        .order('media_final', { ascending: false })

      if (error) throw error

      if (data) {
        setRanking(
          data.map((row) => ({
            equipe: row.equipe,
            media: Number(row.media_final || 0),
          }))
        )
      }
    } catch (err: any) {
      console.error('Erro ao carregar dados do pódio:', err)
      setErro(err?.message || 'Não foi possível carregar o ranking.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  const avancar = useCallback(() => {
    setStep((prev) => Math.min(prev + 1, TOTAL_STEPS))
  }, [])

  const voltar = useCallback(() => {
    setStep((prev) => Math.max(prev - 1, 0))
  }, [])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        avancar()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        voltar()
      }
    },
    [avancar, voltar]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#161616] flex flex-col items-center justify-center gap-4 font-sans">
        <svg className="w-12 h-12 animate-spin text-[#ff6002]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <p className="text-sm font-bold text-[#818b9d] tracking-wider uppercase">Carregando Pódio...</p>
      </div>
    )
  }

  if (erro) {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#161616] text-[#fffeee] flex flex-col items-center justify-center p-6 text-center font-sans">
        <p className="text-[#ff6002] font-bold text-lg mb-2">Erro ao carregar resultados</p>
        <p className="text-sm text-[#818b9d] mb-6 max-w-md">{erro}</p>
        <button
          onClick={carregarDados}
          className="px-6 py-3 bg-[#ff6002] hover:bg-[#dd4012] text-white font-bold rounded-xl transition-colors cursor-pointer"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[9999] w-full h-[100dvh] bg-[#161616] text-[#fffeee] font-sans overflow-hidden select-none flex flex-col items-center justify-center">
      
      {step >= 3 && <Confetti />}

      {/* Controles de Navegação */}
      <div className="absolute bottom-5 right-5 z-50 flex items-center gap-3 opacity-90 sm:opacity-30 sm:hover:opacity-100 transition-opacity">
        <button
          onClick={voltar}
          disabled={step === 0}
          aria-label="Voltar"
          className="p-3 bg-[#3f3f3f] rounded-full hover:bg-[#ff6002] disabled:opacity-30 transition-colors cursor-pointer"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={avancar}
          disabled={step === TOTAL_STEPS}
          aria-label="Avançar"
          className="p-3 bg-[#ff6002] sm:bg-[#3f3f3f] rounded-full hover:bg-[#ff6002] disabled:opacity-30 transition-colors cursor-pointer"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <button
          onClick={toggleFullScreen}
          aria-label="Tela cheia"
          className="hidden sm:flex p-3 bg-[#3f3f3f] rounded-full hover:bg-[#ff6002] transition-colors cursor-pointer ml-2"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
      </div>

      {/* Barra de Progresso */}
      <div className="absolute top-0 left-0 h-1.5 bg-[#3f3f3f] w-full z-50">
        <div
          className="h-full bg-[#ff6002] transition-all duration-700 ease-out"
          style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
        />
      </div>

      {/* Tela Inicial (Step 0) */}
      {step === 0 && (
        <div
          onClick={avancar}
          className="text-center px-6 flex flex-col items-center justify-center w-full h-full relative cursor-pointer"
        >
          <div className="relative z-10 flex flex-col items-center">
            <p className="text-[#ff6002] font-black tracking-[0.2em] sm:tracking-[0.3em] uppercase text-sm sm:text-xl md:text-2xl mb-4 sm:mb-6">
              O Momento Mais Esperado
            </p>
            <h1 className="text-5xl sm:text-7xl md:text-9xl font-black text-white tracking-tighter mb-6 sm:mb-8 leading-tight">
              Cerimônia de<br />Premiação
            </h1>
            <div className="h-1 w-20 sm:w-24 bg-[#ff6002] rounded-full mb-6 sm:mb-8"></div>
            <p className="text-[#818b9d] text-lg sm:text-2xl md:text-3xl font-medium tracking-wide">
              Conheça os grandes vencedores.
            </p>
            <p className="text-xs text-[#818b9d]/70 mt-10 uppercase tracking-widest">
              Toque na tela ou pressione Espaço para iniciar
            </p>
          </div>
          <div className="absolute bottom-8 sm:bottom-12 flex items-center gap-2 opacity-60">
            <span className="text-xs sm:text-sm font-medium text-[#818b9d] tracking-widest uppercase">Powered by</span>
            <div className="flex items-center gap-1 font-sans font-black tracking-tighter text-lg sm:text-xl">
              <span className="text-[#fffeee]">Pitch</span>
              <span className="text-[#ff6002]">Rater</span>
            </div>
          </div>
        </div>
      )}

      {/* Pódio (Steps 1 a 3) */}
      {step >= 1 && (
        <div
          onClick={avancar}
          className="w-full max-w-7xl px-4 sm:px-8 flex flex-col items-center h-full justify-center pt-16 sm:pt-20 relative z-10 cursor-pointer"
        >
          <div className="absolute top-8 sm:top-12 text-center px-4">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white mb-2">
              Pódio Oficial
            </h2>
            {step >= 3 && (
              <p className="text-xs sm:text-base text-[#ff6002] font-bold tracking-widest uppercase">
                Grande Campeão Revelado!
              </p>
            )}
          </div>

          <div className="flex items-end justify-center w-full gap-2 sm:gap-4 md:gap-8 h-[52vh] sm:h-[60vh]">
            {/* 2º Lugar */}
            <div className={`w-1/3 flex flex-col items-center justify-end h-full transition-all duration-700 ease-out transform ${step >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-24'}`}>
              <div className="text-center mb-3 sm:mb-6 w-full px-1 sm:px-2">
                <h3 className="text-base sm:text-2xl md:text-3xl lg:text-4xl font-black text-white break-words w-full leading-tight">
                  {ranking[1]?.equipe || '-'}
                </h3>
                <p className="text-[#818b9d] text-xs sm:text-lg font-bold mt-1 sm:mt-2">{formatarNota(ranking[1]?.media)} pts</p>
              </div>
              <div className="w-full h-[55%] sm:h-[60%] bg-gradient-to-t from-[#3f3f3f] to-[#161616] border-t-4 border-l-4 border-r-4 border-[#3f3f3f] rounded-t-2xl sm:rounded-t-3xl flex items-start justify-center pt-4 sm:pt-8 shadow-2xl">
                <span className="text-3xl sm:text-6xl font-black text-[#818b9d]">2º</span>
              </div>
            </div>

            {/* 1º Lugar */}
            <div className={`w-1/3 flex flex-col items-center justify-end h-full z-20 transition-all duration-700 ease-out transform ${step >= 3 ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-24'}`}>
              <div className="text-center mb-4 sm:mb-8 w-full px-1 sm:px-2 relative">
                {step >= 3 && (
                  <div className="flex justify-center mb-2">
                    <svg className="w-7 h-7 sm:w-12 sm:h-12 text-[#ff6002]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </div>
                )}
                <h3 className="text-lg sm:text-3xl md:text-5xl lg:text-6xl font-black text-[#ff6002] break-words w-full tracking-tight leading-tight">
                  {ranking[0]?.equipe || '-'}
                </h3>
                <p className="text-white text-sm sm:text-2xl font-bold mt-1 sm:mt-2">{formatarNota(ranking[0]?.media)} pts</p>
              </div>
              <div className="w-full h-[78%] sm:h-[85%] bg-gradient-to-t from-[#dd4012] to-[#ff6002] rounded-t-2xl sm:rounded-t-[3rem] flex items-start justify-center pt-5 sm:pt-10 shadow-2xl">
                <span className="text-4xl sm:text-8xl font-black text-white drop-shadow-lg z-10">1º</span>
              </div>
            </div>

            {/* 3º Lugar */}
            <div className={`w-1/3 flex flex-col items-center justify-end h-full transition-all duration-700 ease-out transform ${step >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-24'}`}>
              <div className="text-center mb-3 sm:mb-4 w-full px-1 sm:px-2">
                <h3 className="text-sm sm:text-xl md:text-2xl lg:text-3xl font-black text-white break-words w-full leading-tight">
                  {ranking[2]?.equipe || '-'}
                </h3>
                <p className="text-[#818b9d] text-xs sm:text-base font-bold mt-1 sm:mt-2">{formatarNota(ranking[2]?.media)} pts</p>
              </div>
              <div className="w-full h-[40%] sm:h-[45%] bg-gradient-to-t from-[#161616] to-[#2a2a2a] border-t-2 border-l-2 border-r-2 border-[#3f3f3f] rounded-t-xl sm:rounded-t-2xl flex items-start justify-center pt-4 sm:pt-6 shadow-xl">
                <span className="text-2xl sm:text-5xl font-black text-[#818b9d]">3º</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}