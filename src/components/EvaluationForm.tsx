import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Usuario, Equipe } from '../types'

interface EvaluationFormProps {
  usuario: Usuario
  equipes: Equipe[]
}

const CRITERIOS = [
  {
    chave: 'problema',
    numero: '1',
    titulo: 'Problema e Relevância',
    pesoNum: 0.15,
    descricao: 'Avalia o quanto a solução proposta responde a um problema real e significativo para a sociedade, comunidade local ou um grupo específico, promovendo impacto positivo e transformação social.'
  },
  {
    chave: 'validacao',
    numero: '2',
    titulo: 'Validação e Solução',
    pesoNum: 0.15,
    descricao: 'Avalia o entendimento do público-alvo, a profundidade das entrevistas de validação e se a proposta resolve a dor diagnosticada com clareza prática.'
  },
  {
    chave: 'inovacao',
    numero: '3',
    titulo: 'Inovação e Originalidade',
    pesoNum: 0.15,
    descricao: 'Avalia o nível de disrupção, criatividade e diferencial competitivo frente às soluções existentes no mercado atual.'
  },
  {
    chave: 'design',
    numero: '4',
    titulo: 'Design e Usabilidade',
    pesoNum: 0.10,
    descricao: 'Avalia a consistência da experiência do usuário (UX), a clareza da interface (UI) e o apelo visual intuitivo da solução apresentada.'
  },
  {
    chave: 'execucao',
    numero: '5',
    titulo: 'Execução Técnica',
    pesoNum: 0.20,
    descricao: 'Avalia a solidez da arquitetura técnica, o nível de maturidade do protótipo funcional apresentado e a robustez da tecnologia empregada.'
  },
  {
    chave: 'viabilidade',
    numero: '6',
    titulo: 'Viabilidade e Negócio',
    pesoNum: 0.15,
    descricao: 'Avalia a sustentabilidade financeira do modelo de negócios, escalabilidade no mercado e a estratégia de lançamento e monetização.'
  },
  {
    chave: 'pitch',
    numero: '7',
    titulo: 'Apresentação (Pitch)',
    pesoNum: 0.10,
    descricao: 'Avalia a capacidade da equipe em comunicar de forma objetiva, estruturada e envolvente a sua proposta.'
  }
]

const OPCOES_NOTA = [
  { valor: 1, texto: '1 (Insuficiente) - Não contempla o critério ou o faz de forma muito fraca e pouco clara.' },
  { valor: 2, texto: '2 (Fraco) - Atende de forma superficial, com lacunas evidentes e pouca sustentação.' },
  { valor: 3, texto: '3 (Adequado) - Atende ao critério de forma satisfatória, mas com oportunidades de aprofundamento.' },
  { valor: 4, texto: '4 (Bom) - Atende muito bem ao critério, demonstrando consistência e boa fundamentação.' },
  { valor: 5, texto: '5 (Excelente) - Atende plenamente ao critério, com alta qualidade, clareza e exemplos concretos.' },
]

const DRAFT_KEY = 'pitch_rater_draft'

export default function EvaluationForm({ usuario, equipes }: EvaluationFormProps) {
  const [equipesAvaliadas, setEquipesAvaliadas] = useState<string[]>([])
  const [equipeNome, setEquipeNome] = useState('')
  const [notas, setNotas] = useState<Record<string, number>>({})
  const [bonusTempo, setBonusTempo] = useState<number | null>(null)
  const [feedback, setFeedback] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [erroValidacao, setErroValidacao] = useState('')
  const [draftCarregado, setDraftCarregado] = useState(false)

  const [modalSucesso, setModalSucesso] = useState<{ isOpen: boolean; titulo: string; mensagem: string }>({
    isOpen: false,
    titulo: '',
    mensagem: ''
  })

  // 1. Carrega as avaliações já submetidas para remover do dropdown
  const carregarAvaliadas = async () => {
    try {
      const { data, error } = await supabase
        .from('avaliacoes')
        .select('equipe')
        .eq('avaliador', usuario.nome)

      if (!error && data) {
        setEquipesAvaliadas(data.map((item: { equipe: string }) => item.equipe))
      }
    } catch {
      // Sincronização silenciosa
    }
  }

  useEffect(() => {
    carregarAvaliadas()
  }, [usuario.nome])

  // 2. Recupera rascunho salvo no LocalStorage (Roda apenas na montagem)
  useEffect(() => {
    const savedDraft = localStorage.getItem(DRAFT_KEY)
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft)
        if (parsed.equipeNome) setEquipeNome(parsed.equipeNome)
        if (parsed.notas) setNotas(parsed.notas)
        if (parsed.bonusTempo !== null && parsed.bonusTempo !== undefined) setBonusTempo(parsed.bonusTempo)
        if (parsed.feedback) setFeedback(parsed.feedback)
      } catch (e) {
        console.error('Erro ao ler o rascunho local', e)
      }
    }
    setDraftCarregado(true) // Libera o salvamento automático para não sobrescrever com dados vazios na montagem
  }, [])

  // 3. Salva rascunho automático a cada alteração nos campos
  useEffect(() => {
    if (draftCarregado) {
      const draft = { equipeNome, notas, bonusTempo, feedback }
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    }
  }, [equipeNome, notas, bonusTempo, feedback, draftCarregado])

  const equipesDisponiveis = equipes.filter(eq => !equipesAvaliadas.includes(eq.nome))

  const handleNotaChange = (chave: string, valor: number) => {
    setNotas(prev => ({ ...prev, [chave]: valor }))
    setErroValidacao('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!equipeNome) {
      setErroValidacao('Selecione uma equipe antes de submeter a avaliação.')
      return
    }

    const criteriosFaltando = CRITERIOS.filter(c => notas[c.chave] === undefined)
    if (criteriosFaltando.length > 0) {
      setErroValidacao('Todos os critérios de avaliação são de preenchimento obrigatório.')
      return
    }

    if (bonusTempo === null) {
      setErroValidacao('A avaliação de Gestão de Tempo é obrigatória.')
      return
    }

    setLoading(true)
    setErroValidacao('')

    try {
      let notaPonderada = 0
      CRITERIOS.forEach(c => {
        notaPonderada += (notas[c.chave] || 0) * c.pesoNum
      })

      const notaFinal = Math.max(0, Number((notaPonderada + bonusTempo).toFixed(2)))

      const payload = {
        avaliador: usuario.nome,
        equipe: equipeNome,
        nota_final: notaFinal,
        bonus: bonusTempo,
        detalhes: JSON.stringify(notas),
        feedback_geral: feedback.trim()
      }

      const { error } = await supabase.from('avaliacoes').insert([payload])
      if (error) throw error

      // Em caso de sucesso: limpa cache local e reseta o formulário
      localStorage.removeItem(DRAFT_KEY)
      
      const equipeNomeSalvo = equipeNome
      setEquipesAvaliadas(prev => [...prev, equipeNomeSalvo])
      setEquipeNome('')
      setNotas({})
      setBonusTempo(null)
      setFeedback('')

      window.scrollTo({ top: 0, behavior: 'smooth' })

      setModalSucesso({
        isOpen: true,
        titulo: 'Avaliação Concluída',
        mensagem: `A avaliação da equipe "${equipeNomeSalvo}" foi guardada e consolidada com sucesso no pódio.`
      })

      setTimeout(() => {
        setModalSucesso(prev => ({ ...prev, isOpen: false }))
      }, 3000)

    } catch (err: any) {
      setErroValidacao('Erro ao enviar avaliação: ' + (err.message || 'Tente novamente.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white p-6 sm:p-10 md:p-12 rounded-3xl border border-[#818b9d]/30 max-w-4xl mx-auto font-sans antialiased relative shadow-sm">
      
      {/* Modal Normativo CESAR */}
      {modalSucesso.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#161616]/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#fffeee] rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-[#818b9d]/30">
            <div className="p-6 md:p-8">
              <h3 className="text-xl font-black text-[#161616] mb-3">{modalSucesso.titulo}</h3>
              <p className="text-sm text-[#3f3f3f] font-medium leading-relaxed whitespace-pre-line">{modalSucesso.mensagem}</p>
            </div>
            <div className="bg-white px-6 py-4 flex justify-end border-t border-[#818b9d]/20">
              <button
                type="button"
                onClick={() => setModalSucesso(prev => ({ ...prev, isOpen: false }))}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-[#161616] hover:bg-[#ff6002] transition-colors"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cabeçalho */}
      <div className="mb-10 pb-6 border-b border-[#818b9d]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl sm:text-4xl font-black text-[#161616] tracking-tight mb-2">
            Avaliação de Pitch
          </h2>
          <div className="flex items-center gap-2 text-sm font-medium text-[#3f3f3f]">
            <span>Avaliador(a):</span>
            <span className="font-bold text-[#ff6002] bg-[#fffeee] px-3 py-1 rounded-md border border-[#ff6002]/30">
              {usuario.nome}
            </span>
          </div>
        </div>
        
        {/* Indicador discreto de auto-save */}
        {Object.keys(notas).length > 0 && (
          <div className="text-[11px] font-bold text-[#818b9d] flex items-center gap-1.5 animate-in fade-in">
            <div className="w-1.5 h-1.5 bg-[#818b9d] rounded-full animate-pulse"></div>
            Rascunho salvo
          </div>
        )}
      </div>

      {equipesDisponiveis.length === 0 ? (
        <div className="py-20 text-center bg-[#fffeee] rounded-2xl border-2 border-dashed border-[#818b9d]/30">
          <div className="w-14 h-14 mx-auto mb-4 text-white bg-[#ff6002] rounded-full flex items-center justify-center font-black text-2xl">
            ✓
          </div>
          <h3 className="text-xl font-black text-[#161616] mb-1">Todas as equipes já foram avaliadas!</h3>
          <p className="text-sm text-[#3f3f3f] max-w-md mx-auto">
            Você submeteu as avaliações de todas as equipes participantes cadastradas.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-12">
          
          {/* Seletor de Equipe */}
          <div className="bg-[#fffeee] p-6 rounded-2xl border border-[#818b9d]/20">
            <label className="block text-sm font-bold text-[#161616] tracking-wide mb-2">
              Equipe apresentando
            </label>
            <select
              required
              value={equipeNome}
              onChange={(e) => {
                setEquipeNome(e.target.value)
                setErroValidacao('')
              }}
              className="w-full px-5 py-4 bg-white border-2 border-[#818b9d]/30 rounded-xl outline-none hover:border-[#ff6002] hover:bg-[#fffeee] focus:border-[#ff6002] focus:bg-[#fffeee] text-base text-[#161616] font-bold transition-all appearance-none cursor-pointer"
              style={{
                backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23ff6002\' stroke-width=\'2.5\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")',
                backgroundPosition: 'right 1.25rem center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: '1.2em'
              }}
            >
              <option value="" disabled>Selecione a equipe</option>
              {equipesDisponiveis.map(eq => (
                <option key={eq.id} value={eq.nome}>{eq.nome}</option>
              ))}
            </select>
          </div>

          {/* Critérios Verticais */}
          <div className="space-y-12">
            {CRITERIOS.map((criterio) => {
              const valorSelecionado = notas[criterio.chave]
              return (
                <div key={criterio.chave} className="pt-2">
                  <div className="mb-4 pl-3.5 border-l-4 border-[#ff6002]">
                    <h3 className="text-lg sm:text-xl font-bold text-[#161616] tracking-tight">
                      {criterio.numero}. {criterio.titulo}
                    </h3>
                    <p className="text-[#3f3f3f] text-xs sm:text-sm leading-relaxed mt-1 font-normal">
                      {criterio.descricao}
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    {OPCOES_NOTA.map((opcao) => {
                      const isSelected = valorSelecionado === opcao.valor
                      return (
                        <div
                          key={opcao.valor}
                          onClick={() => handleNotaChange(criterio.chave, opcao.valor)}
                          className={`group flex items-center gap-4 px-5 py-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                            isSelected
                              ? 'border-[#ff6002] bg-[#fffeee]'
                              : 'border-[#818b9d]/25 bg-white hover:border-[#ff6002] hover:bg-[#fffeee]'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            isSelected 
                              ? 'border-[#ff6002] bg-white' 
                              : 'border-[#818b9d] group-hover:border-[#ff6002] bg-white'
                          }`}>
                            {isSelected ? (
                              <div className="w-2.5 h-2.5 bg-[#ff6002] rounded-full"></div>
                            ) : (
                              <div className="w-2.5 h-2.5 bg-[#ff6002]/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            )}
                          </div>

                          <div className={`text-xs sm:text-sm leading-normal truncate select-none transition-colors ${
                            isSelected 
                              ? 'text-[#161616] font-bold' 
                              : 'text-[#3f3f3f] group-hover:text-[#161616] font-medium'
                          }`}>
                            {opcao.texto}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Gestão de Tempo */}
          <div className="pt-6 border-t border-[#818b9d]/20">
            <div className="mb-4 pl-3.5 border-l-4 border-[#ff6002]">
              <h3 className="text-lg sm:text-xl font-bold text-[#161616] tracking-tight">
                Gestão de Tempo (Bônus)
              </h3>
              <p className="text-[#3f3f3f] text-xs sm:text-sm leading-relaxed mt-1 font-normal">
                Se a equipe tiver concluído dentro do tempo fornecido, atribua +2 pontos. Caso contrário, marque -2 pontos.
              </p>
            </div>

            <div className="space-y-2.5">
              <div
                onClick={() => {
                  setBonusTempo(2)
                  setErroValidacao('')
                }}
                className={`group flex items-center gap-4 px-5 py-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                  bonusTempo === 2
                    ? 'border-[#ff6002] bg-[#fffeee]'
                    : 'border-[#818b9d]/25 bg-white hover:border-[#ff6002] hover:bg-[#fffeee]'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                  bonusTempo === 2 
                    ? 'border-[#ff6002] bg-white' 
                    : 'border-[#818b9d] group-hover:border-[#ff6002] bg-white'
                }`}>
                  {bonusTempo === 2 ? (
                    <div className="w-2.5 h-2.5 bg-[#ff6002] rounded-full"></div>
                  ) : (
                    <div className="w-2.5 h-2.5 bg-[#ff6002]/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  )}
                </div>
                <span className={`text-xs sm:text-sm select-none transition-colors ${
                  bonusTempo === 2 
                    ? 'text-[#161616] font-bold' 
                    : 'text-[#3f3f3f] group-hover:text-[#161616] font-medium'
                }`}>
                  +2 pontos (Concluiu no tempo)
                </span>
              </div>

              <div
                onClick={() => {
                  setBonusTempo(-2)
                  setErroValidacao('')
                }}
                className={`group flex items-center gap-4 px-5 py-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                  bonusTempo === -2
                    ? 'border-[#ff6002] bg-[#fffeee]'
                    : 'border-[#818b9d]/25 bg-white hover:border-[#ff6002] hover:bg-[#fffeee]'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                  bonusTempo === -2 
                    ? 'border-[#ff6002] bg-white' 
                    : 'border-[#818b9d] group-hover:border-[#ff6002] bg-white'
                }`}>
                  {bonusTempo === -2 ? (
                    <div className="w-2.5 h-2.5 bg-[#ff6002] rounded-full"></div>
                  ) : (
                    <div className="w-2.5 h-2.5 bg-[#ff6002]/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  )}
                </div>
                <span className={`text-xs sm:text-sm select-none transition-colors ${
                  bonusTempo === -2 
                    ? 'text-[#161616] font-bold' 
                    : 'text-[#3f3f3f] group-hover:text-[#161616] font-medium'
                }`}>
                  -2 pontos (Estourou o limite)
                </span>
              </div>
            </div>
          </div>

          {/* Feedback / Observações */}
          <div className="pt-6 border-t border-[#818b9d]/20">
            <label className="block text-base font-bold text-[#161616] mb-2 tracking-tight">
              Deixe observações ou justificativas sobre a sua avaliação.
            </label>
            <textarea
              rows={4}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Texto de resposta longa"
              className="w-full p-4 border-2 border-[#818b9d]/30 rounded-2xl outline-none hover:border-[#ff6002] focus:border-[#ff6002] focus:bg-[#fffeee]/40 text-sm text-[#161616] transition-all resize-y placeholder:text-[#818b9d] bg-white font-medium"
            />
          </div>

          {erroValidacao && (
            <div className="p-4 rounded-xl text-center text-sm font-bold bg-red-50 text-red-600 border border-red-200">
              {erroValidacao}
            </div>
          )}

          {/* Botão de Envio */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#ff6002] hover:bg-[#dd4012] text-white px-6 py-5 rounded-2xl text-base font-bold transition-colors flex items-center justify-center cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <svg className="w-6 h-6 animate-spin text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
            ) : (
              'Enviar avaliação'
            )}
          </button>

        </form>
      )}

    </div>
  )
}