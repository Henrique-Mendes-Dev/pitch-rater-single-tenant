'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'

interface EquipeCategoria {
  categoria: string
  descricao: string
  equipe: string
}

export default function TelaoCategorias() {
  const [step, setStep] = useState(0)
  const [reveal, setReveal] = useState(false)
  const [vencedores, setVencedores] = useState<EquipeCategoria[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  
  const audioRef = useRef<HTMLAudioElement>(null)

  const maxSteps = vencedores.length > 0 ? vencedores.length + 1 : 6

  const processarVencedoresPorCategoria = useCallback((dados: any[]) => {
    const premiadas = new Set<string>()
    const categoriasFinais: EquipeCategoria[] = []

    // 1. A "Melhor Equipe" deve ser isolada primeiro
    const melhorEquipeGeral = dados.length > 0 ? dados[0].equipe : '-'
    if (melhorEquipeGeral !== '-') premiadas.add(melhorEquipeGeral)

    // 2. Extrai os destaques das outras categorias garantindo que não haja repetição
    const extrairVencedor = (chaveNota: string, tituloCat: string, descCat: string) => {
      let equipeClassificada = '-'
      let maiorNota = -1

      dados.forEach(row => {
        const nota = Number(row[chaveNota] || 0)
        if (!premiadas.has(row.equipe) && nota > maiorNota) {
          maiorNota = nota
          equipeClassificada = row.equipe
        }
      })

      if (equipeClassificada !== '-') premiadas.add(equipeClassificada)
      
      categoriasFinais.push({
        categoria: tituloCat,
        descricao: descCat,
        equipe: equipeClassificada
      })
    }

    // Ordem exata de revelação (Melhor Equipe no final)
    extrairVencedor('media_inovacao', 'SOLUÇÃO MAIS INOVADORA', "A ideia mais original e 'fora da caixa'.")
    extrairVencedor('media_problema', 'MAIOR IMPACTO (PROBLEMA)', 'Maior potencial de transformação e relevância.')
    extrairVencedor('media_pitch', 'MELHOR APRESENTAÇÃO (PITCH)', "Soube 'vender' a ideia com clareza e convencimento.")
    extrairVencedor('media_execucao', 'EXECUÇÃO TÉCNICA', 'A solução mais bem estruturada e robusta.')

    // 3. Adiciona a "Melhor Equipe" como o último slide de destaque
    categoriasFinais.push({
      categoria: 'MELHOR EQUIPE',
      descricao: 'Reconhecimento máximo da equipe pelo desempenho total.',
      equipe: melhorEquipeGeral
    })

    setVencedores(categoriasFinais)
  }, [])

  const carregarDados = useCallback(async () => {
    setLoading(true)
    setErro('')
    try {
      const { data, error } = await supabase
        .from('vw_ranking_consolidado')
        .select('equipe, media_final, media_inovacao, media_problema, media_pitch, media_execucao')
        .order('media_final', { ascending: false })

      if (error) throw error
      processarVencedoresPorCategoria(data || [])
    } catch (err: any) {
      console.error('Erro ao carregar ranking:', err)
      setErro(err?.message || 'Não foi possível carregar os resultados.')
    } finally {
      setLoading(false)
    }
  }, [processarVencedoresPorCategoria])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  const avancar = useCallback(() => {
    if (step > 0 && step < maxSteps && !reveal) {
      setReveal(true)
      if (audioRef.current) {
        audioRef.current.currentTime = 0
        audioRef.current.play().catch(() => {})
      }
    } else if (step < maxSteps) {
      setStep(prev => prev + 1)
      setReveal(false)
    }
  }, [step, maxSteps, reveal])

  const voltar = useCallback(() => {
    if (step > 0 && step < maxSteps && reveal) {
      setReveal(false)
    } else if (step > 0) {
      setStep(prev => prev - 1)
      setReveal(false)
    }
  }, [step, maxSteps, reveal])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      avancar()
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      voltar()
    }
  }, [avancar, voltar])

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
        <p className="text-sm font-bold text-[#818b9d] tracking-wider uppercase">Carregando resultados...</p>
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
    <div
      onClick={avancar}
      className="fixed inset-0 z-[9999] w-full h-[100dvh] bg-[#161616] text-[#fffeee] flex flex-col items-center justify-center overflow-hidden font-sans select-none cursor-pointer"
    >
      {/* Elemento de áudio oculto para o aplauso real */}
      <audio ref={audioRef} src="/aplausos.mp3" preload="auto" />

      {/* Estilo para o feixe de luz cinematográfico */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-150%) skewX(-15deg); }
          100% { transform: translateX(200%) skewX(-15deg); }
        }
        .animate-shimmer {
          animation: shimmer 2.5s ease-in-out infinite;
        }
      `}</style>

      {/* Controles de Navegação */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-5 right-5 z-50 flex items-center gap-3 opacity-90 sm:opacity-30 sm:hover:opacity-100 transition-opacity"
      >
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
          disabled={step === maxSteps}
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

      {/* Barra de Progresso Superior */}
      <div className="absolute top-0 left-0 h-1.5 bg-[#3f3f3f] w-full z-50">
        <div
          className="h-full bg-[#ff6002] transition-all duration-700 ease-out"
          style={{ width: `${(step / maxSteps) * 100}%` }}
        />
      </div>

      <div className="w-full max-w-7xl mx-auto px-5 sm:px-8 relative flex flex-col items-center justify-center min-h-[70vh]">
        
        {/* ================= STEP 0: ABERTURA ================= */}
        {step === 0 && (
          <div className="text-center flex flex-col items-center justify-center w-full h-full relative">
            <div className="relative z-10 flex flex-col items-center">
              <p className="text-[#ff6002] font-black tracking-[0.2em] sm:tracking-[0.3em] uppercase text-sm sm:text-xl md:text-2xl mb-4 sm:mb-6">
                Reconhecimento Especial
              </p>
              <h1 className="text-5xl sm:text-6xl md:text-8xl font-black text-white tracking-tighter mb-6 sm:mb-8 leading-tight text-center">
                Destaques por<br />Categoria
              </h1>
              <div className="h-1 w-20 sm:w-24 bg-[#ff6002] rounded-full mb-6 sm:mb-8"></div>
              <p className="text-[#818b9d] text-lg sm:text-2xl md:text-3xl font-medium tracking-wide text-center max-w-2xl">
                Celebrando as competências e as soluções geradas.
              </p>
              <p className="text-xs text-[#818b9d]/70 mt-10 uppercase tracking-widest">
                Toque na tela ou pressione Espaço para iniciar
              </p>
            </div>
          </div>
        )}

        {/* ================= STEPS 1 a 5: REVELAÇÃO DAS CATEGORIAS ================= */}
        {step > 0 && step < maxSteps && vencedores[step - 1] && (
          <div className="text-center w-full flex flex-col items-center z-10 relative">
            
            <div className="mb-8 sm:mb-12 px-2">
              <span className="text-[#ff6002] text-sm sm:text-xl font-bold uppercase tracking-widest mb-3 sm:mb-4 block">
                DESTAQUE NA CATEGORIA
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-6xl font-black text-white tracking-tight mb-3 sm:mb-4 leading-tight">
                {vencedores[step - 1].categoria}
              </h2>
              <p className="text-sm sm:text-xl text-[#818b9d] font-medium max-w-2xl mx-auto">
                {vencedores[step - 1].descricao}
              </p>
            </div>

            <div className="w-full h-[220px] sm:h-[300px] flex items-center justify-center mt-2 sm:mt-4">
              {!reveal ? (
                // Cartão de Suspense
                <div className="w-full max-w-4xl h-full bg-[#1a1a1a] border border-[#3f3f3f]/50 rounded-3xl sm:rounded-[3rem] shadow-2xl flex flex-col items-center justify-center p-6 relative overflow-hidden transition-all duration-500">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-[#3f3f3f] border-t-[#ff6002] rounded-full animate-spin mb-4"></div>
                  <p className="text-[#818b9d] font-bold tracking-[0.15em] sm:tracking-[0.2em] uppercase text-xs sm:text-sm">
                    E O DESTAQUE VAI PARA...
                  </p>
                </div>
              ) : (
                // Cartão Revelado (Sem Exibição de Notas)
                <div className="w-full">
                  <div className="w-full max-w-4xl h-[220px] sm:h-[300px] bg-gradient-to-br from-[#fffeee] to-white rounded-3xl sm:rounded-[3rem] p-6 sm:p-12 shadow-2xl flex flex-col items-center justify-center transition-all duration-700 relative overflow-hidden mx-auto">
                    
                    {/* Linha de topo laranja */}
                    <div className="absolute top-0 w-full h-2.5 sm:h-3 bg-[#ff6002] z-10"></div>
                    
                    {/* Feixe de Luz Cinematográfico */}
                    <div className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-[#ff6002]/10 to-transparent animate-shimmer pointer-events-none"></div>
                    
                    {/* Nome da Equipe Revelada */}
                    <h3 className="text-3xl sm:text-5xl md:text-7xl font-black text-[#161616] tracking-tighter break-words text-balance leading-tight w-full px-2 sm:px-4 relative z-10" title={vencedores[step - 1].equipe}>
                      {vencedores[step - 1].equipe}
                    </h3>
                    
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ================= STEP FINAL: ENCERRAMENTO ================= */}
        {step === maxSteps && (
          <div className="text-center flex flex-col items-center z-10 relative px-4">
            <h2 className="text-4xl sm:text-6xl md:text-8xl font-black text-white tracking-tight mb-6 sm:mb-8">
              Parabéns a todos!
            </h2>
            <div className="h-1 w-20 sm:w-24 bg-[#ff6002] rounded-full mb-6 sm:mb-8"></div>
            <p className="text-lg sm:text-2xl md:text-3xl text-[#818b9d] font-medium max-w-4xl leading-relaxed">
              O maior resultado de hoje é o conhecimento gerado e as soluções criadas em conjunto.
            </p>
          </div>
        )}

      </div>

      {/* Chancela Pitch Rater no Rodapé */}
      <div className="absolute bottom-6 sm:bottom-8 flex items-center gap-2 opacity-60 z-0">
        <span className="text-xs font-medium text-[#818b9d] tracking-widest uppercase">Powered by</span>
        <div className="flex items-center gap-1 font-sans font-black tracking-tighter text-base sm:text-lg">
          <span className="text-[#fffeee]">Pitch</span>
          <span className="text-[#ff6002]">Rater</span>
        </div>
      </div>

    </div>
  )
}