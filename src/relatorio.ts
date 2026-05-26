/**
 * relatorio.ts — Lógica da página de Relatório Lean detalhado
 * Carrega métricas do repositório cadastrado e exibe gráficos com Chart.js
 */

import './style.css';
import { Chart, registerables } from 'chart.js';
import { exigirAutenticacao, atualizarNavbarUsuario, mostrarToast } from './autenticacao';
import { api, ErroApiHTTP } from './api';
import {
  obterIdDaUrl, formatarData, formatarValorMetrica, horasParaTexto, htmlErro, inicializarIcones,
} from './utilitarios';
import {
  NOMES_METRICAS, NOMES_CATEGORIAS,
  type RelatorioRepositorio, type ValorMetrica, type SinalDesperdicio, type Severidade,
} from './tipos';

Chart.register(...registerables);

// ── Config de cor do Chart.js ──────────────────────────────────────

const isLight = document.documentElement.classList.contains('light');

const CHART_DEFAULTS = {
  cor:       '#00c896',
  corAlfa:   'rgba(0,200,150,0.15)',
  corGrid:   isLight ? 'rgba(15, 23, 42, 0.06)' : 'rgba(255,255,255,0.05)',
  corTexto:  isLight ? '#475569' : '#8b9ab3',
};

Chart.defaults.color             = CHART_DEFAULTS.corTexto;
Chart.defaults.borderColor       = CHART_DEFAULTS.corGrid;
Chart.defaults.font.family       = "'Inter', system-ui, sans-serif";
Chart.defaults.plugins.legend.display = false;

// ── Helpers de renderização ───────────────────────────────────────

function metricaPorNome(relatorio: RelatorioRepositorio, nome: string): ValorMetrica | undefined {
  return relatorio.metrics.find(m => m.name === nome);
}

function valorOuNull(relatorio: RelatorioRepositorio, nome: string): number | null {
  return metricaPorNome(relatorio, nome)?.value ?? null;
}

function renderizarCabecalho(relatorio: RelatorioRepositorio, nomeRepo: string): void {
  const cabecalho = document.getElementById('cabecalho-relatorio')!;
  cabecalho.innerHTML = `
    <div class="flex items-center gap-2 text-sm mb-3" style="color: var(--color-texto-suave);">
      <a href="/painel.html" style="color: var(--color-texto-suave);">Painel</a>
      <span>›</span>
      <span>${nomeRepo}</span>
      <span>›</span>
      <span style="color: var(--color-texto);">Relatório Lean</span>
    </div>
    <div class="glass-card p-5 flex flex-wrap items-center justify-between gap-4 animar-entrar"
         style="border-color: rgba(0,200,150,0.3); background: rgba(0,200,150,0.04);">
      <div class="flex-1 min-w-[250px]">
        <h1 class="text-3xl font-extrabold tracking-tight mb-1" style="color: var(--color-texto);">${nomeRepo}</h1>
        <p class="text-sm" style="color: var(--color-texto-suave);">
          Gerado em ${formatarData(relatorio.gerado_em)}
          · ${relatorio.metrics.length} métricas · ${relatorio.waste_signals.length} sinais de desperdício
        </p>
        
        ${relatorio.performance ? `
        <div class="flex flex-wrap items-center gap-2 mt-3 text-xs font-mono" style="color: var(--color-acento);">
          <span class="inline-block w-2.5 h-2.5 rounded-full ${relatorio.performance.cache_hit ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}"></span>
          <span class="flex items-center gap-1"><i data-lucide="zap" class="w-3.5 h-3.5 text-emerald-400"></i> ${relatorio.performance.cache_hit ? 'CACHE HIT' : 'CACHE MISS'} · Processado em ${relatorio.performance.tempo_total.toFixed(4)}s</span>
        </div>
        ` : ''}
      </div>
      <div class="flex gap-3 items-center">
        <a href="https://github.com/${nomeRepo}" target="_blank" rel="noopener"
           class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors duration-200"
           style="color: var(--color-texto-suave); background: var(--color-fundo-card); border-color: var(--color-borda); text-decoration: none;"
           onmouseover="this.style.borderColor='var(--color-borda-hover)'; this.style.color='var(--color-texto)'"
           onmouseout="this.style.borderColor='var(--color-borda)'; this.style.color='var(--color-texto-suave)'">
          Ver no GitHub <i data-lucide="git-branch" class="w-4 h-4"></i>
        </a>
      </div>

      ${relatorio.performance ? `
      <div class="w-full mt-2 p-3 rounded-lg border text-xs font-mono overflow-x-auto"
           style="background: rgba(0,0,0,0.15); border-color: var(--color-borda); color: var(--color-texto-suave);">
        <span style="color: var(--color-acento); font-weight: bold;">[PERF LOGS]</span> ${relatorio.performance.detalhes}
      </div>
      ` : ''}
    </div>
  `;
  inicializarIcones();
}

const METRICS_ICONS: Record<string, { icon: string; colorClass: string }> = {
  lead_time_pr_hours:          { icon: 'clock',       colorClass: 'text-indigo-400' },
  cycle_time_issue_hours:      { icon: 'rotate-cw',   colorClass: 'text-blue-400' },
  waiting_time_pr_hours:       { icon: 'hourglass',   colorClass: 'text-purple-400' },
  wip_open_pull_requests:      { icon: 'activity',    colorClass: 'text-amber-400' },
  wip_open_issues:             { icon: 'activity',    colorClass: 'text-amber-400' },
  abandoned_issues_count:      { icon: 'alert-circle', colorClass: 'text-amber-500' },
  throughput_30d:              { icon: 'zap',         colorClass: 'text-yellow-400' },
  commit_velocity_daily:       { icon: 'trending-up', colorClass: 'text-yellow-500' },
  days_since_last_commit:      { icon: 'calendar',    colorClass: 'text-gray-400' },
  defect_rate:                 { icon: 'bug',         colorClass: 'text-rose-400' },
  rework_fix_commit_ratio:     { icon: 'layers',      colorClass: 'text-emerald-400' },
  chaotic_commit_ratio:        { icon: 'alert-triangle', colorClass: 'text-rose-500' },
  rejected_pr_ratio:           { icon: 'alert-circle', colorClass: 'text-rose-300' },
  top_contributor_share:       { icon: 'users',       colorClass: 'text-teal-400' },
  active_contributors_30d:     { icon: 'users',       colorClass: 'text-teal-400' },
  contributor_distribution:    { icon: 'users',       colorClass: 'text-teal-500' },
  code_churn_weekly_avg:       { icon: 'code',        colorClass: 'text-cyan-400' },
  most_active_branch_name:     { icon: 'git-branch',  colorClass: 'text-orange-400' },
  most_active_branch_days:     { icon: 'git-branch',  colorClass: 'text-orange-400' },
  total_commits_sampled:       { icon: 'database',    colorClass: 'text-slate-400' },
  total_prs_sampled:           { icon: 'git-pull-request', colorClass: 'text-slate-400' },
  open_issues_repository_total:{ icon: 'hash',        colorClass: 'text-slate-400' },
};

function htmlCardMetrica(metrica: ValorMetrica, delay: number): string {
  const nome = NOMES_METRICAS[metrica.name] ?? metrica.name;
  let valor = formatarValorMetrica(metrica.value, metrica.unit);
  let isNulo = metrica.value === null || metrica.value === undefined;

  // Ajuste especial para exibir o nome da branch ativa quando o valor e nulo
  if (metrica.name === 'most_active_branch_name' && metrica.extra && metrica.extra.branch_name) {
    valor = String(metrica.extra.branch_name);
    isNulo = false;
  }

  const cfg = METRICS_ICONS[metrica.name] ?? { icon: 'info', colorClass: 'text-[#00c896]' };
  const iconeHtml = `<i data-lucide="${cfg.icon}" class="w-5 h-5 ${cfg.colorClass}"></i>`;

  return `
    <div class="glass-card p-5 flex flex-col justify-between gap-4 animar-entrar relative group cursor-help w-full"
         style="animation-delay: ${delay}s; min-height: 120px;"
         data-tooltip="${metrica.description}"
         onmouseover="this.style.borderColor='var(--color-borda-hover)'; this.style.transform='translateY(-2px)'"
         onmouseout="this.style.borderColor='var(--color-borda)'; this.style.transform=''">
      <div class="flex items-start justify-between gap-2 w-full">
        <p class="text-xs font-semibold uppercase tracking-widest" style="color: var(--color-texto-suave);">${nome}</p>
        <span class="flex-shrink-0 flex items-center justify-center p-1 rounded-lg" style="background: rgba(255,255,255,0.02); border: 1px solid var(--color-borda);">
          ${iconeHtml}
        </span>
      </div>
      <p class="font-extrabold" style="font-size: 2rem; letter-spacing: -0.03em; line-height: 1; color: ${isNulo ? 'var(--color-texto-fraco)' : 'var(--color-acento)'};">
        ${isNulo ? '—' : valor}
      </p>
    </div>
  `;
}

const ICONES_CATEGORIA: Record<string, string> = {
  waiting:                        '<i data-lucide="clock" class="w-5 h-5 text-indigo-400"></i>',
  work_in_progress:               '<i data-lucide="activity" class="w-5 h-5 text-amber-400"></i>',
  defects:                        '<i data-lucide="bug" class="w-5 h-5 text-rose-400"></i>',
  extra_processing:               '<i data-lucide="sliders" class="w-5 h-5 text-purple-400"></i>',
  handoff:                        '<i data-lucide="users" class="w-5 h-5 text-teal-400"></i>',
  partially_done:                 '<i data-lucide="layers" class="w-5 h-5 text-cyan-400"></i>',
  'Espera':                       '<i data-lucide="clock" class="w-5 h-5 text-indigo-400"></i>',
  'WIP excessivo':                '<i data-lucide="activity" class="w-5 h-5 text-amber-400"></i>',
  'Defeitos / Retrabalho':        '<i data-lucide="bug" class="w-5 h-5 text-rose-400"></i>',
  'Processamento desnecessário':  '<i data-lucide="sliders" class="w-5 h-5 text-purple-400"></i>',
  'Centralização de trabalho':    '<i data-lucide="users" class="w-5 h-5 text-teal-400"></i>',
  'Trabalho parcialmente feito':  '<i data-lucide="layers" class="w-5 h-5 text-cyan-400"></i>',
};

const CORES_SEV: Record<Severidade, { bg: string; borda: string; texto: string }> = {
  high:   { bg: 'rgba(255,77,109,0.08)',  borda: 'rgba(255,77,109,0.3)',  texto: '#ff4d6d' },
  medium: { bg: 'rgba(255,184,77,0.08)', borda: 'rgba(255,184,77,0.3)', texto: '#ffb84d' },
  low:    { bg: 'rgba(77,207,255,0.08)', borda: 'rgba(77,207,255,0.3)', texto: '#4dcfff' },
  alta:   { bg: 'rgba(255,77,109,0.08)',  borda: 'rgba(255,77,109,0.3)',  texto: '#ff4d6d' },
  média:  { bg: 'rgba(255,184,77,0.08)', borda: 'rgba(255,184,77,0.3)', texto: '#ffb84d' },
  baixa:  { bg: 'rgba(77,207,255,0.08)', borda: 'rgba(77,207,255,0.3)', texto: '#4dcfff' },
};

const SEV_PT: Record<Severidade, string> = {
  high: 'Alta', medium: 'Média', low: 'Baixa',
  alta: 'Alta', média: 'Média', baixa: 'Baixa'
};

function htmlSinalDesperdicio(sinal: SinalDesperdicio, delay: number): string {
  const cor   = CORES_SEV[sinal.severity];
  const icone = ICONES_CATEGORIA[sinal.category] ?? '<i data-lucide="alert-triangle" class="w-5 h-5 text-amber-400"></i>';
  const cat   = NOMES_CATEGORIAS[sinal.category] ?? sinal.category;

  return `
    <div class="flex items-start gap-4 rounded-xl p-4 animar-entrar"
         style="background: ${cor.bg}; border: 1px solid ${cor.borda}; animation-delay: ${delay}s;">
      <div class="flex-shrink-0 mt-0.5 flex items-center justify-center">${icone}</div>
      <div class="flex-1">
        <div class="flex items-center gap-2 mb-1 flex-wrap">
          <span class="text-xs font-semibold uppercase tracking-wide"
                style="color: var(--color-texto-suave);">${cat}</span>
          <span class="text-xs font-bold px-2 py-0.5 rounded-full"
                style="background: ${cor.borda}; color: ${cor.texto};">${SEV_PT[sinal.severity]}</span>
        </div>
        <p class="text-sm" style="color: var(--color-texto); line-height: 1.5;">${sinal.message}</p>
      </div>
    </div>
  `;
}

// ── Gráficos ───────────────────────────────────────────────────────

function criarGraficoLeadTime(relatorio: RelatorioRepositorio): void {
  const metrica = metricaPorNome(relatorio, 'lead_time_pr_hours');
  const serie   = (metrica?.extra as { per_pr?: Array<{ id: string; value: number }> } | null)?.per_pr;
  const canvas  = document.getElementById('grafico-lead-time') as HTMLCanvasElement | null;
  if (!canvas || !serie || serie.length === 0) return;

  new Chart(canvas, {
    type: 'bar',
    data: {
      labels:   serie.map(p => `PR #${p.id}`),
      datasets: [{
        label:           'Lead Time (horas)',
        data:            serie.map(p => p.value),
        backgroundColor: CHART_DEFAULTS.corAlfa,
        borderColor:     CHART_DEFAULTS.cor,
        borderWidth:     2,
        borderRadius:    6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { tooltip: { callbacks: { label: ctx => ` ${horasParaTexto(ctx.raw as number)}` } } },
      scales: {
        x: { grid: { color: CHART_DEFAULTS.corGrid }, ticks: { maxRotation: 45, color: CHART_DEFAULTS.corTexto } },
        y: { grid: { color: CHART_DEFAULTS.corGrid }, ticks: { color: CHART_DEFAULTS.corTexto } },
      },
    },
  });
}

function criarGraficoThroughput(relatorio: RelatorioRepositorio): void {
  const metrica = metricaPorNome(relatorio, 'throughput_30d');
  const serie   = (metrica?.extra as { weekly?: Array<{ date: string; value: number }> } | null)?.weekly;
  const canvas  = document.getElementById('grafico-throughput') as HTMLCanvasElement | null;
  if (!canvas || !serie || serie.length === 0) return;

  new Chart(canvas, {
    type: 'line',
    data: {
      labels:   serie.map(s => s.date),
      datasets: [{
        label:           'PRs mergeadas',
        data:            serie.map(s => s.value),
        borderColor:     CHART_DEFAULTS.cor,
        backgroundColor: CHART_DEFAULTS.corAlfa,
        fill:            true,
        tension:         0.4,
        pointBackgroundColor: CHART_DEFAULTS.cor,
        pointRadius:     4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { color: CHART_DEFAULTS.corGrid }, ticks: { color: CHART_DEFAULTS.corTexto } },
        y: { grid: { color: CHART_DEFAULTS.corGrid }, ticks: { color: CHART_DEFAULTS.corTexto, stepSize: 1 } },
      },
    },
  });
}

function criarGraficoDistribuicao(relatorio: RelatorioRepositorio): void {
  const metrica  = metricaPorNome(relatorio, 'contributor_distribution');
  const dist     = metrica?.extra as Record<string, number> | null;
  const canvas   = document.getElementById('grafico-distribuicao') as HTMLCanvasElement | null;
  if (!canvas || !dist || Object.keys(dist).length === 0) return;

  const entradas = Object.entries(dist).sort((a, b) => b[1] - a[1]).slice(0, 8);

  const CORES_PIZZA = [
    '#00c896','#4dcfff','#a78bfa','#f472b6',
    '#fb923c','#facc15','#34d399','#818cf8',
  ];

  new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels:   entradas.map(([nome]) => nome),
      datasets: [{
        data:            entradas.map(([, v]) => Math.round(v * 100)),
        backgroundColor: CORES_PIZZA,
        borderColor:     '#070d1a',
        borderWidth:     3,
        hoverOffset:     8,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display:  true,
          position: 'right',
          labels:   { color: CHART_DEFAULTS.corTexto, font: { size: 11 }, padding: 12 },
        },
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw}%` } },
      },
    },
  });
}

// ── Renderização completa ─────────────────────────────────────────

function renderizarRelatorio(relatorio: RelatorioRepositorio): void {
  // Métricas-chave para cards do topo
  const metricasDestaque = [
    'lead_time_pr_hours', 'cycle_time_issue_hours', 'waiting_time_pr_hours',
    'wip_open_pull_requests', 'wip_open_issues', 'throughput_30d',
    'defect_rate', 'rework_fix_commit_ratio', 'active_contributors_30d',
    'top_contributor_share', 'code_churn_weekly_avg', 'days_since_last_commit',
  ];

  const metricasFiltradas = relatorio.metrics.filter(m => 
    m.name !== 'contributor_distribution' &&
    m.name !== 'total_commits_sampled' &&
    m.name !== 'total_prs_sampled' &&
    m.name !== 'open_issues_repositorio_total'
  );

  const metricasOrdenadas = [
    ...metricasDestaque.map(n => metricasFiltradas.find(m => m.name === n)).filter(Boolean) as ValorMetrica[],
    ...metricasFiltradas.filter(m => !metricasDestaque.includes(m.name)),
  ];

  const temSinais     = relatorio.waste_signals.length > 0;
  const sinaisOrdenados = [...relatorio.waste_signals].sort((a, b) => {
    const ordem: Record<Severidade, number> = { high: 0, medium: 1, low: 2, alta: 0, média: 1, baixa: 2 };
    return ordem[a.severity] - ordem[b.severity];
  });

  const temLeadTime   = !!(metricaPorNome(relatorio, 'lead_time_pr_hours')?.extra as { per_pr?: unknown[] } | null)?.per_pr?.length;
  const temThroughput = !!(metricaPorNome(relatorio, 'throughput_30d')?.extra as { weekly?: unknown[] } | null)?.weekly?.length;
  const temDist       = !!Object.keys((metricaPorNome(relatorio, 'contributor_distribution')?.extra ?? {}) as object).length;

  document.getElementById('area-relatorio')!.innerHTML = `
    <!-- Sinais de desperdício -->
    ${temSinais ? `
    <section class="mb-10">
      <div class="flex items-center gap-3 mb-5">
        <h2 class="text-xl font-bold flex items-center gap-1.5"><i data-lucide="alert-triangle" class="w-5 h-5 text-[#ff4d6d]"></i> Sinais de desperdício</h2>
        <span class="text-xs font-bold px-2.5 py-1 rounded-full"
              style="background: rgba(255,77,109,0.15); color: #ff4d6d; border: 1px solid rgba(255,77,109,0.25);">
          ${sinaisOrdenados.length} detectado${sinaisOrdenados.length > 1 ? 's' : ''}
        </span>
      </div>
      <div class="flex flex-col gap-3">
        ${sinaisOrdenados.map((s, i) => htmlSinalDesperdicio(s, i * 0.07)).join('')}
      </div>
    </section>` : `
    <section class="mb-10">
      <div class="glass-card p-6 flex items-center gap-4"
           style="border-color: rgba(0,200,150,0.3); background: rgba(0,200,150,0.05);">
        <i data-lucide="check-circle" class="w-8 h-8 text-[#00c896] flex-shrink-0"></i>
        <div>
          <p class="font-semibold text-lg" style="color: var(--color-acento);">Nenhum desperdício detectado</p>
          <p class="text-sm" style="color: var(--color-texto-suave);">As métricas do repositório estão dentro dos limites aceitáveis.</p>
        </div>
      </div>
    </section>`}

    <!-- Grade de métricas -->
    <section class="mb-10">
      <h2 class="text-xl font-bold mb-5 flex items-center gap-1.5"><i data-lucide="bar-chart-3" class="w-5 h-5 text-[#00c896]"></i> Métricas Lean</h2>
      <div class="grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));">
        ${metricasOrdenadas.map((m, i) => htmlCardMetrica(m, i * 0.04)).join('')}
      </div>
    </section>

    <!-- Gráficos -->
    ${temLeadTime || temThroughput || temDist ? `
    <section class="mb-10">
      <h2 class="text-xl font-bold mb-5 flex items-center gap-1.5"><i data-lucide="activity" class="w-5 h-5 text-[#00c896]"></i> Gráficos</h2>
      <div class="grid gap-6 ${temLeadTime && temThroughput ? 'md:grid-cols-2' : ''}">

        ${temLeadTime ? `
        <div class="glass-card p-5">
          <h3 class="font-semibold text-sm mb-4" style="color: var(--color-texto-suave);">
            Lead Time por PR (horas)
          </h3>
          <div style="height: 260px; position: relative;">
            <canvas id="grafico-lead-time"></canvas>
          </div>
        </div>` : ''}

        ${temThroughput ? `
        <div class="glass-card p-5">
          <h3 class="font-semibold text-sm mb-4" style="color: var(--color-texto-suave);">
            Throughput semanal (PRs mergeadas)
          </h3>
          <div style="height: 260px; position: relative;">
            <canvas id="grafico-throughput"></canvas>
          </div>
        </div>` : ''}

        ${temDist ? `
        <div class="glass-card p-5 ${temLeadTime && temThroughput ? 'md:col-span-2' : ''}">
          <h3 class="font-semibold text-sm mb-4" style="color: var(--color-texto-suave);">
            Distribuição de commits por desenvolvedor (%)
          </h3>
          <div style="height: 280px; position: relative;">
            <canvas id="grafico-distribuicao"></canvas>
          </div>
        </div>` : ''}

      </div>
    </section>` : ''}

    <!-- Rodapé do relatório -->
    <div class="text-center py-8" style="border-top: 1px solid var(--color-borda); margin-top: 2rem;">
      <p class="text-sm" style="color: var(--color-texto-suave);">
        Relatório gerado em ${formatarData(relatorio.gerado_em)}
        · Dados coletados via <strong style="color: var(--color-texto);">GitHub REST API</strong>
        · Amostra: ${valorOuNull(relatorio, 'total_commits_sampled') ?? '—'} commits,
          ${valorOuNull(relatorio, 'total_prs_sampled') ?? '—'} PRs
      </p>
    </div>
  `;

  // Renderiza gráficos depois que o DOM está pronto
  requestAnimationFrame(() => {
    criarGraficoLeadTime(relatorio);
    criarGraficoThroughput(relatorio);
    criarGraficoDistribuicao(relatorio);
    inicializarIcones();
  });
}

// ── Inicialização ──────────────────────────────────────────────────

async function iniciar(): Promise<void> {
  const usuario = await exigirAutenticacao();
  atualizarNavbarUsuario(usuario);

  const repositorioId = obterIdDaUrl('id');
  if (!repositorioId) {
    document.getElementById('area-relatorio')!.innerHTML = htmlErro(
      'ID do repositório inválido na URL. Volte ao dashboard.',
    );
    return;
  }

  try {
    // Busca o repositório para obter o nome
    const repo     = await api.repositorios.buscar(repositorioId);
    const relatorio = await api.relatorios.gerar(repositorioId);

    renderizarCabecalho(relatorio, repo.full_name);
    renderizarRelatorio(relatorio);
  } catch (err) {
    const mensagem = err instanceof ErroApiHTTP
      ? (err.status === 404 ? 'Repositório não encontrado ou sem permissão de acesso.' : err.message)
      : 'Falha ao gerar o relatório. Tente novamente.';

    mostrarToast(mensagem, 'erro');
    document.getElementById('area-relatorio')!.innerHTML = htmlErro(mensagem);
    inicializarIcones();
  }
}

iniciar();
