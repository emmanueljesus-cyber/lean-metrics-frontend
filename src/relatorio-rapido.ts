/**
 * quick-report.ts — Lógica da página de Análise Rápida
 * Qualquer repositório público pode ser analisado sem autenticação.
 */

import './style.css';
import './graficos/graficos.css';
import { buscarUsuarioAtual, atualizarNavbarUsuario, aplicarEstadoAuth, iniciarLoginGitHub, mostrarToast } from './autenticacao';
import { api, ErroApiHTTP } from './api';
import {
  formatarData, formatarValorMetrica, htmlCarregando, htmlErro, setBtnCarregando, inicializarIcones, extrairGithubUrl,
} from './utilitarios';
import { NOMES_METRICAS, NOMES_CATEGORIAS, type RelatorioRepositorio, type ValorMetrica, type SinalDesperdicio, type Severidade } from './tipos';

import { converterRelatorio } from './graficos/dados';
import { exportarCSV, exportarJSON, exportarPNG } from './graficos/exportar';
import { renderTempoCiclo } from './graficos/charts/tempo-ciclo';
import { renderWIP } from './graficos/charts/wip';
import { renderBarraH } from './graficos/charts/barra-horizontal';
import { renderCommitVel } from './graficos/charts/commit-vel';

// ── Exemplos pré-definidos ─────────────────────────────────────────

const EXEMPLOS: Array<{ owner: string; repo: string; icone: string }> = [
  { owner: 'facebook',   repo: 'react',   icone: '<i data-lucide="code" class="w-4 h-4 text-sky-400 mr-1.5 inline-block align-middle"></i>' },
  { owner: 'microsoft',  repo: 'vscode',  icone: '<i data-lucide="terminal" class="w-4 h-4 text-emerald-400 mr-1.5 inline-block align-middle"></i>' },
  { owner: 'torvalds',   repo: 'linux',   icone: '<i data-lucide="globe" class="w-4 h-4 text-amber-400 mr-1.5 inline-block align-middle"></i>' },
  { owner: 'django',     repo: 'django',  icone: '<i data-lucide="layers" class="w-4 h-4 text-purple-400 mr-1.5 inline-block align-middle"></i>' },
  { owner: 'fastapi',    repo: 'fastapi', icone: '<i data-lucide="zap" class="w-4 h-4 text-green-400 mr-1.5 inline-block align-middle"></i>' },
];

// ── Referências DOM ────────────────────────────────────────────────

const formQuick       = document.getElementById('form-quick') as HTMLFormElement;
const inputLinkGithub = document.getElementById('input-link-github') as HTMLInputElement | null;
const inputOwner    = document.getElementById('input-owner') as HTMLInputElement;
const inputRepo     = document.getElementById('input-repo') as HTMLInputElement;
const inputToken    = document.getElementById('input-token') as HTMLInputElement;
const areaResultado = document.getElementById('area-resultado')!;
const erroForm      = document.getElementById('erro-form')!;
const btnAnalisar   = document.getElementById('btn-analisar') as HTMLButtonElement;

// ── Renderização de exemplos ───────────────────────────────────────

function renderizarExemplos(): void {
  const lista = document.getElementById('lista-exemplos');
  if (!lista) return;

  lista.innerHTML = EXEMPLOS.map(ex => `
    <button
      class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
      style="background: var(--color-fundo-card); border-color: var(--color-borda); color: var(--color-texto-suave);"
      data-owner="${ex.owner}" data-repo="${ex.repo}"
      onmouseover="this.style.borderColor='var(--color-borda-hover)'; this.style.color='var(--color-texto)'"
      onmouseout="this.style.borderColor='var(--color-borda)'; this.style.color='var(--color-texto-suave)'">
      ${ex.icone} ${ex.owner}/${ex.repo}
    </button>
  `).join('');

  lista.querySelectorAll<HTMLButtonElement>('[data-owner]').forEach(btn => {
    btn.addEventListener('click', () => {
      inputOwner.value = btn.dataset.owner!;
      inputRepo.value  = btn.dataset.repo!;
      if (inputLinkGithub) {
        inputLinkGithub.value = '';
      }
      executarAnalise();
    });
  });

  inicializarIcones();
}

// ── Renderização do resultado ──────────────────────────────────────

const CORES_SEV: Record<Severidade, { bg: string; borda: string; cor: string }> = {
  high:   { bg: 'rgba(255,77,109,0.08)',  borda: 'rgba(255,77,109,0.3)',  cor: '#ff4d6d' },
  medium: { bg: 'rgba(255,184,77,0.08)', borda: 'rgba(255,184,77,0.3)', cor: '#ffb84d' },
  low:    { bg: 'rgba(77,207,255,0.08)', borda: 'rgba(77,207,255,0.3)', cor: '#4dcfff' },
  alta:   { bg: 'rgba(255,77,109,0.08)',  borda: 'rgba(255,77,109,0.3)',  cor: '#ff4d6d' },
  média:  { bg: 'rgba(255,184,77,0.08)', borda: 'rgba(255,184,77,0.3)', cor: '#ffb84d' },
  baixa:  { bg: 'rgba(77,207,255,0.08)', borda: 'rgba(77,207,255,0.3)', cor: '#4dcfff' },
};
const SEV_PT: Record<Severidade, string> = {
  high: 'Alta', medium: 'Média', low: 'Baixa',
  alta: 'Alta', média: 'Média', baixa: 'Baixa'
};
const ICONES_CAT: Record<string, string> = {
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

function htmlMetricaCompacta(m: ValorMetrica, delay: number): string {
  const nome  = NOMES_METRICAS[m.name] ?? m.name;
  let valor = formatarValorMetrica(m.value, m.unit);
  let isNulo = m.value === null;

  // Ajuste especial para exibir o nome da branch ativa quando o valor e nulo
  if (m.name === 'most_active_branch_name' && m.extra && m.extra.branch_name) {
    valor = String(m.extra.branch_name);
    isNulo = false;
  }

  const cfg = METRICS_ICONS[m.name] ?? { icon: 'info', colorClass: 'text-[#00c896]' };
  const iconeHtml = `<i data-lucide="${cfg.icon}" class="w-4.5 h-4.5 ${cfg.colorClass}"></i>`;

  return `
    <div class="glass-card p-4 flex flex-col justify-between gap-3.5 animar-entrar relative group cursor-help"
         style="animation-delay: ${delay}s; min-height: 110px;"
         data-tooltip="${m.description}"
         onmouseover="this.style.borderColor='var(--color-borda-hover)'; this.style.transform='translateY(-2px)'"
         onmouseout="this.style.borderColor='var(--color-borda)'; this.style.transform=''">
      <div class="flex items-start justify-between gap-2 w-full">
        <p class="text-xs font-semibold uppercase tracking-wider" style="color: var(--color-texto-suave);">${nome}</p>
        <span class="flex-shrink-0 flex items-center justify-center p-1 rounded-lg" style="background: rgba(255,255,255,0.02); border: 1px solid var(--color-borda);">
          ${iconeHtml}
        </span>
      </div>
      <p style="font-size: 1.75rem; font-weight: 800; letter-spacing: -0.03em; line-height: 1; color: ${isNulo ? 'var(--color-texto-fraco)' : 'var(--color-acento)'};">
        ${isNulo ? '—' : valor}
      </p>
    </div>
  `;
}

function htmlSinal(s: SinalDesperdicio, delay: number): string {
  const c     = CORES_SEV[s.severity];
  const icone = ICONES_CAT[s.category] ?? '<i data-lucide="alert-triangle" class="w-5 h-5 text-amber-400"></i>';
  const cat   = NOMES_CATEGORIAS[s.category] ?? s.category;
  return `
    <div class="flex items-start gap-3 rounded-xl p-4 animar-entrar"
         style="background: ${c.bg}; border: 1px solid ${c.borda}; animation-delay: ${delay}s;">
      <span class="flex-shrink-0 mt-0.5 flex items-center justify-center">${icone}</span>
      <div>
        <div class="flex items-center gap-2 mb-1 flex-wrap">
          <span class="text-xs font-semibold uppercase tracking-wide" style="color: var(--color-texto-suave);">${cat}</span>
          <span class="text-xs font-bold px-2 py-0.5 rounded-full" style="background: ${c.borda}; color: ${c.cor};">${SEV_PT[s.severity]}</span>
        </div>
        <p class="text-sm" style="color: var(--color-texto); line-height: 1.5;">${s.message}</p>
      </div>
    </div>
  `;
}

function renderizarResultado(relatorio: RelatorioRepositorio): void {
  const metricasPrincipais = [
    'lead_time_pr_hours','cycle_time_issue_hours','wip_open_pull_requests',
    'wip_open_issues','throughput_30d','defect_rate','rework_fix_commit_ratio',
    'waiting_time_pr_hours','top_contributor_share','code_churn_weekly_avg',
    'active_contributors_30d','days_since_last_commit',
  ];

  const metricasFiltradas = relatorio.metrics.filter(m => 
    m.name !== 'contributor_distribution' &&
    m.name !== 'total_commits_sampled' &&
    m.name !== 'total_prs_sampled' &&
    m.name !== 'open_issues_repositorio_total'
  );

  const metricas = [
    ...metricasPrincipais.map(n => metricasFiltradas.find(m => m.name === n)).filter(Boolean) as ValorMetrica[],
    ...metricasFiltradas.filter(m => !metricasPrincipais.includes(m.name)),
  ];

  const sinais = [...relatorio.waste_signals].sort((a, b) => {
    const ord: Record<Severidade, number> = { high: 0, medium: 1, low: 2, alta: 0, média: 1, baixa: 2 };
    return ord[a.severity] - ord[b.severity];
  });

  areaResultado.innerHTML = `
    <!-- Cabeçalho do resultado -->
    <div class="glass-card p-5 mb-6 flex flex-wrap items-center justify-between gap-4 animar-entrar"
         style="border-color: rgba(0,200,150,0.3); background: rgba(0,200,150,0.04);">
      <div class="flex-1 min-w-[250px]">
        <h2 class="text-xl font-bold mb-0.5">${relatorio.full_name}</h2>
        <p class="text-sm" style="color: var(--color-texto-suave);">
          Relatório gerado em ${formatarData(relatorio.gerado_em)}
        </p>
        
        ${relatorio.performance ? `
        <div class="flex flex-wrap items-center gap-2 mt-3 text-xs font-mono" style="color: var(--color-acento);">
          <span class="inline-block w-2.5 h-2.5 rounded-full ${relatorio.performance.cache_hit ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}"></span>
          <span class="flex items-center gap-1"><i data-lucide="zap" class="w-3.5 h-3.5 text-emerald-400"></i> ${relatorio.performance.cache_hit ? 'CACHE HIT' : 'CACHE MISS'} · Processado em ${relatorio.performance.tempo_total.toFixed(4)}s</span>
        </div>
        ` : ''}
      </div>
      <div class="flex gap-3 flex-wrap">
        <span class="text-sm px-3 py-1.5 rounded-xl font-medium"
              style="background: var(--color-acento-suave); color: var(--color-acento); border: 1px solid rgba(0,200,150,0.2);">
          ${metricas.length} métricas
        </span>
        <span class="text-sm px-3 py-1.5 rounded-xl font-medium"
              style="background: ${sinais.length ? 'rgba(255,77,109,0.1)' : 'rgba(0,200,150,0.1)'}; color: ${sinais.length ? '#ff4d6d' : 'var(--color-acento)'}; border: 1px solid ${sinais.length ? 'rgba(255,77,109,0.25)' : 'rgba(0,200,150,0.25)'};">
          ${sinais.length ? `<span class="flex items-center gap-1"><i data-lucide="alert-triangle" class="w-4 h-4"></i> ${sinais.length} sinal${sinais.length > 1 ? 'is' : ''}</span>` : '<span class="flex items-center gap-1"><i data-lucide="check-circle" class="w-4 h-4"></i> Sem desperdícios</span>'}
        </span>
      </div>

      ${relatorio.performance ? `
      <div class="w-full mt-4 p-3 rounded-lg border text-xs font-mono overflow-x-auto"
           style="background: rgba(0,0,0,0.15); border-color: var(--color-borda); color: var(--color-texto-suave);">
        <span style="color: var(--color-acento); font-weight: bold;">[PERF LOGS]</span> ${relatorio.performance.detalhes}
      </div>
      ` : ''}
    </div>

    <!-- Sinais de desperdício -->
    ${sinais.length ? `
    <div class="mb-6">
      <h3 class="font-bold text-lg mb-4 flex items-center gap-2"><i data-lucide="alert-triangle" class="w-5 h-5 text-rose-400"></i> Sinais de desperdício</h3>
      <div class="flex flex-col gap-2.5">
        ${sinais.map((s, i) => htmlSinal(s, i * 0.06)).join('')}
      </div>
    </div>` : ''}

    <!-- Métricas -->
    <div class="mb-6">
      <h3 class="font-bold text-lg mb-4 flex items-center gap-2"><i data-lucide="bar-chart-3" class="w-5 h-5 text-[#00c896]"></i> Métricas Lean</h3>
      <div class="grid gap-3" style="grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));">
        ${metricas.map((m, i) => htmlMetricaCompacta(m, i * 0.04)).join('')}
      </div>
    </div>

    <!-- Aviso de limitação -->
    <div class="glass-card p-4 text-sm flex items-start gap-3"
         style="border-color: rgba(255,184,77,0.3); background: rgba(255,184,77,0.06);">
      <span class="flex-shrink-0 mt-0.5 flex items-center justify-center text-amber-400"><i data-lucide="info" class="w-5 h-5"></i></span>
      <p style="color: var(--color-texto-suave); line-height: 1.6;">
        <strong style="color: var(--color-texto);">Análise rápida:</strong>
        os dados são baseados em uma amostra de até 300 itens por categoria (commits, PRs, issues).
        Para relatórios persistidos com histórico, <a href="/index.html" style="color: var(--color-acento);">entre com GitHub</a> e cadastre o repositório.
      </p>
    </div>
  `;

  inicializarIcones();

  // Scroll suave para o resultado
  areaResultado.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Estado Global do Relatório e Abas (Análise Rápida) ──────────────
let relatorioDados: RelatorioRepositorio | null = null;
let graficosRenderizados = false;
let eventosTabsConfigurados = false;

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

function configurarEventosTabs(): void {
  if (eventosTabsConfigurados) return;

  document.getElementById('btn-tab-relatorio')?.addEventListener('click', () => alternarTab('relatorio'));
  document.getElementById('btn-tab-graficos')?.addEventListener('click', () => alternarTab('graficos'));

  const navGraficos = document.getElementById('nav-link-graficos');
  const navRelatorio = document.getElementById('nav-link-relatorio');
  if (navGraficos) {
    navGraficos.addEventListener('click', (e) => {
      e.preventDefault();
      if (relatorioDados) {
        alternarTab('graficos');
      } else {
        mostrarToast('Gere um relatório primeiro para visualizar os gráficos.', 'aviso');
      }
    });
  }
  if (navRelatorio) {
    navRelatorio.addEventListener('click', (e) => {
      e.preventDefault();
      alternarTab('relatorio');
    });
  }

  eventosTabsConfigurados = true;
}

// ── Execução da análise ────────────────────────────────────────────

async function executarAnalise(): Promise<void> {
  const owner = inputOwner.value.trim();
  const repo  = inputRepo.value.trim();
  const token = inputToken.value.trim() || undefined;

  erroForm.classList.add('hidden');

  if (!owner || !repo) {
    erroForm.textContent = 'Informe o owner e o nome do repositório.';
    erroForm.classList.remove('hidden');
    return;
  }

  // Oculta abas antes de carregar
  document.getElementById('wrapper-resultado')!.style.display = 'none';

  areaResultado.innerHTML = htmlCarregando(`Analisando ${owner}/${repo}... (pode levar alguns segundos)`);
  setBtnCarregando(btnAnalisar, true);

  try {
    const relatorio = await api.relatorios.rapido(owner, repo, token);
    relatorioDados = relatorio;
    graficosRenderizados = false;

    // Exibe abas e conteúdo
    document.getElementById('wrapper-resultado')!.style.display = '';
    document.getElementById('tabs-container')!.style.display = 'flex';
    configurarEventosTabs();

    alternarTab('relatorio'); // Sempre reseta para a aba texto primeiro
    renderizarResultado(relatorio);

    // Se o parâmetro tab=graficos estiver na URL, exibe os gráficos direto
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'graficos') {
      alternarTab('graficos');
    }
  } catch (err) {
    let mensagem = 'Falha ao gerar o relatório. Verifique o owner/repo e tente novamente.';

    if (err instanceof ErroApiHTTP) {
      if (err.status === 404) {
        mensagem = `Repositório "${owner}/${repo}" não encontrado ou privado.`;
      } else if (err.status === 429) {
        mensagem = 'Limite de requisições atingido. Use um token GitHub pessoal para aumentar o limite.';
      } else {
        mensagem = err.message;
      }
    }

    mostrarToast(mensagem, 'erro');
    // Exibe o erro dentro de areaResultado, mas garantindo que o wrapper seja visível sem as abas
    document.getElementById('wrapper-resultado')!.style.display = '';
    document.getElementById('tabs-container')!.style.display = 'none';
    areaResultado.innerHTML = htmlErro(mensagem);
    inicializarIcones();
  } finally {
    setBtnCarregando(btnAnalisar, false);
  }
}

// ── Inicialização ──────────────────────────────────────────────────

async function iniciar(): Promise<void> {
  // Tenta autenticação silenciosa (sem exigir)
  const usuario = await buscarUsuarioAtual();
  aplicarEstadoAuth(!!usuario);
  if (usuario) {
    atualizarNavbarUsuario(usuario);
    const linkDash = document.getElementById('link-dashboard');
    if (linkDash) linkDash.style.display = '';
  }

  document.getElementById('btn-entrar-nav')?.addEventListener('click', iniciarLoginGitHub);

  // Preenche exemplos
  renderizarExemplos();

  // Configura interceptação básica de links do menu
  configurarEventosTabs();

  // Pré-preenche pela URL (ex: ?proprietario=torvalds&repositorio=linux)
  const params = new URLSearchParams(window.location.search);
  const ownerUrl = params.get('proprietario') || params.get('owner');
  const repoUrl  = params.get('repositorio') || params.get('repo');
  if (ownerUrl && repoUrl) {
    inputOwner.value = ownerUrl;
    inputRepo.value  = repoUrl;
    executarAnalise();
  }

  // Escuta colar link do GitHub
  inputLinkGithub?.addEventListener('input', () => {
    const url = inputLinkGithub.value.trim();
    if (!url) return;

    const parsed = extrairGithubUrl(url);
    if (parsed) {
      inputOwner.value = parsed.owner;
      inputRepo.value = parsed.repo;
      erroForm.classList.add('hidden'); // Limpa alertas de erro se houver
    }
  });

  // Submit
  formQuick.addEventListener('submit', (e) => {
    e.preventDefault();
    executarAnalise();
  });

  inicializarIcones();
}

iniciar();
