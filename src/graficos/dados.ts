/**
 * graficos/dados.ts — Tipos do dashboard + mapeamento dos ValorMetrica da API.
 *
 * SRP: apenas tipos, interfaces e a função que converte a resposta da API
 *      no formato consumido pelos módulos de gráfico.
 */

import type { RelatorioRepositorio, ValorMetrica } from '../tipos';

// ── Tipos internos dos gráficos ────────────────────────────────────

export interface DadosKPI {
  label:    string;
  valor:    string;
  cor:      string;
  sub:      string;
  icone:    string;
}

export interface DadosBarraH {
  categorias: string[];
  valores:    number[];
  unidade:    string;
}

export interface DadosRadialSimples {
  valor:    number; // 0–100
  label:    string;
  meta_min?: number;
  meta_max?: number;
}

export interface DadosColuna {
  categorias: string[];
  valores:    number[];
  unidade:    string;
}

export interface DadosDonut {
  labels:  string[];
  valores: number[];
}

export interface DadosDashboard {
  repositorio:   string;
  gerado_em:     string;
  kpis:          DadosKPI[];
  tempo_ciclo:   DadosColuna;       // lead time + cycle time side-by-side
  wip:           DadosDonut;        // PRs abertas vs Issues abertas
  throughput:    DadosBarraH;       // métricas de fluxo
  qualidade:     DadosBarraH;       // defeitos, retrabalho, churn
  contribuidores: DadosBarraH;      // concentração, ativos, distribuição
  commit_vel:    DadosRadialSimples; // velocidade de commits
  sinais:        { categoria: string; severidade: string; mensagem: string }[];
  metricas_raw:  ValorMetrica[];
  distribuicao_desperdicios: DadosDonut;
  distribuicao_prs:          DadosDonut;
  distribuicao_issues:       DadosDonut;
  distribuicao_commits_dev:  DadosDonut;
  commits_absolutos_dev:     DadosColuna;
}

// ── Helper: extrai valor numérico de uma métrica ───────────────────

function val(metrics: ValorMetrica[], name: string): number | null {
  return metrics.find(m => m.name === name)?.value ?? null;
}

function fmt(v: number | null, casas = 1): string {
  if (v === null || v === undefined) return '—';
  return v % 1 === 0 ? String(v) : v.toFixed(casas);
}

// ── Conversão principal: API → DadosDashboard ──────────────────────

export function converterRelatorio(rel: RelatorioRepositorio): DadosDashboard {
  const m = rel.metrics;

  // ── KPIs ──
  const leadTime      = val(m, 'lead_time_pr_hours');
  const cycleTime     = val(m, 'cycle_time_issue_hours');
  const throughput    = val(m, 'throughput_30d');
  const wipPRs        = val(m, 'wip_open_pull_requests');
  const wipIssues     = val(m, 'wip_open_issues');
  const defectRate    = val(m, 'defect_rate');
  const rework        = val(m, 'rework_fix_commit_ratio');
  const churn         = val(m, 'code_churn_weekly_avg');
  const contrib       = val(m, 'active_contributors_30d');
  const topShare      = val(m, 'top_contributor_share');
  const waiting       = val(m, 'waiting_time_pr_hours');
  const diasSemCommit = val(m, 'days_since_last_commit');
  const commitVel     = val(m, 'commit_velocity_daily');
  const abandoned     = val(m, 'abandoned_issues_count');
  const rejectedPR    = val(m, 'rejected_pr_ratio');
  const chaoticCommit = val(m, 'chaotic_commit_ratio');



  // ── KPI cards ──
  const kpis: DadosKPI[] = [
    {
      label:  'Lead Time (PRs)',
      valor:  leadTime !== null ? `${fmt(leadTime)}h` : '—',
      cor:    leadTime !== null && leadTime > 48 ? '#ff4d6d' : '#00c896',
      sub:    'Abertura → merge',
      icone:  '<i data-lucide="clock" class="w-4 h-4 mr-1.5 inline-block align-middle text-emerald-400"></i>',
    },
    {
      label:  'Cycle Time (Issues)',
      valor:  cycleTime !== null ? `${fmt(cycleTime)}h` : '—',
      cor:    cycleTime !== null && cycleTime > 72 ? '#ffb84d' : '#4dcfff',
      sub:    'Criação → fechamento',
      icone:  '<i data-lucide="rotate-cw" class="w-4 h-4 mr-1.5 inline-block align-middle text-sky-400"></i>',
    },
    {
      label:  'Throughput 30d',
      valor:  throughput !== null ? String(throughput) : '—',
      cor:    '#a78bfa',
      sub:    'PRs mergeadas',
      icone:  '<i data-lucide="zap" class="w-4 h-4 mr-1.5 inline-block align-middle text-purple-400"></i>',
    },
    {
      label:  'WIP Total',
      valor:  (wipPRs !== null || wipIssues !== null)
                ? String((wipPRs ?? 0) + (wipIssues ?? 0))
                : '—',
      cor:    '#ffb84d',
      sub:    'PRs + Issues abertas',
      icone:  '<i data-lucide="folder" class="w-4 h-4 mr-1.5 inline-block align-middle text-amber-400"></i>',
    },
    {
      label:  'Taxa de Defeitos',
      valor:  defectRate !== null ? `${fmt(defectRate * 100)}%` : '—',
      cor:    defectRate !== null && defectRate > 0.2 ? '#ff4d6d' : '#00c896',
      sub:    'PRs com bug fix',
      icone:  '<i data-lucide="bug" class="w-4 h-4 mr-1.5 inline-block align-middle text-rose-400"></i>',
    },
    {
      label:  'Contribuidores Ativos',
      valor:  contrib !== null ? String(contrib) : '—',
      cor:    '#4dcfff',
      sub:    'Últimos 30 dias',
      icone:  '<i data-lucide="users" class="w-4 h-4 mr-1.5 inline-block align-middle text-sky-400"></i>',
    },
  ];

  // ── Tempo de Ciclo (coluna dupla) ──
  const tempoCiclo: DadosColuna = {
    categorias: ['Lead Time (PRs)', 'Cycle Time (Issues)', 'Waiting Time'],
    valores: [
      leadTime  ?? 0,
      cycleTime ?? 0,
      waiting   ?? 0,
    ],
    unidade: 'horas',
  };

  // ── WIP Donut ──
  const wip: DadosDonut = {
    labels:  ['PRs Abertas', 'Issues Abertas'],
    valores: [wipPRs ?? 0, wipIssues ?? 0],
  };

  // ── Throughput / Fluxo (barras horizontais) ──
  const throughputData: DadosBarraH = {
    categorias: ['Throughput 30d', 'Issues Abandonadas', 'PRs Rejeitadas (%)'],
    valores: [
      throughput        ?? 0,
      abandoned         ?? 0,
      rejectedPR !== null ? +(rejectedPR * 100).toFixed(1) : 0,
    ],
    unidade: '',
  };

  // ── Qualidade (barras horizontais) ──
  const qualidade: DadosBarraH = {
    categorias: ['Taxa de Defeitos (%)', 'Retrabalho (%)', 'Commits Caóticos (%)', 'Code Churn/sem'],
    valores: [
      defectRate    !== null ? +(defectRate    * 100).toFixed(1) : 0,
      rework        !== null ? +(rework        * 100).toFixed(1) : 0,
      chaoticCommit !== null ? +(chaoticCommit * 100).toFixed(1) : 0,
      churn         ?? 0,
    ],
    unidade: '',
  };

  // ── Contribuidores (barras horizontais) ──
  const contribuidoresData: DadosBarraH = {
    categorias: ['Contribuidores Ativos', 'Concentração top dev (%)', 'Dias s/ commit', 'Commits/dia'],
    valores: [
      contrib         ?? 0,
      topShare !== null ? +(topShare * 100).toFixed(1) : 0,
      diasSemCommit   ?? 0,
      commitVel       ?? 0,
    ],
    unidade: '',
  };

  // ── Commit velocity gauge ──
  const commitVelGauge: DadosRadialSimples = {
    valor: commitVel !== null ? Math.min(100, Math.round(commitVel * 10)) : 0,
    label: `${fmt(commitVel, 2)} commits/dia`,
  };

  // ── Sinais ──
  const sinais = (rel.waste_signals ?? []).map(s => ({
    categoria:  s.category,
    severidade: s.severity,
    mensagem:   s.message,
  }));

  // ── Distribuição de Desperdícios ──
  const contagemSinais: Record<string, number> = {};
  (rel.waste_signals ?? []).forEach(s => {
    const cat = s.category;
    contagemSinais[cat] = (contagemSinais[cat] || 0) + 1;
  });
  const labelsDesperdicios = Object.keys(contagemSinais);
  const valoresDesperdicios = Object.values(contagemSinais);
  if (labelsDesperdicios.length === 0) {
    labelsDesperdicios.push('Sem Desperdícios');
    valoresDesperdicios.push(1);
  }
  const distribuicao_desperdicios: DadosDonut = {
    labels: labelsDesperdicios,
    valores: valoresDesperdicios,
  };

  // ── Distribuição de PRs (Abertas/WIP vs Fechadas/Mergeadas) ──
  const totalPRs = val(m, 'total_prs_sampled') ?? 0;
  const openPRs = wipPRs ?? 0;
  const closedPRs = Math.max(0, totalPRs - openPRs);
  const distribuicao_prs: DadosDonut = {
    labels: ['Abertas (WIP)', 'Fechadas/Mergeadas'],
    valores: [openPRs, closedPRs],
  };

  // ── Distribuição de Issues (Abertas/WIP vs Fechadas/Resolvidas) ──
  const totalIssues = val(m, 'total_issues_sampled') ?? 0;
  const openIssues = wipIssues ?? 0;
  const closedIssues = Math.max(0, totalIssues - openIssues);
  const distribuicao_issues: DadosDonut = {
    labels: ['Abertas (WIP)', 'Fechadas/Resolvidas'],
    valores: [openIssues, closedIssues],
  };

  // ── Distribuição de Commits por Dev (Proporção %) ──
  const contDistMetric = m.find(metric => metric.name === 'contributor_distribution');
  const distExtra = contDistMetric?.extra as Record<string, number> | null | undefined;
  const labelsCommitsDev: string[] = [];
  const valoresCommitsDev: number[] = [];

  if (distExtra && typeof distExtra === 'object') {
    Object.entries(distExtra).forEach(([autor, ratio]) => {
      labelsCommitsDev.push(autor);
      valoresCommitsDev.push(+(ratio * 100).toFixed(1));
    });
  }
  if (labelsCommitsDev.length === 0) {
    labelsCommitsDev.push('Sem Contribuidores');
    valoresCommitsDev.push(100);
  }
  const distribuicao_commits_dev: DadosDonut = {
    labels: labelsCommitsDev,
    valores: valoresCommitsDev,
  };

  // ── Commits Absolutos por Dev ──
  const totalCommits = val(m, 'total_commits_sampled') ?? 0;
  const valoresAbsolutos: number[] = [];
  const labelsAbsolutos: string[] = [];

  if (distExtra && typeof distExtra === 'object') {
    Object.entries(distExtra).forEach(([autor, ratio]) => {
      labelsAbsolutos.push(autor);
      valoresAbsolutos.push(Math.round(ratio * totalCommits));
    });
  }
  if (labelsAbsolutos.length === 0) {
    labelsAbsolutos.push('Sem Commits');
    valoresAbsolutos.push(0);
  }
  const commits_absolutos_dev: DadosColuna = {
    categorias: labelsAbsolutos,
    valores: valoresAbsolutos,
    unidade: 'commits',
  };

  return {
    repositorio:    rel.full_name,
    gerado_em:      rel.gerado_em,
    kpis,
    tempo_ciclo:    tempoCiclo,
    wip,
    throughput:     throughputData,
    qualidade,
    contribuidores: contribuidoresData,
    commit_vel:     commitVelGauge,
    sinais,
    metricas_raw:   m,
    distribuicao_desperdicios,
    distribuicao_prs,
    distribuicao_issues,
    distribuicao_commits_dev,
    commits_absolutos_dev,
  };
}
