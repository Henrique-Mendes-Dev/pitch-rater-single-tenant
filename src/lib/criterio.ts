import { Criterio, LikertOption } from '../types'

export const DESCRICOES_NOTA: LikertOption[] = [
  { val: 1, label: '1 (Insuficiente)', desc: 'Não contempla o critério ou o faz de forma muito fraca e pouco clara.' },
  { val: 2, label: '2 (Fraco)', desc: 'Atende de forma superficial, com lacunas evidentes e pouca sustentação.' },
  { val: 3, label: '3 (Adequado)', desc: 'Atende ao critério de forma satisfatória, mas com oportunidades de aprofundamento.' },
  { val: 4, label: '4 (Bom)', desc: 'Atende muito bem ao critério, demonstrando consistência e boa fundamentação.' },
  { val: 5, label: '5 (Excelente)', desc: 'Atende plenamente ao critério, com alta qualidade, clareza e exemplos concretos.' }
]

export const CRITERIOS: Criterio[] = [
  { id: 'problema', peso: 15, titulo: '1. Problema e Relevância', descricao: 'Avalia o quanto a solução proposta responde a um problema real e significativo para a sociedade, comunidade local ou um grupo específico, promovendo impacto positivo e transformação social.' },
  { id: 'validacao', peso: 15, titulo: '2. Validação e Solução', descricao: 'Alinhamento entre problema, público-alvo, solução proposta e resultados esperados, além do grau de clareza na relação causa-efeito.' },
  { id: 'inovacao', peso: 15, titulo: '3. Inovação e Originalidade', descricao: 'Analisa o grau de originalidade, ousadia e criatividade da proposta, considerando o uso de ideias novas ou reinvenção de soluções.' },
  { id: 'design', peso: 10, titulo: '4. Design e Usabilidade', descricao: 'Verifica se a solução contempla diferentes perfis de usuários, promovendo o acesso equitativo, a usabilidade e a redução de barreiras.' },
  { id: 'execucao', peso: 20, titulo: '5. Execução Técnica', descricao: 'Observa se a ideia é viável com os recursos disponíveis, considerando aspectos como tempo, tecnologia, custos e implementação.' },
  { id: 'viabilidade', peso: 15, titulo: '6. Viabilidade e Negócio', descricao: 'Potencial de ampliação para outros contextos, replicabilidade, sustentabilidade ao longo do tempo e efeitos positivos.' },
  { id: 'pitch', peso: 10, titulo: '7. Apresentação (Pitch)', descricao: 'Avalia a capacidade da equipe em comunicar de forma objetiva, estruturada e envolvente a sua proposta.' }
]

export function calcularNotaFinal(notas: Record<string, number | null>, bonus: number): number {
  const base =
    ((notas.problema ?? 0) * 15) +
    ((notas.validacao ?? 0) * 15) +
    ((notas.inovacao ?? 0) * 15) +
    ((notas.design ?? 0) * 10) +
    ((notas.execucao ?? 0) * 20) +
    ((notas.viabilidade ?? 0) * 15) +
    ((notas.pitch ?? 0) * 10)

  const normalized = (base / 500) * 98
  return Number((normalized + bonus).toFixed(2))
}