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

import { converterRelatorio } from './graficos/dados';
import { exportarCSV, exportarJSON, exportarPNG } from './graficos/exportar';
import { renderTempoCiclo } from './graficos/charts/tempo-ciclo';
import { renderWIP } from './graficos/charts/wip';
import { renderBarraH } from './graficos/charts/barra-horizontal';
import { renderCommitVel } from './graficos/charts/commit-vel';

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

function renderizarDashboardGraficos(relatorio: RelatorioRepositorio): void {
  const dados = converterRelatorio(relatorio);

  // Preencher KPIs
  const kpisContainer = document.getElementById('grade-kpis');
  if (kpisContainer) {
    kpisContainer.innerHTML = dados.kpis.map(k => `
      <div class="g-kpi-card">
        <span class="g-kpi-label">${k.icone} ${k.label}</span>
        <span class="g-kpi-value" style="color:${k.cor}">${k.valor}</span>
        <span class="g-kpi-sub">${k.sub}</span>
      </div>
    `).join('');
  }

  // Renderizar gráficos
  renderTempoCiclo( 'chart-tempo-ciclo',   dados.tempo_ciclo);
  renderWIP(        'chart-wip',            dados.wip);
  renderBarraH(     'chart-qualidade',      dados.qualidade,       'Qualidade', 260);
  renderBarraH(     'chart-throughput',     dados.throughput,      'Fluxo',     220);
  renderBarraH(     'chart-contribuidores', dados.contribuidores,  'Contribuidores', 240);
  renderCommitVel(  'chart-commit-vel',     dados.commit_vel);

  // Vincular exportações
  const btnCSV = document.getElementById('btn-export-csv');
  const btnJSON = document.getElementById('btn-export-json');
  const btnPNG = document.getElementById('btn-export-png');

  if (btnCSV) btnCSV.onclick = () => exportarCSV(dados);
  if (btnJSON) btnJSON.onclick = () => exportarJSON(dados);
  if (btnPNG) btnPNG.onclick = () => exportarPNG('conteudo-tab-graficos');

  inicializarIcones();
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
