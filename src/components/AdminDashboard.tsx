'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface AvaliacaoDB {
  id: string
  avaliador: string
  equipe: string
  nota_final: number
  bonus: number
  feedback_geral: string
  detalhes: any
  created_at: string
}

interface RankingItem {
  equipe: string
  media: number
  totalAvaliacoes: number
  mediaInovacao: number
  mediaProblema: number
  mediaPitch: number
  mediaExecucao: number
  mediaValidacao: number
  mediaDesign: number
  mediaViabilidade: number
  somaBonus: number
}

interface EquipeDB {
  id: string
  nome: string
}

interface AvaliadorDB {
  id: string
  nome: string
  pin: string
}

const DESCRICOES_OPCOES: Record<number, string> = {
  1: '1 (Insuficiente) - Não contempla o critério ou o faz de forma muito fraca e pouco clara.',
  2: '2 (Fraco) - Atende de forma superficial, com lacunas evidentes e pouca sustentação.',
  3: '3 (Adequado) - Atende ao critério de forma satisfatória, mas com oportunidades de aprofundamento.',
  4: '4 (Bom) - Atende muito bem ao critério, demonstrando consistência e boa fundamentação.',
  5: '5 (Excelente) - Atende plenamente ao critério, com alta qualidade, clareza e exemplos concretos.',
}

export default function AdminDashboard() {
  const [abaAtiva, setAbaAtiva] = useState<'podio' | 'auditoria' | 'config' | 'telao'>('podio')
  const [abaPlanilha, setAbaPlanilha] = useState<'consolidada' | 'respostas'>('consolidada')

  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoDB[]>([])
  const [ranking, setRanking] = useState<RankingItem[]>([])
  const [vencedoresCats, setVencedoresCats] = useState({
    inovacao: '-',
    impacto: '-',
    apresentacao: '-',
    execucao: '-',
    destaque: '-'
  })
  const [equipes, setEquipes] = useState<EquipeDB[]>([])
  const [avaliadores, setAvaliadores] = useState<AvaliadorDB[]>([])

  const [loading, setLoading] = useState(true)
  const [novaEquipe, setNovaEquipe] = useState('')
  const [novoAvaliador, setNovoAvaliador] = useState('')
  const [loadingAcao, setLoadingAcao] = useState(false)
  const [isRealtimeActive, setIsRealtimeActive] = useState(false)

  const [modal, setModal] = useState({
    isOpen: false,
    type: 'alert' as 'alert' | 'confirm',
    title: '',
    message: '',
    confirmText: 'Entendi',
    isDestructive: false,
    onConfirm: () => {}
  })

  const showAlert = (title: string, message: string) => {
    setModal({ isOpen: true, type: 'alert', title, message, confirmText: 'Entendi', isDestructive: false, onConfirm: () => {} })
  }

  const showConfirm = (title: string, message: string, confirmText: string, isDestructive: boolean, onConfirm: () => void) => {
    setModal({ isOpen: true, type: 'confirm', title, message, confirmText, isDestructive, onConfirm })
  }

  const closeModal = () => setModal(prev => ({ ...prev, isOpen: false }))

  const extrairNota = (detalhes: any, chave: string): number | undefined => {
    if (!detalhes) return undefined
    if (typeof detalhes === 'string') {
      try {
        const parsed = JSON.parse(detalhes)
        return parsed[chave] !== undefined && parsed[chave] !== null ? Number(parsed[chave]) : undefined
      } catch {
        return undefined
      }
    }
    return detalhes[chave] !== undefined && detalhes[chave] !== null ? Number(detalhes[chave]) : undefined
  }

  const formatarDescritor = (valor: number | undefined): string => {
    if (valor === undefined || valor === null) return '-'
    return DESCRICOES_OPCOES[valor] || `${valor}`
  }

  const formatarBonusDisplay = (bonus: number) => {
    return bonus > 0 ? `+${bonus}` : `${bonus}`
  }

  // Função para formatar números sem zeros desnecessários
  const formatarNota = (nota: number) => {
    return Number(nota.toFixed(2)).toString()
  }

  const carregarDados = async (silencioso = false) => {
    if (!silencioso) setLoading(true)
    try {
      const { data: dataAv, error: errAv } = await supabase
        .from('avaliacoes')
        .select('id, avaliador, equipe, nota_final, bonus, detalhes, feedback_geral, created_at')
        .order('created_at', { ascending: false })

      if (errAv) throw errAv
      if (dataAv) setAvaliacoes(dataAv as AvaliacaoDB[])

      const { data: dataRank, error: errRank } = await supabase
        .from('vw_ranking_consolidado')
        .select('*')
        .order('media_final', { ascending: false })

      if (errRank) throw errRank
      if (dataRank) aplicarAntiSweeping(dataRank)

      const { data: dataEq } = await supabase.from('equipes').select('*').order('nome')
      if (dataEq) setEquipes(dataEq)

      const { data: dataUs } = await supabase
        .from('usuarios')
        .select('id, nome, pin')
        .eq('cargo', 'avaliador')
        .order('nome')
      if (dataUs) setAvaliadores(dataUs)

    } catch (err: any) {
      if (!silencioso) showAlert('Erro', 'Erro ao carregar dados: ' + err.message)
    } finally {
      if (!silencioso) setLoading(false)
    }
  }

  const aplicarAntiSweeping = (dadosView: any[]) => {
    const arrayRanking: RankingItem[] = dadosView.map(row => ({
      equipe: row.equipe,
      media: Number(row.media_final || 0),
      totalAvaliacoes: Number(row.total_avaliacoes || 0),
      mediaInovacao: Number(row.media_inovacao || 0),
      mediaProblema: Number(row.media_problema || 0),
      mediaPitch: Number(row.media_pitch || 0),
      mediaExecucao: Number(row.media_execucao || 0),
      mediaValidacao: Number(row.media_validacao || 0),
      mediaDesign: Number(row.media_design || 0),
      mediaViabilidade: Number(row.media_viabilidade || 0),
      somaBonus: Number(row.soma_bonus || 0)
    }))

    setRanking(arrayRanking)

    const eqDestaque = arrayRanking[0]?.equipe || '-'
    const premiadas = new Set<string>()
    if (eqDestaque !== '-') premiadas.add(eqDestaque)

    const getVencedorExclusivo = (chave: keyof RankingItem) => {
      let eqVencedora = '-'
      let maiorNota = -1
      arrayRanking.forEach(item => {
        if (!premiadas.has(item.equipe) && Number(item[chave]) > maiorNota) {
          maiorNota = Number(item[chave])
          eqVencedora = item.equipe
        }
      })
      if (eqVencedora !== '-') premiadas.add(eqVencedora)
      return eqVencedora
    }

    setVencedoresCats({
      destaque: eqDestaque,
      inovacao: getVencedorExclusivo('mediaInovacao'),
      impacto: getVencedorExclusivo('mediaProblema'),
      apresentacao: getVencedorExclusivo('mediaPitch'),
      execucao: getVencedorExclusivo('mediaExecucao')
    })
  }

  useEffect(() => {
    carregarDados(false)

    const channel = supabase
      .channel('avaliacoes_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'avaliacoes' },
        (payload) => {
          carregarDados(true)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsRealtimeActive(true)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleLimparAvaliacoes = () => {
    showConfirm(
      'Zerar Notas da Rodada',
      'Deseja apagar todas as avaliações registradas?\n\nAs equipes e os jurados serão preservados, mas o pódio e as planilhas serão limpos. Esta ação não pode ser desfeita.',
      'Sim, limpar avaliações',
      true,
      async () => {
        setLoadingAcao(true)
        try {
          const { error } = await supabase.from('avaliacoes').delete().neq('id', '00000000-0000-0000-0000-000000000000')
          if (error) throw error
          showAlert('Sucesso', 'Todas as avaliações foram limpas com sucesso!')
          carregarDados(false)
        } catch (err: any) {
          showAlert('Erro', 'Erro ao limpar: ' + err.message)
        } finally {
          setLoadingAcao(false)
        }
      }
    )
  }

  const handleResetGeral = () => {
    showConfirm(
      '🚨 ATENÇÃO: Reinício Total',
      'Esta ação é irreversível!\n\nDeseja realmente apagar TODAS as avaliações, equipes e jurados cadastrados para reiniciar o evento do zero?',
      'Sim, apagar TUDO',
      true,
      async () => {
        setLoadingAcao(true)
        try {
          const { error: errAv } = await supabase.from('avaliacoes').delete().neq('id', '00000000-0000-0000-0000-000000000000')
          if (errAv) throw errAv
          const { error: errEq } = await supabase.from('equipes').delete().neq('id', '00000000-0000-0000-0000-000000000000')
          if (errEq) throw errEq
          const { error: errUs } = await supabase.from('usuarios').delete().eq('cargo', 'avaliador')
          if (errUs) throw errUs
          showAlert('Sucesso', 'O sistema foi reiniciado do zero com sucesso!')
          carregarDados(false)
        } catch (err: any) {
          showAlert('Erro', 'Erro ao resetar: ' + err.message)
        } finally {
          setLoadingAcao(false)
        }
      }
    )
  }

  const exportarCSV = () => {
    if (abaPlanilha === 'consolidada') {
      if (ranking.length === 0) return showAlert('Aviso', 'Não há dados para exportar no momento.')
      const cabecalhos = [
        'Posição', 'Solução Avaliada', 'Nº de Avaliadores', 'Problema e Relevância (15%)', 'Validação e Solução (15%)',
        'Inovação e Originalidade (15%)', 'Design e Usabilidade (10%)', 'Execução Técnica (20%)', 'Viabilidade e Negócio (15%)',
        'Apresentação / Pitch (10%)', 'Gestão de Tempo (Bônus Total)', 'Nota Final'
      ]
      const linhas = ranking.map((r, i) => [
        `${i + 1}º`, `"${r.equipe}"`, r.totalAvaliacoes, formatarNota(r.mediaProblema), formatarNota(r.mediaValidacao), formatarNota(r.mediaInovacao),
        formatarNota(r.mediaDesign), formatarNota(r.mediaExecucao), formatarNota(r.mediaViabilidade), formatarNota(r.mediaPitch), formatarBonusDisplay(r.somaBonus), formatarNota(r.media)
      ])
      baixarArquivoCSV(cabecalhos, linhas, 'ranking_consolidado')
    } else {
      if (avaliacoes.length === 0) return showAlert('Aviso', 'Não há dados para exportar no momento.')
      const cabecalhos = [
        'Data / Hora', 'Jurado (a)', 'Equipe Avaliada', 'Problema e Relevância (15%)', 'Validação e Solução (15%)',
        'Inovação e Originalidade (15%)', 'Design e Usabilidade (10%)', 'Execução Técnica (20%)', 'Viabilidade e Negócio (15%)',
        'Apresentação / Pitch (10%)', 'Gestão de Tempo (Bônus)', 'Feedback / Observações'
      ]
      const linhas = avaliacoes.map(av => [
        `"${new Date(av.created_at).toLocaleString('pt-BR')}"`, `"${av.avaliador.replace(/"/g, '""')}"`, `"${av.equipe.replace(/"/g, '""')}"`,
        `"${formatarDescritor(extrairNota(av.detalhes, 'problema')).replace(/"/g, '""')}"`,
        `"${formatarDescritor(extrairNota(av.detalhes, 'validacao')).replace(/"/g, '""')}"`,
        `"${formatarDescritor(extrairNota(av.detalhes, 'inovacao')).replace(/"/g, '""')}"`,
        `"${formatarDescritor(extrairNota(av.detalhes, 'design')).replace(/"/g, '""')}"`,
        `"${formatarDescritor(extrairNota(av.detalhes, 'execucao')).replace(/"/g, '""')}"`,
        `"${formatarDescritor(extrairNota(av.detalhes, 'viabilidade')).replace(/"/g, '""')}"`,
        `"${formatarDescritor(extrairNota(av.detalhes, 'pitch')).replace(/"/g, '""')}"`,
        formatarBonusDisplay(av.bonus),
        `"${(av.feedback_geral || '').replace(/"/g, '""')}"`
      ])
      baixarArquivoCSV(cabecalhos, linhas, 'respostas_gerais')
    }
  }

  const baixarArquivoCSV = (cabecalhos: string[], linhas: any[][], nome: string) => {
    const csvContent = [cabecalhos.join(','), ...linhas.map(l => l.join(','))].join('\n')
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${nome}_pitch_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleAdicionarEquipe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novaEquipe.trim()) return
    setLoadingAcao(true)
    try {
      const { error } = await supabase.from('equipes').insert({ nome: novaEquipe.trim() })
      if (error) throw error
      setNovaEquipe('')
      carregarDados(true)
    } catch (err: any) {
      showAlert('Erro', 'Erro ao adicionar equipe: ' + err.message)
    } finally {
      setLoadingAcao(false)
    }
  }

  const handleRemoverEquipe = (id: string) => {
    showConfirm(
      'Remover Equipe',
      'Tem certeza de que deseja remover esta equipe do evento?',
      'Sim, remover equipe',
      true,
      async () => {
        setLoadingAcao(true)
        try {
          const { error } = await supabase.from('equipes').delete().eq('id', id)
          if (error) throw error
          carregarDados(true)
        } catch (err: any) {
          showAlert('Erro', 'Erro ao remover: ' + err.message)
        } finally {
          setLoadingAcao(false)
        }
      }
    )
  }

  const handleAdicionarAvaliador = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoAvaliador.trim()) return
    setLoadingAcao(true)
    const pin = Math.floor(1000 + Math.random() * 9000).toString()
    try {
      const { error } = await supabase.from('usuarios').insert({ nome: novoAvaliador.trim(), cargo: 'avaliador', pin })
      if (error) throw error
      setNovoAvaliador('')
      carregarDados(true)
    } catch (err: any) {
      showAlert('Erro', 'Erro ao adicionar avaliador: ' + err.message)
    } finally {
      setLoadingAcao(false)
    }
  }

  const handleRemoverAvaliador = (id: string) => {
    showConfirm(
      'Remover Avaliador',
      'Tem certeza de que deseja remover este avaliador da banca?',
      'Sim, remover avaliador',
      true,
      async () => {
        setLoadingAcao(true)
        try {
          const { error } = await supabase.from('usuarios').delete().eq('id', id)
          if (error) throw error
          carregarDados(true)
        } catch (err: any) {
          showAlert('Erro', 'Erro ao remover: ' + err.message)
        } finally {
          setLoadingAcao(false)
        }
      }
    )
  }

  return (
    <div className="space-y-6 relative font-sans antialiased">
      {modal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#161616]/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#fffeee] rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-[#818b9d]/30">
            <div className="p-6 md:p-8">
              <h3 className="text-xl font-black text-[#161616] mb-3">{modal.title}</h3>
              <p className="text-sm text-[#3f3f3f] leading-relaxed whitespace-pre-line font-medium">{modal.message}</p>
            </div>
            <div className="bg-white px-6 py-4 flex justify-end gap-3 border-t border-[#818b9d]/20">
              {modal.type === 'confirm' && (
                <button
                  onClick={closeModal}
                  disabled={loadingAcao}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-[#3f3f3f] hover:bg-neutral-100 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
              )}
              <button
                onClick={() => {
                  modal.onConfirm()
                  if (modal.type === 'alert') closeModal()
                  if (modal.type === 'confirm') closeModal()
                }}
                disabled={loadingAcao}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 ${
                  modal.isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-[#161616] hover:bg-black'
                }`}
              >
                {modal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#818b9d]/20 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black text-[#161616] tracking-tight">Painel do Organizador</h2>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 border border-green-200 rounded-md">
              <span className={`w-2 h-2 rounded-full ${isRealtimeActive ? 'bg-green-500 animate-pulse' : 'bg-neutral-300'}`}></span>
              <span className="text-[10px] font-bold text-green-700 uppercase tracking-wide">AO VIVO</span>
            </div>
          </div>
          <p className="text-[#3f3f3f] text-sm font-medium mt-1">Visão global consolidada de resultados e auditoria.</p>
        </div>
        
        <button
          onClick={() => carregarDados(false)}
          className="flex items-center gap-2 text-sm font-bold text-[#161616] hover:text-[#ff6002] transition-colors bg-white border border-[#818b9d]/30 hover:border-[#ff6002] px-4 py-2 rounded-xl w-fit cursor-pointer shadow-sm"
        >
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
          Sincronizar
        </button>
      </div>

      <div className="flex gap-4 border-b border-[#818b9d]/20 overflow-x-auto whitespace-nowrap scrollbar-hide">
        <button
          onClick={() => setAbaAtiva('podio')}
          className={`pb-3 text-sm font-bold transition-all border-b-2 px-1 cursor-pointer ${
            abaAtiva === 'podio' ? 'border-[#ff6002] text-[#ff6002]' : 'border-transparent text-[#3f3f3f] hover:text-[#161616]'
          }`}
        >
          Pódio e Resultados
        </button>
        <button
          onClick={() => setAbaAtiva('auditoria')}
          className={`pb-3 text-sm font-bold transition-all border-b-2 px-1 cursor-pointer ${
            abaAtiva === 'auditoria' ? 'border-[#ff6002] text-[#ff6002]' : 'border-transparent text-[#3f3f3f] hover:text-[#161616]'
          }`}
        >
          Planilhas e Exportação
        </button>
        <button
          onClick={() => setAbaAtiva('config')}
          className={`pb-3 text-sm font-bold transition-all border-b-2 px-1 cursor-pointer ${
            abaAtiva === 'config' ? 'border-[#ff6002] text-[#ff6002]' : 'border-transparent text-[#3f3f3f] hover:text-[#161616]'
          }`}
        >
          Configuração do Evento
        </button>
        <button
          onClick={() => setAbaAtiva('telao')}
          className={`pb-3 text-sm font-bold transition-all border-b-2 px-1 cursor-pointer ${
            abaAtiva === 'telao' ? 'border-[#ff6002] text-[#ff6002]' : 'border-transparent text-[#3f3f3f] hover:text-[#161616]'
          }`}
        >
          Apresentação (Telão)
        </button>
      </div>

      {loading && avaliacoes.length === 0 && equipes.length === 0 ? (
        <div className="py-12 text-center text-[#3f3f3f] text-sm font-medium flex items-center justify-center gap-3">
          <svg className="w-5 h-5 animate-spin text-[#ff6002]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          Carregando banco de dados...
        </div>
      ) : (
        <>
          {/* ABA: PÓDIO E RESULTADOS */}
          {abaAtiva === 'podio' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              {ranking.length === 0 ? (
                <div className="py-10 text-center text-[#3f3f3f] text-sm bg-white rounded-2xl border border-[#818b9d]/30">
                  Nenhuma avaliação registrada até o momento. Aguardando jurados...
                </div>
              ) : (
                <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-[#818b9d]/30">
                  
                  {/* Pódio em tempo real */}
                  <div className="mb-14">
                    <h3 className="text-xl font-black mb-10 text-[#161616] text-center md:text-left tracking-tight">
                      Pódio em tempo real
                    </h3>
                    <div className="flex items-end justify-center h-64 md:h-72 gap-2 md:gap-4 px-2">
                      {ranking[1] && (
                        <div className="w-1/3 max-w-[200px] bg-[#161616] rounded-t-2xl flex flex-col items-center justify-end pb-4 md:pb-6 shadow-md h-[70%] order-1 transition-all duration-500">
                          <div className="text-[9px] md:text-[10px] uppercase font-bold tracking-widest text-[#818b9d] mb-0.5 shrink-0">
                            Pontuação
                          </div>
                          <div className="text-white font-black text-2xl md:text-4xl mb-2 shrink-0">
                            {formatarNota(ranking[1].media)}
                          </div>
                          <div className="text-neutral-300 font-bold text-xs md:text-sm text-center px-2 line-clamp-2 leading-tight w-full shrink-0" title={ranking[1].equipe}>
                            {ranking[1].equipe}
                          </div>
                          <div className="mt-3 text-[#161616] font-black text-xl bg-white px-3 py-1 rounded-full shadow-sm shrink-0">
                            2º
                          </div>
                        </div>
                      )}
                      {ranking[0] && (
                        <div className="w-1/3 max-w-[220px] bg-[#ff6002] rounded-t-2xl flex flex-col items-center justify-end pb-4 md:pb-6 shadow-lg h-[100%] order-2 transition-all duration-500">
                          <div className="text-[9px] md:text-[10px] uppercase font-bold tracking-widest text-orange-200 mb-0.5 shrink-0">
                            Pontuação
                          </div>
                          <div className="text-white font-black text-3xl md:text-5xl mb-2 shrink-0">
                            {formatarNota(ranking[0].media)}
                          </div>
                          <div className="text-orange-100 font-bold text-xs md:text-sm text-center px-2 line-clamp-2 leading-tight w-full shrink-0" title={ranking[0].equipe}>
                            {ranking[0].equipe}
                          </div>
                          <div className="mt-3 text-[#ff6002] font-black text-xl bg-white px-3 py-1 rounded-full shadow-sm shrink-0">
                            1º
                          </div>
                        </div>
                      )}
                      {ranking[2] && (
                        <div className="w-1/3 max-w-[200px] bg-[#818b9d]/30 rounded-t-2xl flex flex-col items-center justify-end pb-4 md:pb-6 shadow-sm h-[55%] order-3 transition-all duration-500">
                          <div className="text-[9px] md:text-[10px] uppercase font-bold tracking-widest text-[#3f3f3f] mb-0.5 shrink-0">
                            Pontuação
                          </div>
                          <div className="text-[#161616] font-black text-lg md:text-2xl mb-2 shrink-0">
                            {formatarNota(ranking[2].media)}
                          </div>
                          <div className="text-[#3f3f3f] font-bold text-xs md:text-sm text-center px-2 line-clamp-2 leading-tight w-full shrink-0" title={ranking[2].equipe}>
                            {ranking[2].equipe}
                          </div>
                          <div className="mt-3 text-[#161616] font-black text-xl bg-white border border-[#818b9d]/40 px-3 py-1 rounded-full shadow-sm shrink-0">
                            3º
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Classificação Geral */}
                  <div className="mb-12">
                    <h3 className="text-lg font-black mb-4 text-[#161616] tracking-tight">
                      Classificação geral
                    </h3>
                    <div className="space-y-3">
                      {ranking.map((item, index) => (
                        <div
                          key={item.equipe}
                          className="bg-[#fffeee] hover:bg-[#fffeee]/60 transition-colors border border-[#818b9d]/20 rounded-2xl p-4 flex items-center justify-between min-h-[84px]"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 flex items-center justify-center rounded-full font-black text-base ${
                              index === 0 ? 'bg-[#ff6002] text-white' : index === 1 ? 'bg-[#161616] text-white' : index === 2 ? 'bg-[#818b9d]/40 text-[#161616]' : 'bg-white border border-[#818b9d]/30 text-[#3f3f3f]'
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              <h4 className="font-bold text-[#161616] text-sm md:text-base">{item.equipe}</h4>
                              <p className="text-xs text-[#3f3f3f]">{item.totalAvaliacoes} avaliações</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] uppercase font-bold text-[#818b9d] tracking-wider mb-0.5">Média</div>
                            <div className="text-xl md:text-2xl font-black text-[#ff6002] transition-all">{formatarNota(item.media)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Classificação por Categoria */}
                  <div>
                    <h3 className="text-lg font-black mb-4 text-[#161616] tracking-tight">
                      Classificação por categoria
                    </h3>

                    {/* Destaque: MELHOR EQUIPE */}
                    <div className="bg-[#ff6002] rounded-2xl p-6 text-white mb-4 shadow-sm transition-all duration-300">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h4 className="font-extrabold text-base tracking-wider uppercase">
                            MELHOR EQUIPE
                          </h4>
                          <p className="text-sm text-orange-100 font-normal mt-0.5">
                            Reconhecimento máximo da equipe pelo desempenho total.
                          </p>
                        </div>
                        <div className="text-left sm:text-right">
                          <div className="text-[11px] uppercase font-bold tracking-widest text-orange-200">
                            VENCEDOR
                          </div>
                          <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                            {vencedoresCats.destaque}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Grid com 4 Categorias */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-[#fffeee] border border-[#818b9d]/25 rounded-2xl p-5 flex flex-col justify-between min-h-[110px] transition-all duration-300">
                        <div>
                          <h4 className="font-bold text-[#161616] text-sm uppercase tracking-wide">
                            SOLUÇÃO MAIS INOVADORA
                          </h4>
                          <p className="text-xs text-[#3f3f3f] mt-0.5">
                            A ideia mais original e 'fora da caixa'.
                          </p>
                        </div>
                        <div className="mt-4">
                          <div className="text-[10px] uppercase font-bold text-[#818b9d] tracking-wider">
                            CLASSIFICADO
                          </div>
                          <div className="text-lg font-black text-[#ff6002]">
                            {vencedoresCats.inovacao}
                          </div>
                        </div>
                      </div>

                      <div className="bg-[#fffeee] border border-[#818b9d]/25 rounded-2xl p-5 flex flex-col justify-between min-h-[110px] transition-all duration-300">
                        <div>
                          <h4 className="font-bold text-[#161616] text-sm uppercase tracking-wide">
                            MAIOR IMPACTO (PROBLEMA)
                          </h4>
                          <p className="text-xs text-[#3f3f3f] mt-0.5">
                            Maior potencial de transformação e relevância.
                          </p>
                        </div>
                        <div className="mt-4">
                          <div className="text-[10px] uppercase font-bold text-[#818b9d] tracking-wider">
                            CLASSIFICADO
                          </div>
                          <div className="text-lg font-black text-[#ff6002]">
                            {vencedoresCats.impacto}
                          </div>
                        </div>
                      </div>

                      <div className="bg-[#fffeee] border border-[#818b9d]/25 rounded-2xl p-5 flex flex-col justify-between min-h-[110px] transition-all duration-300">
                        <div>
                          <h4 className="font-bold text-[#161616] text-sm uppercase tracking-wide">
                            MELHOR APRESENTAÇÃO (PITCH)
                          </h4>
                          <p className="text-xs text-[#3f3f3f] mt-0.5">
                            Soube 'vender' a ideia com clareza e convencimento.
                          </p>
                        </div>
                        <div className="mt-4">
                          <div className="text-[10px] uppercase font-bold text-[#818b9d] tracking-wider">
                            CLASSIFICADO
                          </div>
                          <div className="text-lg font-black text-[#ff6002]">
                            {vencedoresCats.apresentacao}
                          </div>
                        </div>
                      </div>

                      <div className="bg-[#fffeee] border border-[#818b9d]/25 rounded-2xl p-5 flex flex-col justify-between min-h-[110px] transition-all duration-300">
                        <div>
                          <h4 className="font-bold text-[#161616] text-sm uppercase tracking-wide">
                            EXECUÇÃO TÉCNICA
                          </h4>
                          <p className="text-xs text-[#3f3f3f] mt-0.5">
                            A solução mais bem estruturada e robusta.
                          </p>
                        </div>
                        <div className="mt-4">
                          <div className="text-[10px] uppercase font-bold text-[#818b9d] tracking-wider">
                            CLASSIFICADO
                          </div>
                          <div className="text-lg font-black text-[#ff6002]">
                            {vencedoresCats.execucao}
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </div>
          )}

          {/* ABA: PLANILHAS E EXPORTAÇÃO */}
          {abaAtiva === 'auditoria' && (
            <div className="animate-in fade-in duration-300">
              <div className="bg-white border border-[#818b9d]/30 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-[#818b9d]/20 bg-[#fffeee] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex bg-[#818b9d]/15 p-1 rounded-xl">
                    <button
                      onClick={() => setAbaPlanilha('consolidada')}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        abaPlanilha === 'consolidada' ? 'bg-white text-[#ff6002] shadow-sm' : 'text-[#3f3f3f] hover:text-[#161616]'
                      }`}
                    >
                      Ranking Consolidado
                    </button>
                    <button
                      onClick={() => setAbaPlanilha('respostas')}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        abaPlanilha === 'respostas' ? 'bg-white text-[#ff6002] shadow-sm' : 'text-[#3f3f3f] hover:text-[#161616]'
                      }`}
                    >
                      Respostas Gerais
                    </button>
                  </div>
                  <button
                    onClick={exportarCSV}
                    className="flex items-center gap-1.5 bg-[#161616] hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer"
                  >
                    Exportar CSV
                  </button>
                </div>

                {abaPlanilha === 'consolidada' && (
                  <div className="bg-white p-4">
                    <div className="rounded-xl overflow-x-auto max-h-[600px] overflow-y-auto border border-[#818b9d]/30 relative">
                      <table className="w-[1800px] table-fixed text-center text-xs border-collapse">
                        <thead className="bg-[#161616] text-white font-bold tracking-wider text-[11px] sticky top-0 z-20 shadow-[0_2px_4px_rgba(0,0,0,0.1)]">
                          <tr className="h-[44px]">
                            <th className="px-4 border-r border-neutral-700 w-[100px] align-middle text-center bg-[#161616]">Posição</th>
                            <th className="px-4 border-r border-neutral-700 w-[200px] align-middle text-center bg-[#161616]">Solução Avaliada</th>
                            <th className="px-4 border-r border-neutral-700 w-[120px] align-middle text-center bg-[#161616]">Nº de<br/>Avaliadores</th>
                            <th className="px-4 border-r border-neutral-700 w-[150px] align-middle text-center bg-[#161616]">Problema e<br/>Relevância (15%)</th>
                            <th className="px-4 border-r border-neutral-700 w-[150px] align-middle text-center bg-[#161616]">Validação e<br/>Solução (15%)</th>
                            <th className="px-4 border-r border-neutral-700 w-[150px] align-middle text-center bg-[#161616]">Inovação e<br/>Originalidade (15%)</th>
                            <th className="px-4 border-r border-neutral-700 w-[150px] align-middle text-center bg-[#161616]">Design e<br/>Usabilidade (10%)</th>
                            <th className="px-4 border-r border-neutral-700 w-[150px] align-middle text-center bg-[#161616]">Execução<br/>Técnica (20%)</th>
                            <th className="px-4 border-r border-neutral-700 w-[150px] align-middle text-center bg-[#161616]">Viabilidade e<br/>Negócio (15%)</th>
                            <th className="px-4 border-r border-neutral-700 w-[150px] align-middle text-center bg-[#161616]">Apresentação /<br/>Pitch (10%)</th>
                            <th className="px-4 border-r border-neutral-700 w-[150px] align-middle text-center bg-[#161616]">Gestão de Tempo<br/>(Bônus)</th>
                            <th className="px-4 bg-black text-white border-l border-neutral-700 w-[150px] align-middle text-center">Nota Final</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#818b9d]/20 bg-white">
                          {ranking.length === 0 ? (
                            <tr><td colSpan={12} className="p-8 text-center text-[#818b9d]">Nenhum dado consolidado.</td></tr>
                          ) : (
                            ranking.map((r, index) => (
                              <tr key={r.equipe} className="h-[60px] hover:bg-[#fffeee] transition-colors text-[#161616]">
                                <td className="px-4 border-r border-[#818b9d]/20 font-bold align-middle text-center">{index + 1}º</td>
                                <td className="px-4 border-r border-[#818b9d]/20 font-bold text-[#161616] align-middle text-center">{r.equipe}</td>
                                <td className="px-4 border-r border-[#818b9d]/20 align-middle text-center">{r.totalAvaliacoes}</td>
                                <td className="px-4 border-r border-[#818b9d]/20 align-middle text-center">{formatarNota(r.mediaProblema)}</td>
                                <td className="px-4 border-r border-[#818b9d]/20 align-middle text-center">{formatarNota(r.mediaValidacao)}</td>
                                <td className="px-4 border-r border-[#818b9d]/20 align-middle text-center">{formatarNota(r.mediaInovacao)}</td>
                                <td className="px-4 border-r border-[#818b9d]/20 align-middle text-center">{formatarNota(r.mediaDesign)}</td>
                                <td className="px-4 border-r border-[#818b9d]/20 align-middle text-center">{formatarNota(r.mediaExecucao)}</td>
                                <td className="px-4 border-r border-[#818b9d]/20 align-middle text-center">{formatarNota(r.mediaViabilidade)}</td>
                                <td className="px-4 border-r border-[#818b9d]/20 align-middle text-center">{formatarNota(r.mediaPitch)}</td>
                                <td className="px-4 border-r border-[#818b9d]/20 font-bold text-[#3f3f3f] align-middle text-center">{formatarBonusDisplay(r.somaBonus)}</td>
                                <td className="px-4 font-black text-[#ff6002] bg-[#fffeee] align-middle text-center">{formatarNota(r.media)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {abaPlanilha === 'respostas' && (
                  <div className="bg-white p-4">
                    <div className="rounded-xl overflow-x-auto max-h-[600px] overflow-y-auto border border-[#818b9d]/30 relative">
                      <table className="w-[3250px] table-fixed text-left text-xs border-collapse">
                        <thead className="bg-[#161616] text-white font-bold tracking-wider text-[11px] sticky top-0 z-20 shadow-[0_2px_4px_rgba(0,0,0,0.1)]">
                          <tr className="h-[44px]">
                            <th className="px-4 border-r border-neutral-700 w-[130px] align-middle text-center bg-[#161616]">Data / Hora</th>
                            <th className="px-4 border-r border-neutral-700 w-[200px] align-middle text-center bg-[#161616]">Jurado (a)</th>
                            <th className="px-4 border-r border-neutral-700 w-[200px] align-middle text-center bg-[#161616]">Equipe Avaliada</th>
                            <th className="px-4 border-r border-neutral-700 w-[300px] align-middle text-center bg-[#161616]">Problema e Relevância (15%)</th>
                            <th className="px-4 border-r border-neutral-700 w-[300px] align-middle text-center bg-[#161616]">Validação e Solução (15%)</th>
                            <th className="px-4 border-r border-neutral-700 w-[300px] align-middle text-center bg-[#161616]">Inovação e Originalidade (15%)</th>
                            <th className="px-4 border-r border-neutral-700 w-[300px] align-middle text-center bg-[#161616]">Design e Usabilidade (10%)</th>
                            <th className="px-4 border-r border-neutral-700 w-[300px] align-middle text-center bg-[#161616]">Execução Técnica (20%)</th>
                            <th className="px-4 border-r border-neutral-700 w-[300px] align-middle text-center bg-[#161616]">Viabilidade e Negócio (15%)</th>
                            <th className="px-4 border-r border-neutral-700 w-[300px] align-middle text-center bg-[#161616]">Apresentação / Pitch (10%)</th>
                            <th className="px-4 border-r border-neutral-700 w-[120px] align-middle text-center bg-[#161616]">Gestão de Tempo (Bônus)</th>
                            <th className="px-4 w-[500px] align-middle text-center bg-[#161616]">Feedback / Observações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#818b9d]/20 bg-white text-[#3f3f3f]">
                          {avaliacoes.length === 0 ? (
                            <tr><td colSpan={12} className="p-8 text-center text-[#818b9d]">Nenhuma avaliação submetida.</td></tr>
                          ) : (
                            avaliacoes.map((av) => (
                              <tr key={av.id} className="min-h-[64px] hover:bg-[#fffeee] transition-colors">
                                <td className="px-4 py-3 border-r border-[#818b9d]/20 text-[#818b9d] align-middle text-center">
                                  {new Date(av.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                                </td>
                                <td className="px-4 py-3 border-r border-[#818b9d]/20 font-bold text-[#161616] align-middle text-center">{av.avaliador}</td>
                                <td className="px-4 py-3 border-r border-[#818b9d]/20 font-bold text-[#ff6002] align-middle text-center">{av.equipe}</td>
                                <td className="px-4 py-3 border-r border-[#818b9d]/20 align-middle text-left whitespace-normal break-words leading-relaxed font-medium">
                                  {formatarDescritor(extrairNota(av.detalhes, 'problema'))}
                                </td>
                                <td className="px-4 py-3 border-r border-[#818b9d]/20 align-middle text-left whitespace-normal break-words leading-relaxed font-medium">
                                  {formatarDescritor(extrairNota(av.detalhes, 'validacao'))}
                                </td>
                                <td className="px-4 py-3 border-r border-[#818b9d]/20 align-middle text-left whitespace-normal break-words leading-relaxed font-medium">
                                  {formatarDescritor(extrairNota(av.detalhes, 'inovacao'))}
                                </td>
                                <td className="px-4 py-3 border-r border-[#818b9d]/20 align-middle text-left whitespace-normal break-words leading-relaxed font-medium">
                                  {formatarDescritor(extrairNota(av.detalhes, 'design'))}
                                </td>
                                <td className="px-4 py-3 border-r border-[#818b9d]/20 align-middle text-left whitespace-normal break-words leading-relaxed font-medium">
                                  {formatarDescritor(extrairNota(av.detalhes, 'execucao'))}
                                </td>
                                <td className="px-4 py-3 border-r border-[#818b9d]/20 align-middle text-left whitespace-normal break-words leading-relaxed font-medium">
                                  {formatarDescritor(extrairNota(av.detalhes, 'viabilidade'))}
                                </td>
                                <td className="px-4 py-3 border-r border-[#818b9d]/20 align-middle text-left whitespace-normal break-words leading-relaxed font-medium">
                                  {formatarDescritor(extrairNota(av.detalhes, 'pitch'))}
                                </td>
                                <td className="px-4 py-3 border-r border-[#818b9d]/20 text-center font-bold text-[#ff6002] align-middle text-base">
                                  {formatarBonusDisplay(av.bonus)}
                                </td>
                                <td className="px-4 py-3 align-middle text-[#3f3f3f] italic text-left whitespace-normal break-words leading-relaxed">
                                  {av.feedback_geral || '-'}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ABA: CONFIGURAÇÃO */}
          {abaAtiva === 'config' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-2xl border border-[#818b9d]/30 shadow-sm">
                  <div className="mb-6">
                    <h3 className="text-lg font-black text-[#161616]">Equipes</h3>
                    <p className="text-xs text-[#3f3f3f] mt-1">Cadastre as equipes que vão realizar o pitch.</p>
                  </div>
                  <form onSubmit={handleAdicionarEquipe} className="flex gap-2 mb-6">
                    <input
                      type="text"
                      required
                      value={novaEquipe}
                      onChange={(e) => setNovaEquipe(e.target.value)}
                      placeholder="Nome da equipe"
                      className="flex-1 p-3 text-sm border border-[#818b9d]/30 rounded-xl outline-none focus:border-[#ff6002] bg-[#fffeee] transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={loadingAcao}
                      className="bg-[#161616] hover:bg-black text-white px-4 py-3 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      Adicionar
                    </button>
                  </form>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                    {equipes.length === 0 ? (
                      <p className="text-xs text-center text-[#818b9d] py-4">Nenhuma equipe cadastrada.</p>
                    ) : (
                      equipes.map((eq) => (
                        <div key={eq.id} className="flex justify-between items-center bg-[#fffeee] p-3 border border-[#818b9d]/20 rounded-xl">
                          <span className="text-sm font-bold text-[#161616]">{eq.nome}</span>
                          <button
                            onClick={() => handleRemoverEquipe(eq.id)}
                            className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-[#818b9d]/30 shadow-sm">
                  <div className="mb-6">
                    <h3 className="text-lg font-black text-[#161616]">Banca de Avaliadores</h3>
                    <p className="text-xs text-[#3f3f3f] mt-1">Cadastre os jurados. O PIN será gerado automaticamente.</p>
                  </div>
                  <form onSubmit={handleAdicionarAvaliador} className="flex gap-2 mb-6">
                    <input
                      type="text"
                      required
                      value={novoAvaliador}
                      onChange={(e) => setNovoAvaliador(e.target.value)}
                      placeholder="Nome do avaliador"
                      className="flex-1 p-3 text-sm border border-[#818b9d]/30 rounded-xl outline-none focus:border-[#ff6002] bg-[#fffeee] transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={loadingAcao}
                      className="bg-[#161616] hover:bg-black text-white px-4 py-3 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      Adicionar
                    </button>
                  </form>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                    {avaliadores.length === 0 ? (
                      <p className="text-xs text-center text-[#818b9d] py-4">Nenhum avaliador cadastrado.</p>
                    ) : (
                      avaliadores.map((av) => (
                        <div key={av.id} className="flex justify-between items-center bg-[#fffeee] p-3 border border-[#818b9d]/20 rounded-xl">
                          <div>
                            <span className="block text-sm font-bold text-[#161616]">{av.nome}</span>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[10px] text-[#818b9d] uppercase tracking-wider font-semibold">PIN:</span>
                              <code className="text-xs font-black text-[#ff6002] bg-white px-1.5 py-0.5 rounded border border-[#ff6002]/30">
                                {av.pin}
                              </code>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoverAvaliador(av.id)}
                            className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white border border-[#818b9d]/30 rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-[#161616] flex items-center gap-2">
                      <svg className="w-4 h-4 text-[#818b9d]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                      Gestão de Rodada e Reinício
                    </h3>
                    <p className="text-xs text-[#3f3f3f] mt-1 font-medium">Zere as pontuações para iniciar uma nova rodada ou redefina os dados para o próximo evento.</p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    <button
                      onClick={handleLimparAvaliacoes}
                      disabled={loadingAcao}
                      className="bg-white hover:bg-neutral-100 text-[#3f3f3f] border border-[#818b9d]/40 font-bold px-3.5 py-2 rounded-xl text-xs transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      Zerar Notas da Rodada
                    </button>
                    <button
                      onClick={handleResetGeral}
                      disabled={loadingAcao}
                      className="bg-[#161616] hover:bg-black text-white font-bold px-3.5 py-2 rounded-xl text-xs transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      Limpar Todo o Evento
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA: MODO TELÃO */}
          {abaAtiva === 'telao' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="bg-white p-6 md:p-8 rounded-3xl border border-[#818b9d]/30 shadow-sm">
                <div className="mb-8">
                  <h3 className="text-xl font-black text-[#161616]">Apresentação no Telão</h3>
                  <p className="text-sm text-[#3f3f3f] mt-1">Escolha o formato de exibição dos resultados para o encerramento do evento.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border-2 border-[#818b9d]/20 hover:border-[#161616] rounded-2xl p-6 transition-colors flex flex-col justify-between cursor-pointer group" onClick={() => window.open('/telao', '_blank')}>
                    <div>
                      <div className="w-12 h-12 bg-[#161616] text-white rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                      </div>
                      <h4 className="text-lg font-black text-[#161616] mb-2">Pódio Competitivo</h4>
                      <p className="text-sm text-[#3f3f3f] leading-relaxed">
                        Apresenta o ranking clássico, revelando do 3º ao 1º colocado geral com base nas médias finais. Ideal para competições.
                      </p>
                    </div>
                    <button className="mt-6 w-full bg-[#161616] text-white font-bold py-3 rounded-xl group-hover:bg-black transition-colors">
                      Abrir Pódio (Telão)
                    </button>
                  </div>

                  <div className="border-2 border-[#818b9d]/20 hover:border-[#ff6002] rounded-2xl p-6 transition-colors flex flex-col justify-between cursor-pointer group" onClick={() => window.open('/telao-categorias', '_blank')}>
                    <div>
                      <div className="w-12 h-12 bg-[#ff6002] text-white rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>
                      </div>
                      <h4 className="text-lg font-black text-[#161616] mb-2">Destaques por Categoria</h4>
                      <p className="text-sm text-[#3f3f3f] leading-relaxed">
                        Foca nas equipes destaque de cada critério (Inovação, Impacto, etc), sem ranqueamento geral. Ideal para confraternizações.
                      </p>
                    </div>
                    <button className="mt-6 w-full bg-[#ff6002] text-white font-bold py-3 rounded-xl group-hover:bg-[#dd4012] transition-colors">
                      Abrir Categorias (Telão)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}