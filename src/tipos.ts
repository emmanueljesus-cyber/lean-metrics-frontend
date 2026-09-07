/** Contratos HTTP do backend FastAPI em tcc_lean. */
export interface UsuarioPerfil {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
}
export interface RespostaToken {
  access_token: string;
  token_type: string;
}
export interface CadastroResposta extends UsuarioPerfil {
  token: RespostaToken;
}
export interface Repositorio {
  id: number;
  owner_name: string;
  repository_name: string;
  description: string | null;
  provider: string;
  default_branch: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  owner_id: number;
}
export interface CriarRepositorioInput {
  owner_name: string;
  repository_name: string;
  description?: string | null;
  default_branch?: string;
}
export interface Pagina<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}
export interface ValorMetrica {
  name: string;
  value: number | null;
  unit: string | null;
  description: string;
}
export type Severidade = "low" | "medium" | "high";
export interface SinalDesperdicio {
  category: string;
  severity: Severidade;
  message: string;
}
export interface RelatorioRepositorio {
  repository_id: number;
  full_name: string;
  generated_at: string;
  metrics: ValorMetrica[];
  waste_signals: SinalDesperdicio[];
}
export const NOMES_CATEGORIAS: Record<string, string> = {
  waiting: "Espera",
  work_in_progress: "Trabalho em andamento",
  defects: "Defeitos",
  handoff: "Concentração de trabalho",
};
export const METRICAS: Record<
  string,
  { nome: string; descricao: string; icone: string }
> = {
  lead_time_pr_hours: {
    nome: "Lead time de PRs",
    descricao: "Tempo médio entre abertura e merge das PRs da amostra.",
    icone: "clock",
  },
  cycle_time_issue_hours: {
    nome: "Ciclo de issues",
    descricao: "Tempo médio entre criação e fechamento das issues da amostra.",
    icone: "rotate-cw",
  },
  throughput_30d: {
    nome: "Entregas em 30 dias",
    descricao: "PRs da amostra integradas nos últimos 30 dias.",
    icone: "git-pull-request",
  },
  wip_open_pull_requests: {
    nome: "PRs em andamento",
    descricao: "PRs ainda abertas entre os itens consultados.",
    icone: "activity",
  },
  wip_open_issues: {
    nome: "Issues em andamento",
    descricao: "Issues ainda abertas entre os itens consultados.",
    icone: "layers",
  },
  defect_rate: {
    nome: "Issues com bug",
    descricao: "Proporção das issues da amostra que possuem a etiqueta bug.",
    icone: "bug",
  },
  active_contributors_30d: {
    nome: "Contribuidores na amostra",
    descricao:
      "Autores únicos dos commits consultados. O cálculo atual não filtra por 30 dias.",
    icone: "users",
  },
  top_contributor_share: {
    nome: "Concentração de commits",
    descricao:
      "Participação do autor mais ativo entre os commits com autor identificado.",
    icone: "users",
  },
  open_issues_repository_total: {
    nome: "Itens abertos no GitHub",
    descricao:
      "Total do GitHub: inclui issues e pull requests abertas, além da amostra.",
    icone: "folder",
  },
};
