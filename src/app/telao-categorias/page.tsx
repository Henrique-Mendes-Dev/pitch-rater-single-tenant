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
  
  // Referência para o áudio de aplausos reais
  const audioRef = useRef<HTMLAudioElement>(null)

  // Total de passos agora é 6 (Abertura + 5 Categorias + Encerramento)
  const maxSteps = vencedores.length > 0 ? vencedores.length + 1 : 6

  useEffect(() => {
    carregarDados()
  }, [])

  const avancar = () => {
    if (step > 0 && step < maxSteps && !reveal) {
      setReveal(true)
      // Dispara o som de aplausos reais sincronizado com a revelação
      if (audioRef.current) {
        audioRef.current.currentTime = 0
        audioRef.current.play().catch(err => console.log("Áudio bloqueado pelo navegador", err))
      }
    } else {
      if (step < maxSteps) {
        setStep(prev => prev + 1)
        setReveal(false)
      }
    }
  }

  const voltar = () => {
    if (step > 0 && step < maxSteps && reveal) {
      setReveal(false)
    } else if (step > 0) {
      setStep(prev => prev - 1)
      setReveal(false)
    }
  }

  // Controles de Teclado (Clicker)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
      avancar()
    } else if (e.key === 'ArrowLeft') {
      voltar()
    }
  }, [step, reveal, vencedores, maxSteps])

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

  const carregarDados = async () => {
    try {
      const { data, error } = await supabase
        .from('vw_ranking_consolidado')
        .select('*')
        .order('media_final', { ascending: false })

      if (error) throw error
      processarVencedoresPorCategoria(data || [])
    } catch (err) {
      console.error('Erro ao carregar ranking:', err)
    } finally {
      setLoading(false)
    }
  }

  const processarVencedoresPorCategoria = (dados: any[]) => {
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

    // Adicionando na ordem exata de revelação (Deixando a Melhor Equipe para o final)
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
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#161616] flex items-center justify-center text-[#ff6002]">
        Carregando resultados...
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[9999] w-screen h-screen bg-[#161616] text-[#fffeee] flex flex-col items-center justify-center overflow-hidden font-sans select-none">
      
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

      {/* Controles discretos invisíveis para o mouse do operador */}
      <div className="absolute bottom-6 right-6 z-50 flex gap-4 opacity-10 hover:opacity-100 transition-opacity">
        <button onClick={voltar} className="p-3 bg-[#3f3f3f] rounded-full hover:bg-[#ff6002] transition-colors cursor-pointer">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <button onClick={avancar} className="p-3 bg-[#3f3f3f] rounded-full hover:bg-[#ff6002] transition-colors cursor-pointer">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
        </button>
        <button onClick={toggleFullScreen} className="p-3 bg-[#3f3f3f] rounded-full hover:bg-[#ff6002] transition-colors cursor-pointer ml-4">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
        </button>
      </div>

      {/* Barra de Progresso Superior */}
      <div className="absolute top-0 left-0 h-1.5 bg-[#3f3f3f] w-full z-50">
        <div
          className="h-full bg-[#ff6002] transition-all duration-1000 ease-out"
          style={{ width: `${(step / maxSteps) * 100}%` }}
        />
      </div>

      <div className="w-full max-w-7xl mx-auto px-8 relative flex flex-col items-center justify-center min-h-[70vh]">
        
        {/* ================= STEP 0: ABERTURA ================= */}
        {step === 0 && (
          <div className="text-center animate-in zoom-in duration-1000 fade-in flex flex-col items-center justify-center w-full h-full relative">
            <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
              <div className="w-[600px] h-[600px] bg-[#ff6002] blur-[150px] rounded-full animate-pulse"></div>
            </div>

            <div className="relative z-10 flex flex-col items-center">
              <p className="text-[#ff6002] font-black tracking-[0.3em] uppercase text-xl md:text-2xl mb-6">
                Reconhecimento Especial
              </p>
              <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter mb-8 leading-tight drop-shadow-2xl text-center">
                Destaques por<br/>Categoria
              </h1>
              <div className="h-1 w-24 bg-[#ff6002] rounded-full mb-8"></div>
              <p className="text-[#818b9d] text-2xl md:text-3xl font-medium tracking-wide text-center">
                Celebrando as competências e as soluções geradas.
              </p>
            </div>
          </div>
        )}

        {/* ================= STEPS 1 a 5: REVELAÇÃO DAS CATEGORIAS ================= */}
        {step > 0 && step < maxSteps && vencedores[step - 1] && (
          <div className="text-center w-full flex flex-col items-center z-10 relative">
            
            <div className="animate-in slide-in-from-top-10 fade-in duration-700 mb-12">
              <span className="text-[#ff6002] text-xl font-bold uppercase tracking-widest mb-4 block animate-pulse">
                DESTAQUE NA CATEGORIA
              </span>
              <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-4">
                {vencedores[step - 1].categoria}
              </h2>
              <p className="text-xl text-[#818b9d] font-medium max-w-2xl mx-auto">
                {vencedores[step - 1].descricao}
              </p>
            </div>

            <div className="w-full h-[300px] flex items-center justify-center mt-4">
              {!reveal ? (
                // Cartão de Suspense
                <div className="w-full max-w-4xl h-full bg-[#1a1a1a] border border-[#3f3f3f]/50 rounded-[3rem] shadow-2xl flex flex-col items-center justify-center relative overflow-hidden transition-all duration-500">
                   <div className="w-16 h-16 border-4 border-[#3f3f3f] border-t-[#ff6002] rounded-full animate-spin mb-4"></div>
                   <p className="text-[#818b9d] font-bold tracking-[0.2em] uppercase text-sm">
                     E O DESTAQUE VAI PARA...
                   </p>
                </div>
              ) : (
                // Cartão Revelado (Sem Exibição de Notas)
                <div className="animate-in zoom-in-75 fade-in duration-700 w-full">
                  <div className="w-full max-w-4xl h-[300px] bg-gradient-to-br from-[#fffeee] to-white rounded-[3rem] p-12 shadow-[0_0_80px_rgba(255,96,2,0.15)] flex flex-col items-center justify-center transform hover:scale-105 transition-all duration-700 relative overflow-hidden mx-auto">
                    
                    {/* Linha de topo laranja */}
                    <div className="absolute top-0 w-full h-3 bg-[#ff6002] z-10"></div>
                    
                    {/* Feixe de Luz Cinematográfico */}
                    <div className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-[#ff6002]/10 to-transparent animate-shimmer pointer-events-none"></div>
                    
                    {/* Nome da Equipe Revelada com quebra de linha inteligente */}
                    <h3 className="text-5xl md:text-7xl font-black text-[#161616] tracking-tighter break-words text-balance leading-tight w-full px-4 relative z-10" title={vencedores[step - 1].equipe}>
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
          <div className="text-center animate-in zoom-in duration-1000 fade-in flex flex-col items-center z-10 relative">
            <h2 className="text-6xl md:text-8xl font-black text-white tracking-tight mb-8">
              Parabéns a todos!
            </h2>
            <div className="h-1 w-24 bg-[#ff6002] rounded-full mb-8"></div>
            <p className="text-2xl md:text-3xl text-[#818b9d] font-medium max-w-4xl leading-relaxed">
              O maior resultado de hoje é o conhecimento gerado e as soluções criadas em conjunto.
            </p>
          </div>
        )}

      </div>

      {/* Chancela Pitch Rater no Rodapé */}
      <div className="absolute bottom-8 flex items-center gap-2 opacity-50 z-0">
        <span className="text-xs font-medium text-[#818b9d] tracking-widest uppercase">Powered by</span>
        <div className="flex items-center gap-1 font-sans font-black tracking-tighter text-lg">
          <span className="text-[#fffeee]">Pitch</span>
          <span className="text-[#ff6002]">Rater</span>
        </div>
      </div>

    </div>
  )
}