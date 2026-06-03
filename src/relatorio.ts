/**
 * relatorio.ts — Lógica da página de Relatório Lean detalhado
 * Carrega métricas do repositório cadastrado e exibe gráficos interativos via abas.
 */

import './style.css';
import './graficos/graficos.css';
import { exigirAutenticacao, atualizarNavbarUsuario, mostrarToast } from './autenticacao';
import { api, ErroApiHTTP } from './api';
import {
  obterIdDaUrl, formatarData, formatarValorMetrica, htmlErro, inicializarIcones,
} from './utilitarios';
import {
  NOMES_METRICAS, NOMES_CATEGORIAS,
  type RelatorioRepositorio, type ValorMetrica, type SinalDesperdicio, type Severidade,
} from './tipos';

import { converterRelatorio, type DadosDashboard } from './graficos/dados';
import { exportarCSV, exportarJSON, exportarPNG } from './graficos/exportar';
import { renderComparativo } from './graficos/charts/comparativo';
import { renderDonut } from './graficos/charts/donut';
import { renderLinhaHistorica, renderDesperdiciosAcumulados } from './graficos/charts/linha-historica';
import ApexCharts from 'apexcharts';

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

// ── Estado Global do Relatório e Abas ──────────────────────────────
let relatorioDados: RelatorioRepositorio | null = null;
let graficosRenderizados = false;

function alternarTab(aba: 'relatorio' | 'graficos'): void {
  const tabRelatorio = document.getElementById('conteudo-tab-relatorio')!;
  const tabGraficos  = document.getElementById('conteudo-tab-graficos')!;
  const btnRelatorio = document.getElementById('btn-tab-relatorio')!;
  const btnGraficos  = document.getElementById('btn-tab-graficos')!;

  if (aba === 'relatorio') {
    tabRelatorio.style.display = '';
    tabGraficos.style.display  = 'none';

    btnRelatorio.style.color = 'var(--color-acento)';
    btnRelatorio.style.borderColor = 'var(--color-acento)';
    btnGraficos.style.color = 'var(--color-texto-suave)';
    btnGraficos.style.borderColor = 'transparent';

    const navGraficos = document.getElementById('nav-link-graficos');
    const navRelatorio = document.getElementById('nav-link-relatorio');
    if (navGraficos && navRelatorio) {
      navGraficos.style.color = 'var(--color-texto-suave)';
      navGraficos.style.background = 'transparent';
      navRelatorio.style.color = 'var(--color-acento)';
      navRelatorio.style.background = 'var(--color-acento-suave)';
    }
  } else {
    tabRelatorio.style.display = 'none';
    tabGraficos.style.display  = '';

    btnRelatorio.style.color = 'var(--color-texto-suave)';
    btnRelatorio.style.borderColor = 'transparent';
    btnGraficos.style.color = 'var(--color-acento)';
    btnGraficos.style.borderColor = 'var(--color-acento)';

    const navGraficos = document.getElementById('nav-link-graficos');
    const navRelatorio = document.getElementById('nav-link-relatorio');
    if (navGraficos && navRelatorio) {
      navGraficos.style.color = 'var(--color-acento)';
      navGraficos.style.background = 'var(--color-acento-suave)';
      navRelatorio.style.color = 'var(--color-texto-suave)';
      navRelatorio.style.background = 'transparent';
    }

    if (!graficosRenderizados && relatorioDados) {
      renderizarDashboardGraficos(relatorioDados);
      graficosRenderizados = true;
    }
  }
}

// ── Lógica de Metas e Lean Score ───────────────────────────────────

interface MetasConfig {
  leadTime: number;
  reviewTime: number;
  wip: number;
  defectRate: number;
}

function obterMetas(repoName: string): MetasConfig {
  const key = `metas_${repoName}`;
  const saved = localStorage.getItem(key);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      // Ignora erro
    }
  }
  return {
    leadTime: 120,    // 5 dias
    reviewTime: 24,   // 24 horas
    wip: 10,
    defectRate: 5     // 5%
  };
}

function salvarMetas(repoName: string, metas: MetasConfig): void {
  const key = `metas_${repoName}`;
  localStorage.setItem(key, JSON.stringify(metas));
}

function calcularSubScore(atual: number | null, meta: number): number {
  if (atual === null || atual === undefined) return 100;
  if (atual <= meta) return 100;
  return Math.max(0, Math.round(100 - ((atual - meta) / meta) * 100));
}

function calcularLeanScore(metas: MetasConfig): {
  leanScore: number;
  scoreLeadTime: number;
  scoreReview: number;
  scoreWIP: number;
  scoreDefectRate: number;
} {
  const leadTimeVal = valorOuNull(relatorioDados!, 'lead_time_pr_hours');
  const reviewTimeVal = valorOuNull(relatorioDados!, 'waiting_time_pr_hours');
  const wipPRs = valorOuNull(relatorioDados!, 'wip_open_pull_requests') ?? 0;
  const wipIssues = valorOuNull(relatorioDados!, 'wip_open_issues') ?? 0;
  const wipVal = wipPRs + wipIssues;
  const defectRateVal = (valorOuNull(relatorioDados!, 'defect_rate') ?? 0) * 100;

  const scoreLeadTime = calcularSubScore(leadTimeVal, metas.leadTime);
  const scoreReview = calcularSubScore(reviewTimeVal, metas.reviewTime);
  const scoreWIP = calcularSubScore(wipVal, metas.wip);
  const scoreDefectRate = calcularSubScore(defectRateVal, metas.defectRate);

  const leanScore = Math.round((scoreLeadTime + scoreReview + scoreWIP + scoreDefectRate) / 4);

  return {
    leanScore,
    scoreLeadTime,
    scoreReview,
    scoreWIP,
    scoreDefectRate
  };
}

// ── Renderização das Sub-Abas ─────────────────────────────────────

function renderizarSubtabMetas(dados: DadosDashboard): void {
  const metas = obterMetas(dados.repositorio);

  // Preencher inputs
  const inputLead = document.getElementById('input-meta-lead-time') as HTMLInputElement | null;
  const inputReview = document.getElementById('input-meta-review-time') as HTMLInputElement | null;
  const inputWIP = document.getElementById('input-meta-wip') as HTMLInputElement | null;
  const inputDefeitos = document.getElementById('input-meta-defeitos') as HTMLInputElement | null;

  if (inputLead) inputLead.value = String(metas.leadTime);
  if (inputReview) inputReview.value = String(metas.reviewTime);
  if (inputWIP) inputWIP.value = String(metas.wip);
  if (inputDefeitos) inputDefeitos.value = String(metas.defectRate);

  // Calcular pontuações
  const scoreInfo = calcularLeanScore(metas);

  // Atualizar Badges de Metas
  const badgeLead = document.getElementById('badge-meta-lead-time');
  const badgeReview = document.getElementById('badge-meta-review-time');
  const badgeWip = document.getElementById('badge-meta-wip');
  const badgeDefeitos = document.getElementById('badge-meta-defeitos');

  if (badgeLead) badgeLead.textContent = `Meta: ${metas.leadTime}h`;
  if (badgeReview) badgeReview.textContent = `Meta: ${metas.reviewTime}h`;
  if (badgeWip) badgeWip.textContent = `Meta: ${metas.wip} itens`;
  if (badgeDefeitos) badgeDefeitos.textContent = `Meta: ${metas.defectRate}%`;

  // Renderizar Gauge do Lean Score
  const containerGauge = document.getElementById('chart-lean-score');
  if (containerGauge) {
    containerGauge.innerHTML = '';
    const isLightMode = document.documentElement.classList.contains('light');
    const scoreColor = scoreInfo.leanScore >= 80 ? '#00c896' : scoreInfo.leanScore >= 50 ? '#ffb84d' : '#ff4d6d';
    const gaugeChart = new ApexCharts(containerGauge, {
      chart: {
        type: 'radialBar',
        height: 180,
        sparkline: { enabled: true }
      },
      series: [scoreInfo.leanScore],
      colors: [scoreColor],
      plotOptions: {
        radialBar: {
          hollow: { size: '65%' },
          dataLabels: {
            show: true,
            name: { show: false },
            value: {
              show: true,
              fontSize: '28px',
              fontWeight: 'bold',
              offsetY: 8,
              color: isLightMode ? '#0f172a' : '#e8edf5'
            }
          }
        }
      },
      labels: ['Índice Lean']
    });
    gaugeChart.render();
  }

  // Renderizar gráficos comparativos
  const leadTimeVal = valorOuNull(relatorioDados!, 'lead_time_pr_hours') ?? 0;
  const reviewTimeVal = valorOuNull(relatorioDados!, 'waiting_time_pr_hours') ?? 0;
  const wipPRs = valorOuNull(relatorioDados!, 'wip_open_pull_requests') ?? 0;
  const wipIssues = valorOuNull(relatorioDados!, 'wip_open_issues') ?? 0;
  const wipVal = wipPRs + wipIssues;
  const defectRateVal = (valorOuNull(relatorioDados!, 'defect_rate') ?? 0) * 100;

  const containerLead = document.getElementById('chart-meta-lead-time');
  if (containerLead) containerLead.innerHTML = '';
  renderComparativo('chart-meta-lead-time', 'Lead Time', +leadTimeVal.toFixed(1), metas.leadTime, 'h', true);

  const containerReview = document.getElementById('chart-meta-review-time');
  if (containerReview) containerReview.innerHTML = '';
  renderComparativo('chart-meta-review-time', 'Waiting Time', +reviewTimeVal.toFixed(1), metas.reviewTime, 'h', true);

  const containerWIP = document.getElementById('chart-meta-wip');
  if (containerWIP) containerWIP.innerHTML = '';
  renderComparativo('chart-meta-wip', 'WIP Total', wipVal, metas.wip, 'itens', true);

  const containerDefeitos = document.getElementById('chart-meta-defeitos');
  if (containerDefeitos) containerDefeitos.innerHTML = '';
  renderComparativo('chart-meta-defeitos', 'Taxa de Defeitos', +defectRateVal.toFixed(1), metas.defectRate, '%', true);

  // Vincular ação do botão de salvar
  const btnSalvar = document.getElementById('btn-salvar-metas');
  if (btnSalvar) {
    btnSalvar.onclick = () => {
      const novaLead = +(inputLead?.value ?? metas.leadTime);
      const novaReview = +(inputReview?.value ?? metas.reviewTime);
      const novoWip = +(inputWIP?.value ?? metas.wip);
      const novaDefeitos = +(inputDefeitos?.value ?? metas.defectRate);

      const novasMetas = {
        leadTime: Math.max(1, novaLead),
        reviewTime: Math.max(1, novaReview),
        wip: Math.max(1, novoWip),
        defectRate: Math.max(0, Math.min(100, novaDefeitos))
      };

      salvarMetas(dados.repositorio, novasMetas);
      mostrarToast('Metas atualizadas com sucesso!', 'sucesso');
      renderizarSubtabMetas(dados);
    };
  }
}

function renderizarSubtabDistribuicao(dados: DadosDashboard): void {
  const chartDesperdicios = document.getElementById('chart-dist-desperdicios');
  if (chartDesperdicios) chartDesperdicios.innerHTML = '';
  renderDonut(
    'chart-dist-desperdicios',
    dados.distribuicao_desperdicios.labels,
    dados.distribuicao_desperdicios.valores,
    undefined,
    ['#ff4d6d', '#ffb84d', '#4dcfff', '#8b5cf6', '#00c896']
  );

  const chartPRs = document.getElementById('chart-dist-prs');
  if (chartPRs) chartPRs.innerHTML = '';
  renderDonut(
    'chart-dist-prs',
    dados.distribuicao_prs.labels,
    dados.distribuicao_prs.valores,
    undefined,
    ['#ffb84d', '#00c896']
  );

  const chartIssues = document.getElementById('chart-dist-issues');
  if (chartIssues) chartIssues.innerHTML = '';
  renderDonut(
    'chart-dist-issues',
    dados.distribuicao_issues.labels,
    dados.distribuicao_issues.valores,
    undefined,
    ['#ff4d6d', '#4dcfff']
  );

  const chartCommitsDev = document.getElementById('chart-dist-commits-dev');
  if (chartCommitsDev) chartCommitsDev.innerHTML = '';
  renderDonut(
    'chart-dist-commits-dev',
    dados.distribuicao_commits_dev.labels,
    dados.distribuicao_commits_dev.valores
  );

  const chartCommitsAbsoluto = document.getElementById('chart-dist-commits-absoluto');
  if (chartCommitsAbsoluto) {
    chartCommitsAbsoluto.innerHTML = '';
    const isLightMode = document.documentElement.classList.contains('light');
    const colorText = isLightMode ? '#475569' : '#8b9ab3';

    const colChart = new ApexCharts(chartCommitsAbsoluto, {
      chart: {
        type: 'bar',
        height: 280,
        background: 'transparent',
        foreColor: colorText,
        fontFamily: "'Inter', system-ui, sans-serif",
        toolbar: { show: false }
      },
      plotOptions: {
        bar: {
          borderRadius: 6,
          columnWidth: '45%',
          distributed: true
        }
      },
      series: [{
        name: 'Commits',
        data: dados.commits_absolutos_dev.valores
      }],
      xaxis: {
        categories: dados.commits_absolutos_dev.categorias,
        labels: { style: { colors: colorText, fontSize: '11px' } }
      },
      yaxis: {
        title: {
          text: 'Quantidade de Commits',
          style: { color: colorText, fontWeight: '500' }
        },
        labels: { style: { colors: colorText, fontSize: '11px' } }
      },
      colors: ['#00c896', '#4dcfff', '#8b5cf6', '#ffb84d', '#ff4d6d', '#10b981'],
      dataLabels: {
        enabled: true,
        style: {
          fontSize: '11px',
          fontWeight: '700',
          colors: [isLightMode ? '#ffffff' : '#070d1a']
        }
      },
      tooltip: {
        theme: isLightMode ? 'light' : 'dark',
        style: { fontFamily: "'Inter', system-ui, sans-serif" },
        y: { formatter: (val: number) => `${val} commits` }
      },
      legend: { show: false }
    });
    colChart.render();
  }
}

async function renderizarSubtabHistorico(repositorioId: number): Promise<void> {
  const gridContent = document.getElementById('historico-grid-content');
  const statusPlaceholder = document.getElementById('historico-status');

  try {
    const history = await api.relatorios.historico(repositorioId);

    if (!history || history.length < 2) {
      if (gridContent) gridContent.style.display = 'none';
      if (statusPlaceholder) statusPlaceholder.style.display = '';
      return;
    }

    if (gridContent) gridContent.style.display = '';
    if (statusPlaceholder) statusPlaceholder.style.display = 'none';

    // Ordenar cronologicamente
    const ordenado = [...history].sort((a, b) => new Date(a.gerado_em).getTime() - new Date(b.gerado_em).getTime());

    // Mapear datas formatadas curtas (e.g. DD/MM)
    const datas = ordenado.map(h => {
      const d = new Date(h.gerado_em);
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    });

    // 1. Lead Time de PRs (linha)
    const containerLT = document.getElementById('chart-hist-lead-time');
    if (containerLT) {
      containerLT.innerHTML = '';
      const temposLead = ordenado.map(h => {
        const metrica = h.metrics.find(m => m.name === 'lead_time_pr_hours');
        return metrica && metrica.value !== null ? +metrica.value.toFixed(1) : 0;
      });
      renderLinhaHistorica('chart-hist-lead-time', datas, [{ name: 'Lead Time (PRs)', data: temposLead }], 'Evolução de Lead Time', 'horas');
    }

    // 2. Cycle Time de Issues (linha)
    const containerCT = document.getElementById('chart-hist-cycle-time');
    if (containerCT) {
      containerCT.innerHTML = '';
      const temposCiclo = ordenado.map(h => {
        const metrica = h.metrics.find(m => m.name === 'cycle_time_issue_hours');
        return metrica && metrica.value !== null ? +metrica.value.toFixed(1) : 0;
      });
      renderLinhaHistorica('chart-hist-cycle-time', datas, [{ name: 'Cycle Time (Issues)', data: temposCiclo }], 'Evolução de Cycle Time', 'horas');
    }

    // 3. Throughput 30d (linha)
    const containerTP = document.getElementById('chart-hist-throughput');
    if (containerTP) {
      containerTP.innerHTML = '';
      const throughputs = ordenado.map(h => {
        const metrica = h.metrics.find(m => m.name === 'throughput_30d');
        return metrica && metrica.value !== null ? metrica.value : 0;
      });
      renderLinhaHistorica('chart-hist-throughput', datas, [{ name: 'Throughput 30d', data: throughputs }], 'Evolução de Entregas (Throughput)', 'PRs');
    }

    // 4. Code Churn (linha)
    const containerChurn = document.getElementById('chart-hist-churn');
    if (containerChurn) {
      containerChurn.innerHTML = '';
      const churns = ordenado.map(h => {
        const metrica = h.metrics.find(m => m.name === 'code_churn_weekly_avg');
        return metrica && metrica.value !== null ? metrica.value : 0;
      });
      renderLinhaHistorica('chart-hist-churn', datas, [{ name: 'Code Churn', data: churns }], 'Evolução de Code Churn', 'linhas/semana');
    }

    // 5. Taxa de Retrabalho (linha)
    const containerRework = document.getElementById('chart-hist-retrabalho');
    if (containerRework) {
      containerRework.innerHTML = '';
      const reworks = ordenado.map(h => {
        const metrica = h.metrics.find(m => m.name === 'rework_fix_commit_ratio');
        return metrica && metrica.value !== null ? +metrica.value.toFixed(1) : 0;
      });
      renderLinhaHistorica('chart-hist-retrabalho', datas, [{ name: 'Retrabalho (%)', data: reworks }], 'Evolução de Retrabalho', '%');
    }

    // 6. Desperdícios Acumulados (coluna empilhada)
    const containerWastes = document.getElementById('chart-hist-desperdicios');
    if (containerWastes) {
      containerWastes.innerHTML = '';
      
      const categoriasDesperdicio = new Set<string>();
      ordenado.forEach(h => {
        (h.waste_signals ?? []).forEach(s => {
          categoriasDesperdicio.add(s.category);
        });
      });

      const seriesDesperdicios = Array.from(categoriasDesperdicio).map(cat => {
        const data = ordenado.map(h => {
          return (h.waste_signals ?? []).filter(s => s.category === cat).length;
        });
        return { name: cat, data };
      });

      renderDesperdiciosAcumulados('chart-hist-desperdicios', datas, seriesDesperdicios, 'Evolução de Sinais de Desperdício');
    }

  } catch (err) {
    if (gridContent) gridContent.style.display = 'none';
    if (statusPlaceholder) statusPlaceholder.style.display = '';
  }
}

function alternarSubtab(subaba: 'metas' | 'distribuicao' | 'historico'): void {
  const tabMetas = document.getElementById('subtab-conteudo-metas')!;
  const tabDist  = document.getElementById('subtab-conteudo-distribuicao')!;
  const tabHist  = document.getElementById('subtab-conteudo-historico')!;

  const btnMetas = document.getElementById('btn-subtab-metas')!;
  const btnDist  = document.getElementById('btn-subtab-distribuicao')!;
  const btnHist  = document.getElementById('btn-subtab-historico')!;

  // Hide all
  tabMetas.style.display = 'none';
  tabDist.style.display  = 'none';
  tabHist.style.display  = 'none';

  // Deselect all buttons
  [btnMetas, btnDist, btnHist].forEach(btn => {
    btn.style.color = 'var(--color-texto-suave)';
    btn.style.borderColor = 'transparent';
  });

  const dados = converterRelatorio(relatorioDados!);

  // Show/Select requested
  if (subaba === 'metas') {
    tabMetas.style.display = '';
    btnMetas.style.color = 'var(--color-acento)';
    btnMetas.style.borderColor = 'var(--color-acento)';
    renderizarSubtabMetas(dados);
  } else if (subaba === 'distribuicao') {
    tabDist.style.display = '';
    btnDist.style.color = 'var(--color-acento)';
    btnDist.style.borderColor = 'var(--color-acento)';
    renderizarSubtabDistribuicao(dados);
  } else if (subaba === 'historico') {
    tabHist.style.display = '';
    btnHist.style.color = 'var(--color-acento)';
    btnHist.style.borderColor = 'var(--color-acento)';
    const repoId = obterIdDaUrl('id');
    if (repoId) {
      renderizarSubtabHistorico(repoId);
    }
  }
}

function renderizarDashboardGraficos(relatorio: RelatorioRepositorio): void {
  const dados = converterRelatorio(relatorio);

  // Vincular exportações
  const btnCSV = document.getElementById('btn-export-csv');
  const btnJSON = document.getElementById('btn-export-json');
  const btnPNG = document.getElementById('btn-export-png');

  if (btnCSV) btnCSV.onclick = () => exportarCSV(dados);
  if (btnJSON) btnJSON.onclick = () => exportarJSON(dados);
  if (btnPNG) btnPNG.onclick = () => exportarPNG('conteudo-tab-graficos');

  // Trigger active sub-tab (default: metas)
  alternarSubtab('metas');
}

// ── Renderização completa ─────────────────────────────────────────

function renderizarRelatorio(relatorio: RelatorioRepositorio): void {
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

  requestAnimationFrame(() => {
    inicializarIcones();
  });
}

// ── Inicialização ──────────────────────────────────────────────────

async function iniciar(): Promise<void> {
  const usuario = await exigirAutenticacao();
  atualizarNavbarUsuario(usuario);

  const repositorioId = obterIdDaUrl('id');
  if (!repositorioId) {
    document.getElementById('area-status-relatorio')!.innerHTML = htmlErro(
      'ID do repositório inválido na URL. Volte ao dashboard.',
    );
    return;
  }

  // Intercepta e gerencia os links da navbar para funcionar via abas na mesma página
  const navGraficos = document.getElementById('nav-link-graficos');
  const navRelatorio = document.getElementById('nav-link-relatorio');
  if (navGraficos) {
    navGraficos.addEventListener('click', (e) => {
      e.preventDefault();
      alternarTab('graficos');
    });
  }
  if (navRelatorio) {
    navRelatorio.addEventListener('click', (e) => {
      e.preventDefault();
      alternarTab('relatorio');
    });
  }

  try {
    const repo     = await api.repositorios.buscar(repositorioId);
    const relatorio = await api.relatorios.gerar(repositorioId);

    relatorioDados = relatorio;

    // Remove tela de carregamento e mostra as abas e conteúdo
    document.getElementById('area-status-relatorio')!.style.display = 'none';
    document.getElementById('tabs-container')!.style.display = 'flex';
    document.getElementById('conteudo-tab-relatorio')!.style.display = '';

    renderizarCabecalho(relatorio, repo.full_name);
    renderizarRelatorio(relatorio);

    // Eventos dos botões de abas
    document.getElementById('btn-tab-relatorio')?.addEventListener('click', () => alternarTab('relatorio'));
    document.getElementById('btn-tab-graficos')?.addEventListener('click', () => alternarTab('graficos'));

    // Eventos de sub-abas de gráficos
    document.getElementById('btn-subtab-metas')?.addEventListener('click', () => alternarSubtab('metas'));
    document.getElementById('btn-subtab-distribuicao')?.addEventListener('click', () => alternarSubtab('distribuicao'));
    document.getElementById('btn-subtab-historico')?.addEventListener('click', () => alternarSubtab('historico'));

    // Verifica parâmetro 'tab' na URL
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'graficos') {
      alternarTab('graficos');
    }
  } catch (err) {
    const mensagem = err instanceof ErroApiHTTP
      ? (err.status === 404 ? 'Repositório não encontrado ou sem permissão de acesso.' : err.message)
      : 'Falha ao gerar o relatório. Tente novamente.';

    mostrarToast(mensagem, 'erro');
    document.getElementById('area-status-relatorio')!.innerHTML = htmlErro(mensagem);
    inicializarIcones();
  }
}

iniciar();
