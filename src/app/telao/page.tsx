'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface RankingItem {
  equipe: string
  media: number
}

const formatarNota = (nota: number) => {
  return Number(nota.toFixed(2)).toString()
}

const Confetti = () => {
  const colors = ['#ff6002', '#fffeee', '#818b9d', '#dd4012']
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {Array.from({ length: 150 }).map((_, i) => (
        <div
          key={i}
          className="absolute top-0 w-3 h-3 rounded-sm opacity-0"
          style={{
            left: `${Math.random() * 100}%`,
            backgroundColor: colors[Math.floor(Math.random() * colors.length)],
            animation: `fall ${Math.random() * 3 + 2}s linear forwards`,
            animationDelay: `${Math.random() * 1.5}s`
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
  
  const [step, setStep] = useState(0)
  const TOTAL_STEPS = 3

  const carregarDados = async () => {
    try {
      const { data, error } = await supabase
        .from('vw_ranking_consolidado')
        .select('*')
        .order('media_final', { ascending: false })

      if (error) throw error

      if (data) {
        const topRanking = data.map(row => ({
          equipe: row.equipe,
          media: Number(row.media_final || 0),
        }))
        setRanking(topRanking)
      }
    } catch (err) {
      console.error('Erro ao carregar dados do pódio:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
      setStep(prev => Math.min(prev + 1, TOTAL_STEPS))
    } else if (e.key === 'ArrowLeft') {
      setStep(prev => Math.max(prev - 1, 0))
    }
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.log(err))
    } else {
      document.exitFullscreen()
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#161616] flex items-center justify-center font-sans">
        <svg className="w-12 h-12 animate-spin text-[#ff6002]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[9999] w-screen h-screen bg-[#161616] text-[#fffeee] font-sans overflow-hidden relative select-none flex flex-col items-center justify-center">
      
      {step >= 3 && <Confetti />}

      <div className="absolute bottom-6 right-6 z-50 flex gap-4 opacity-10 hover:opacity-100 transition-opacity">
        <button onClick={() => setStep(prev => Math.max(prev - 1, 0))} className="p-3 bg-[#3f3f3f] rounded-full hover:bg-[#ff6002] transition-colors cursor-pointer">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <button onClick={() => setStep(prev => Math.min(prev + 1, TOTAL_STEPS))} className="p-3 bg-[#3f3f3f] rounded-full hover:bg-[#ff6002] transition-colors cursor-pointer">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
        </button>
        <button onClick={toggleFullScreen} className="p-3 bg-[#3f3f3f] rounded-full hover:bg-[#ff6002] transition-colors cursor-pointer ml-4">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
        </button>
      </div>

      <div className="absolute top-0 left-0 h-1.5 bg-[#3f3f3f] w-full z-50">
        <div
          className="h-full bg-[#ff6002] transition-all duration-1000 ease-out"
          style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
        />
      </div>

      {step === 0 && (
        <div className="text-center animate-in zoom-in duration-700 fade-in flex flex-col items-center justify-center w-full h-full relative">
          <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
            <div className="w-[600px] h-[600px] bg-[#ff6002] blur-[150px] rounded-full animate-pulse"></div>
          </div>
          <div className="relative z-10 flex flex-col items-center">
            <p className="text-[#ff6002] font-black tracking-[0.3em] uppercase text-xl md:text-2xl mb-6">
              O Momento Mais Esperado
            </p>
            <h1 className="text-7xl md:text-9xl font-black text-white tracking-tighter mb-8 leading-tight drop-shadow-2xl">
              Cerimônia de<br/>Premiação
            </h1>
            <div className="h-1 w-24 bg-[#ff6002] rounded-full mb-8"></div>
            <p className="text-[#818b9d] text-2xl md:text-3xl font-medium tracking-wide">
              Conheça os grandes vencedores.
            </p>
          </div>
          <div className="absolute bottom-12 flex items-center gap-2 opacity-50">
            <span className="text-sm font-medium text-[#818b9d] tracking-widest uppercase">Powered by</span>
            <div className="flex items-center gap-1 font-sans font-black tracking-tighter text-xl">
              <span className="text-[#fffeee]">Pitch</span>
              <span className="text-[#ff6002]">Rater</span>
            </div>
          </div>
        </div>
      )}

      {step >= 1 && (
        <div className="w-full max-w-7xl px-8 flex flex-col items-center h-full justify-center pt-20 relative z-10">
          <div className="absolute top-12 text-center animate-in fade-in duration-1000 slide-in-from-top-10">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-2">
              Pódio Oficial
            </h2>
            {step >= 3 && (
              <p className="text-[#ff6002] font-bold tracking-widest uppercase animate-pulse">
                Grande Campeão Revelado!
              </p>
            )}
          </div>

          <div className="flex items-end justify-center w-full gap-4 md:gap-8 h-[50vh] md:h-[60vh]">
            {/* 2º Lugar */}
            <div className={`w-1/3 flex flex-col items-center justify-end transition-all duration-1000 ease-out transform ${step >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-32'}`}>
              <div className="text-center mb-6 w-full px-2">
                <h3 className="text-2xl md:text-3xl lg:text-4xl font-black text-white break-words text-balance w-full">
                  {ranking[1]?.equipe || '-'}
                </h3>
                <p className="text-[#818b9d] text-lg font-bold mt-2">{formatarNota(ranking[1]?.media)} pts</p>
              </div>
              <div className="w-full h-[60%] bg-gradient-to-t from-[#3f3f3f] to-[#161616] border-t-4 border-l-4 border-r-4 border-[#3f3f3f] rounded-t-3xl flex items-start justify-center pt-8 shadow-2xl relative overflow-hidden">
                <span className="text-6xl font-black text-[#818b9d]">2º</span>
              </div>
            </div>

            {/* 1º Lugar */}
            <div className={`w-1/3 flex flex-col items-center justify-end z-20 transition-all duration-1000 ease-out transform ${step >= 3 ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-32'}`}>
              <div className="text-center mb-8 w-full px-2 relative">
                {step >= 3 && (
                  <div className="absolute -top-16 left-1/2 -translate-x-1/2 animate-bounce">
                    <svg className="w-12 h-12 text-[#ff6002]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  </div>
                )}
                <h3 className="text-3xl md:text-5xl lg:text-6xl font-black text-[#ff6002] break-words text-balance w-full tracking-tight">
                  {ranking[0]?.equipe || '-'}
                </h3>
                <p className="text-white text-2xl font-bold mt-2">{formatarNota(ranking[0]?.media)} pts</p>
              </div>
              <div className="w-full h-[100%] bg-gradient-to-t from-[#dd4012] to-[#ff6002] rounded-t-[3rem] flex items-start justify-center pt-10 shadow-[0_0_80px_rgba(255,96,2,0.3)] relative overflow-hidden">
                <span className="text-8xl font-black text-white drop-shadow-lg z-10">1º</span>
              </div>
            </div>

            {/* 3º Lugar */}
            <div className={`w-1/3 flex flex-col items-center justify-end transition-all duration-1000 ease-out transform ${step >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-32'}`}>
              <div className="text-center mb-4 w-full px-2">
                <h3 className="text-xl md:text-2xl lg:text-3xl font-black text-white break-words text-balance w-full">
                  {ranking[2]?.equipe || '-'}
                </h3>
                <p className="text-[#818b9d] text-md font-bold mt-2">{formatarNota(ranking[2]?.media)} pts</p>
              </div>
              <div className="w-full h-[45%] bg-gradient-to-t from-[#161616] to-[#2a2a2a] border-t-2 border-l-2 border-r-2 border-[#3f3f3f] rounded-t-2xl flex items-start justify-center pt-6 shadow-xl relative overflow-hidden">
                <span className="text-5xl font-black text-[#3f3f3f]">3º</span>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}