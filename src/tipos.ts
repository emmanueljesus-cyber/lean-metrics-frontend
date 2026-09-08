/** Contratos HTTP do backend FastAPI em tcc_lean. */
export interface UsuarioPerfil { id: number; nome_usuario: string; email: string; ativo: boolean; url_avatar: string | null; tem_github: boolean; criado_em: string }
export interface RespostaToken {
  access_token: string;
  token_type: string;
}
export interface CadastroResposta extends UsuarioPerfil {
  token: RespostaToken;
}
export interface Repositorio {
  private?: boolean;
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
  category?: string | null;
  extra?: Record<string, unknown> | null;
  name: string;
  value: number | null;
  unit: string | null;
  description: string;
}
export type Severidade = "low" | "medium" | "high" | "baixa" | "média" | "alta";
export interface SinalDesperdicio {
  category: string;
  severity: Severidade;
  message: string;
}
export interface RelatorioRepositorio {
  gerado_em: string;
  repositorio_id: number | null;
  performance?: { tempo_total: number; cache_hit: boolean; detalhes: string } | null;
  repository_id: number | null;
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

export interface RepositorioGitHub { id: number; name: string; full_name: string; private: boolean; branch_padrao: string; description: string | null; html_url: string; owner: { login: string } }

METRICAS["waiting_time_pr_hours"] = {"nome":"Espera estimada de PRs","descricao":"Estimativa entre abertura e última atualização; não representa tempo de revisão medido.","icone":"clock"};

METRICAS["commit_velocity_daily"] = {"nome":"Velocidade de commits","descricao":"Média de commits por dia no intervalo da amostra.","icone":"activity"};

METRICAS["days_since_last_commit"] = {"nome":"Dias sem commits","descricao":"Tempo desde o commit mais recente consultado.","icone":"clock"};

METRICAS["most_active_branch_name"] = {"nome":"Branch mais ativa","descricao":"Branch com o commit mais recente entre as branches consultadas.","icone":"git-pull-request"};

METRICAS["most_active_branch_days"] = {"nome":"Recência da branch ativa","descricao":"Dias desde o último commit na branch mais ativa.","icone":"clock"};

METRICAS["abandoned_issues_count"] = {"nome":"Issues sem atividade","descricao":"Issues abertas sem atualização há mais de 30 dias.","icone":"folder"};

METRICAS["rework_fix_commit_ratio"] = {"nome":"Commits corretivos","descricao":"Percentual de commits com termos como fix, bug ou corrigir; é uma aproximação de retrabalho.","icone":"layers"};

METRICAS["chaotic_commit_ratio"] = {"nome":"Mensagens curtas de commit","descricao":"Percentual de mensagens com menos de 10 caracteres.","icone":"info"};

METRICAS["rejected_pr_ratio"] = {"nome":"PRs fechadas sem merge","descricao":"Participação das PRs encerradas sem merge na amostra.","icone":"git-pull-request"};

METRICAS["contributor_distribution"] = {"nome":"Distribuição por autor","descricao":"Participação de cada autor nos commits identificados.","icone":"users"};

METRICAS["total_commits_sampled"] = {"nome":"Commits consultados","descricao":"Tamanho da amostra de commits.","icone":"folder"};

METRICAS["total_prs_sampled"] = {"nome":"PRs consultadas","descricao":"Tamanho da amostra de pull requests.","icone":"folder"};

METRICAS["total_issues_sampled"] = {"nome":"Issues consultadas","descricao":"Tamanho da amostra de issues (sem pull requests).","icone":"folder"};

export const NOMES_METRICAS = Object.fromEntries(Object.entries(METRICAS).map(([k,v]) => [k,v.nome]));
