/**
 * relatorioCompartilhado.ts — Constantes e funções comuns às páginas de relatório.
 * Compartilhado por relatorio.ts e relatorio-rapido.ts.
 */

import type { RelatorioRepositorio, Severidade } from './tipos';

// ── Ícones por nome de métrica ─────────────────────────────────────

export const METRICS_ICONS: Record<string, { icon: string; colorClass: string }> = {
  lead_time_pr_hours:           { icon: 'clock',           colorClass: 'text-indigo-400' },
  cycle_time_issue_hours:       { icon: 'rotate-cw',       colorClass: 'text-blue-400'   },
  waiting_time_pr_hours:        { icon: 'hourglass',       colorClass: 'text-purple-400' },
  wip_open_pull_requests:       { icon: 'activity',        colorClass: 'text-amber-400'  },
  wip_open_issues:              { icon: 'activity',        colorClass: 'text-amber-400'  },
  abandoned_issues_count:       { icon: 'alert-circle',    colorClass: 'text-amber-500'  },
  throughput_30d:               { icon: 'zap',             colorClass: 'text-yellow-400' },
  commit_velocity_daily:        { icon: 'trending-up',     colorClass: 'text-yellow-500' },
  days_since_last_commit:       { icon: 'calendar',        colorClass: 'text-gray-400'   },
  defect_rate:                  { icon: 'bug',             colorClass: 'text-rose-400'   },
  rework_fix_commit_ratio:      { icon: 'layers',          colorClass: 'text-emerald-400'},
  chaotic_commit_ratio:         { icon: 'alert-triangle',  colorClass: 'text-rose-500'   },
  rejected_pr_ratio:            { icon: 'alert-circle',    colorClass: 'text-rose-300'   },
  top_contributor_share:        { icon: 'users',           colorClass: 'text-teal-400'   },
  active_contributors_30d:      { icon: 'users',           colorClass: 'text-teal-400'   },
  contributor_distribution:     { icon: 'users',           colorClass: 'text-teal-500'   },
  code_churn_weekly_avg:        { icon: 'code',            colorClass: 'text-cyan-400'   },
  most_active_branch_name:      { icon: 'git-branch',      colorClass: 'text-orange-400' },
  most_active_branch_days:      { icon: 'git-branch',      colorClass: 'text-orange-400' },
  total_commits_sampled:        { icon: 'database',        colorClass: 'text-slate-400'  },
  total_prs_sampled:            { icon: 'git-pull-request',colorClass: 'text-slate-400'  },
  open_issues_repositorio_total:{ icon: 'hash',            colorClass: 'text-slate-400'  },
};

// ── Ícones por categoria de desperdício ───────────────────────────

export const ICONES_CATEGORIA: Record<string, string> = {
  waiting:                       '<i data-lucide="clock" class="w-5 h-5 text-indigo-400"></i>',
  work_in_progress:              '<i data-lucide="activity" class="w-5 h-5 text-amber-400"></i>',
  defects:                       '<i data-lucide="bug" class="w-5 h-5 text-rose-400"></i>',
  extra_processing:              '<i data-lucide="sliders" class="w-5 h-5 text-purple-400"></i>',
  handoff:                       '<i data-lucide="users" class="w-5 h-5 text-teal-400"></i>',
  partially_done:                '<i data-lucide="layers" class="w-5 h-5 text-cyan-400"></i>',
  'Espera':                      '<i data-lucide="clock" class="w-5 h-5 text-indigo-400"></i>',
  'WIP excessivo':               '<i data-lucide="activity" class="w-5 h-5 text-amber-400"></i>',
  'Defeitos / Retrabalho':       '<i data-lucide="bug" class="w-5 h-5 text-rose-400"></i>',
  'Processamento desnecessário': '<i data-lucide="sliders" class="w-5 h-5 text-purple-400"></i>',
  'Centralização de trabalho':   '<i data-lucide="users" class="w-5 h-5 text-teal-400"></i>',
  'Trabalho parcialmente feito': '<i data-lucide="layers" class="w-5 h-5 text-cyan-400"></i>',
};

// ── Cores e rótulos de severidade ─────────────────────────────────

export const CORES_SEV: Record<Severidade, { bg: string; borda: string; cor: string }> = {
  high:   { bg: 'rgba(255,77,109,0.08)',  borda: 'rgba(255,77,109,0.3)',  cor: '#ff4d6d' },
  medium: { bg: 'rgba(255,184,77,0.08)', borda: 'rgba(255,184,77,0.3)', cor: '#ffb84d' },
  low:    { bg: 'rgba(77,207,255,0.08)', borda: 'rgba(77,207,255,0.3)', cor: '#4dcfff' },
  alta:   { bg: 'rgba(255,77,109,0.08)',  borda: 'rgba(255,77,109,0.3)',  cor: '#ff4d6d' },
  média:  { bg: 'rgba(255,184,77,0.08)', borda: 'rgba(255,184,77,0.3)', cor: '#ffb84d' },
  baixa:  { bg: 'rgba(77,207,255,0.08)', borda: 'rgba(77,207,255,0.3)', cor: '#4dcfff' },
};

export const SEV_PT: Record<Severidade, string> = {
  high: 'Alta', medium: 'Média', low: 'Baixa',
  alta: 'Alta', média:  'Média', baixa: 'Baixa',
};

// ── Metas configuráveis ────────────────────────────────────────────

export interface MetasConfig {
  leadTime:   number; // horas (ex: 120 = 5 dias)
  reviewTime: number; // horas (ex: 24)
  wip:        number; // itens totais
  defectRate: number; // percentual (ex: 5 = 5%)
}

const METAS_PADRAO: MetasConfig = {
  leadTime: 120,
  reviewTime: 24,
  wip: 10,
  defectRate: 5,
};

export function obterMetas(repoName: string): MetasConfig {
  try {
    const saved = JSON.parse(localStorage.getItem(`metas_${repoName}`) ?? 'null');
    if (saved && Object.keys(METAS_PADRAO).every(k => typeof saved[k] === 'number' && Number.isFinite(saved[k]) && saved[k] > 0)) return saved;
  } catch { /* usa padrão se o armazenamento estiver indisponível ou inválido */ }
  return { ...METAS_PADRAO };
}

export function salvarMetas(repoName: string, metas: MetasConfig): void {
  localStorage.setItem(`metas_${repoName}`, JSON.stringify(metas));
}

// ── Cálculo do Lean Score ─────────────────────────────────────────

export function calcularSubScore(atual: number | null, meta: number): number {
  if (atual === null || atual === undefined) return 100;
  if (atual <= meta) return 100;
  return Math.max(0, Math.round(100 - ((atual - meta) / meta) * 100));
}

export function calcularLeanScore(
  relatorio: RelatorioRepositorio,
  metas: MetasConfig,
): { leanScore: number; scoreLeadTime: number; scoreReview: number; scoreWIP: number; scoreDefectRate: number } {
  const val = (nome: string): number | null =>
    relatorio.metrics.find(m => m.name === nome)?.value ?? null;

  const wipVal        = (val('wip_open_pull_requests') ?? 0) + (val('wip_open_issues') ?? 0);
  const defectRateVal = (val('defect_rate') ?? 0) * 100;

  const scoreLeadTime   = calcularSubScore(val('lead_time_pr_hours'),   metas.leadTime);
  const scoreReview     = calcularSubScore(val('waiting_time_pr_hours'), metas.reviewTime);
  const scoreWIP        = calcularSubScore(wipVal,                       metas.wip);
  const scoreDefectRate = calcularSubScore(defectRateVal,                metas.defectRate);

  const leanScore = Math.round((scoreLeadTime + scoreReview + scoreWIP + scoreDefectRate) / 4);
  return { leanScore, scoreLeadTime, scoreReview, scoreWIP, scoreDefectRate };
}
