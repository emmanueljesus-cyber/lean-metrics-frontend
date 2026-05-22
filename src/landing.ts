/**
 * landing.ts — Lógica da página inicial (index.html)
 */

import './style.css';
import { iniciarLoginGitHub, buscarUsuarioAtual, atualizarNavbarUsuario, aplicarEstadoAuth } from './auth';
import { inicializarIcones } from './utils';

const METRICAS: Array<{ icone: string; titulo: string; descricao: string }> = [
  { icone: '<i data-lucide="clock" class="w-8 h-8 text-indigo-400"></i>', titulo: 'Lead Time',             descricao: 'Tempo médio entre a abertura de uma PR e o merge. Mede a velocidade de entrega.' },
  { icone: '<i data-lucide="rotate-cw" class="w-8 h-8 text-blue-400"></i>', titulo: 'Cycle Time',             descricao: 'Tempo médio entre a criação de uma issue e seu fechamento. Indica eficiência do processo.' },
  { icone: '<i data-lucide="activity" class="w-8 h-8 text-amber-400"></i>', titulo: 'WIP',                    descricao: 'Quantidade de PRs e issues abertas simultaneamente. Valores altos indicam gargalos.' },
  { icone: '<i data-lucide="zap" class="w-8 h-8 text-yellow-400"></i>', titulo: 'Throughput',             descricao: 'Número de PRs mergeadas nos últimos 30 dias. Mede a produtividade real da equipe.' },
  { icone: '<i data-lucide="bug" class="w-8 h-8 text-rose-400"></i>', titulo: 'Taxa de Defeitos',       descricao: 'Proporção de issues classificadas como bug. Indica a qualidade do processo.' },
  { icone: '<i data-lucide="layers" class="w-8 h-8 text-emerald-400"></i>', titulo: 'Retrabalho',             descricao: 'Commits com "fix" ou "bug" na mensagem. Sinaliza desperdício por falhas anteriores.' },
  { icone: '<i data-lucide="hourglass" class="w-8 h-8 text-purple-400"></i>', titulo: 'Waiting Time',           descricao: 'Estimativa do tempo que PRs ficam aguardando revisão antes de serem processadas.' },
  { icone: '<i data-lucide="code" class="w-8 h-8 text-cyan-400"></i>', titulo: 'Code Churn',             descricao: 'Média semanal de linhas alteradas nas últimas 4 semanas. Altos valores indicam instabilidade.' },
  { icone: '<i data-lucide="users" class="w-8 h-8 text-teal-400"></i>', titulo: 'Distribuição de Trabalho', descricao: 'Concentração de commits por desenvolvedor. Identifica gargalos humanos e riscos.' },
];

function renderizarGradeMetricas(): void {
  const grade = document.getElementById('grade-metricas');
  if (!grade) return;

  grade.innerHTML = METRICAS.map((m, i) => `
    <div class="glass-card glass-card-hover p-5 cursor-default flex flex-col gap-3"
         style="animation: entrar-baixo 0.5s ease ${i * 0.06}s both;">
      <div class="flex items-center justify-start" style="height: 2.5rem;">${m.icone}</div>
      <h4 style="font-size: 1rem; font-weight: 700; margin-bottom: 0.1rem;">${m.titulo}</h4>
      <p style="font-size: 0.82rem; color: var(--color-texto-suave); line-height: 1.5;">${m.descricao}</p>
    </div>
  `).join('');
}

async function iniciar(): Promise<void> {
  renderizarGradeMetricas();

  const usuario = await buscarUsuarioAtual();
  aplicarEstadoAuth(!!usuario);
  if (usuario) atualizarNavbarUsuario(usuario);

  // Botões de login
  const btnIds = ['btn-entrar', 'btn-hero-login', 'btn-cta-login'];
  btnIds.forEach(id => {
    document.getElementById(id)?.addEventListener('click', iniciarLoginGitHub);
  });

  inicializarIcones();
}

iniciar();
