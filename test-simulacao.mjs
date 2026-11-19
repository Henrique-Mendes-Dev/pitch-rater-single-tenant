import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const PESOS = { problema: 3, validacao: 3, inovacao: 3, design: 2, execucao: 4, viabilidade: 3, pitch: 1.6 };

function calcularNota(detalhes, bonus) {
  let somaPonderada = 0;
  let somaPesos = 0;
  for (const [c, p] of Object.entries(PESOS)) {
    somaPonderada += detalhes[c] * p;
    somaPesos += p;
  }
  return Number((((somaPonderada / (somaPesos * 5)) * 98) + bonus).toFixed(2));
}

async function rodarTesteMock() {
  console.log('⏳ A iniciar injeção de dados de teste (5 Equipas x 4 Jurados)...');

  // 1. Limpar banco para não duplicar dados
  await supabase.from('avaliacoes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('equipes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('usuarios').delete().eq('cargo', 'avaliador');

  // 2. Inserir 5 Equipas
  const equipes = ['AlphaTech', 'BioInova', 'CyberMind', 'DataLoom', 'EcoSphere'];
  for (const nome of equipes) {
    await supabase.from('equipes').insert({ nome });
  }

  // 3. Inserir 4 Avaliadores
  const jurados = ['Ana Costa (UX)', 'Carlos Silva (Dev)', 'Marina Rocha (Biz)', 'Roberto Lima (Agile)'];
  for (const nome of jurados) {
    await supabase.from('usuarios').insert({
      nome, cargo: 'avaliador', pin: Math.floor(1000 + Math.random() * 9000).toString()
    });
  }

  // 4. Gerar 20 Avaliações Viciadas para testar Anti-Sweeping
  const avaliacoes = [];
  for (const jurado of jurados) {
    for (const equipe of equipes) {
      let det = {};
      
      // AlphaTech ganha tudo (ficará com Destaque Geral e será excluída do resto)
      if (equipe === 'AlphaTech') {
        det = { problema: 5, validacao: 5, inovacao: 5, design: 5, execucao: 5, viabilidade: 5, pitch: 5 };
      } 
      // BioInova ganha Inovação
      else if (equipe === 'BioInova') {
        det = { problema: 3, validacao: 3, inovacao: 5, design: 3, execucao: 3, viabilidade: 3, pitch: 3 };
      } 
      // CyberMind ganha Problema (Impacto)
      else if (equipe === 'CyberMind') {
        det = { problema: 5, validacao: 3, inovacao: 3, design: 3, execucao: 3, viabilidade: 3, pitch: 3 };
      } 
      // DataLoom ganha Pitch
      else if (equipe === 'DataLoom') {
        det = { problema: 3, validacao: 3, inovacao: 3, design: 3, execucao: 3, viabilidade: 3, pitch: 5 };
      } 
      // EcoSphere ganha Execução
      else if (equipe === 'EcoSphere') {
        det = { problema: 3, validacao: 3, inovacao: 3, design: 3, execucao: 5, viabilidade: 3, pitch: 3 };
      }

      const bonus = 2; // Todos ganham bónus de tempo neste teste
      const nota_final = calcularNota(det, bonus);

      avaliacoes.push({
        avaliador: jurado,
        equipe,
        nota_final,
        bonus,
        detalhes: det,
        feedback_geral: `Avaliação mockada gerada via script para a equipa ${equipe}.`
      });
    }
  }

  // 5. Injetar no Supabase
  const { error } = await supabase.from('avaliacoes').insert(avaliacoes);
  
  if (error) {
    console.error('❌ Erro ao inserir dados:', error);
  } else {
    console.log('✅ Sucesso! 20 avaliações inseridas perfeitamente. Pode atualizar o seu Dashboard!');
  }
}

rodarTesteMock();