/**
 * types.ts — Tipos TypeScript alinhados aos schemas da API
 */

/* ── Autenticação ──────────────────────────── */

export interface UsuarioPerfil {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  avatar_url: string | null;
  has_github: boolean;
  created_at: string;
}

/* ── Repositórios ──────────────────────────── */

export interface Repositorio {
  id: number;
  owner_name: string;
  repository_name: string;
  full_name: string;
  description: string | null;
  provider: string;
  default_branch: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  owner_id: number;
  private: boolean;
  html_url: string;
}

export interface CriarRepositorioInput {
  owner_name: string;
  repository_name: string;
  description?: string | null;
  default_branch?: string;
}

export interface AtualizarRepositorioInput {
  description?: string | null;
  default_branch?: string | null;
}

export interface RepositorioGitHub {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  default_branch: string;
  description: string | null;
  html_url: string;
  owner: { login: string };
}

/* ── Paginação ─────────────────────────────── */

export interface Pagina<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

/* ── Relatórios Lean ───────────────────────── */

export interface ValorMetrica {
  name: string;
  value: number | null;
  unit: string | null;
  description: string;
  extra?: Record<string, unknown> | null;
}

export type Severidade = 'low' | 'medium' | 'high' | 'baixa' | 'média' | 'alta';

export interface SinalDesperdicio {
  category: string;
  severity: Severidade;
  message: string;
}

export interface PerformanceMeta {
  tempo_total: number;
  cache_hit: boolean;
  detalhes: string;
}

export interface RelatorioRepositorio {
  repository_id: number | null;
  full_name: string;
  generated_at: string;
  metrics: ValorMetrica[];
  waste_signals: SinalDesperdicio[];
  performance?: PerformanceMeta | null;
}

/* ── Erros da API ──────────────────────────── */

export interface ErroApi {
  error: {
    code: string;
    message: string;
    details?: unknown;
    request_id?: string | null;
  };
}

/* ── Nomes amigáveis para as métricas ───────── */

export const NOMES_METRICAS: Record<string, string> = {
  lead_time_pr_hours:          'Lead Time (PRs)',
  cycle_time_issue_hours:      'Cycle Time (Issues)',
  waiting_time_pr_hours:       'Waiting Time',
  commit_velocity_daily:       'Velocidade de Commits',
  days_since_last_commit:      'Dias desde último commit',
  wip_open_pull_requests:      'WIP — PRs abertas',
  wip_open_issues:             'WIP — Issues abertas',
  throughput_30d:              'Throughput (30 dias)',
  defect_rate:                 'Taxa de Defeitos',
  rework_fix_commit_ratio:     'Taxa de Retrabalho',
  chaotic_commit_ratio:        'Commits Caóticos',
  rejected_pr_ratio:           'PRs Rejeitadas',
  abandoned_issues_count:      'Issues Abandonadas',
  total_commits_sampled:       'Commits na Amostra',
  total_prs_sampled:           'PRs na Amostra',
  active_contributors_30d:     'Contribuidores Ativos',
  top_contributor_share:       'Concentração (top dev)',
  contributor_distribution:    'Distribuição por dev',
  code_churn_weekly_avg:       'Code Churn semanal',
  open_issues_repository_total:'Issues abertas (total)',
};

/* ── Categorias de desperdício ──────────────── */

export const NOMES_CATEGORIAS: Record<string, string> = {
  waiting:          'Espera',
  work_in_progress: 'WIP excessivo',
  defects:          'Defeitos / Retrabalho',
  extra_processing: 'Processamento desnecessário',
  handoff:          'Centralização de trabalho',
  partially_done:   'Trabalho parcialmente feito',
  'Espera':                      'Espera',
  'WIP excessivo':               'WIP excessivo',
  'Defeitos / Retrabalho':       'Defeitos / Retrabalho',
  'Processamento desnecessário': 'Processamento desnecessário',
  'Centralização de trabalho':   'Centralização de trabalho',
  'Trabalho parcialmente feito': 'Trabalho parcialmente feito',
};
