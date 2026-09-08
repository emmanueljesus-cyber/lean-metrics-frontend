import type { CriarRepositorioInput, Pagina, Repositorio, RelatorioRepositorio, UsuarioPerfil, ValorMetrica, RepositorioGitHub } from "./tipos";
const origem = (import.meta.env.VITE_API_URL ?? "").trim().replace(/\/+$/, "");
export const API_BASE = origem.endsWith("/api/v1") ? origem : origem + "/api/v1";
export class ErroApiHTTP extends Error {
  status: number;
  codigo: string;
  constructor(message: string, status: number, codigo = "api_error") {
    super(message); this.name = "ErroApiHTTP"; this.status = status; this.codigo = codigo;
  }
}
export async function requisicao<T>(caminho: string, opcoes: RequestInit = {}): Promise<T> {
  const headers = new Headers(opcoes.headers);
  headers.set("Accept", "application/json");
  if (opcoes.body) headers.set("Content-Type", "application/json");
  let resposta: Response;
  try {
    resposta = await fetch(API_BASE + caminho, { ...opcoes, headers, credentials: "include", signal: opcoes.signal ?? AbortSignal.timeout(90000) });
  } catch (erro) {
    if (erro instanceof DOMException && erro.name === "AbortError") throw erro;
    throw new ErroApiHTTP("Não foi possível acessar a API. Verifique sua conexão e se o backend está em execução.", 0);
  }
  if (resposta.status === 204) return null as T;
  const dados = await resposta.json().catch(() => undefined);
  if (!resposta.ok) {
    if (resposta.status === 401 && !caminho.startsWith("/autenticacao/") && !caminho.startsWith("/relatorios/relatorio-rapido")) window.dispatchEvent(new Event("sessionexpired"));
    const mensagem = dados?.error?.message ?? (typeof dados?.detail === "string" ? dados.detail : null);
    const padrao: Record<number, string> = {
      401: "Sua sessão expirou. Entre com GitHub novamente.",
      409: "Este repositório já está cadastrado.",
      422: "Confira os campos informados e tente novamente.",
      429: "Limite de requisições atingido. Aguarde antes de tentar novamente.",
      502: "O GitHub não respondeu à consulta. Confira o repositório e as permissões do token.",
    };
    throw new ErroApiHTTP(padrao[resposta.status] || mensagem || "Não foi possível concluir a solicitação.", resposta.status, dados?.error?.code);
  }
  if (dados === undefined) throw new ErroApiHTTP("A API retornou uma resposta inválida.", resposta.status);
  return dados as T;
}
interface RepositorioAPI {
  id: number; nome_proprietario: string; nome_repositorio: string; description: string | null; provider: string;
  branch_padrao: string; ativo: boolean; criado_em: string; atualizado_em: string; usuario_id: number; private: boolean;
}
interface RelatorioAPI {
  repositorio_id: number | null; full_name: string; gerado_em: string;
  metrics: ValorMetrica[]; waste_signals: RelatorioRepositorio["waste_signals"];
  performance?: RelatorioRepositorio["performance"];
}
function normalizarRepositorio(r: RepositorioAPI): Repositorio {
  return { id: r.id, owner_name: r.nome_proprietario, repository_name: r.nome_repositorio, description: r.description,
    provider: r.provider, default_branch: r.branch_padrao, is_active: r.ativo, created_at: r.criado_em, updated_at: r.atualizado_em,
    owner_id: r.usuario_id, private: r.private };
}
export function normalizarRelatorio(r: RelatorioAPI): RelatorioRepositorio {
  return { ...r, repository_id: r.repositorio_id, generated_at: r.gerado_em,
    metrics: r.metrics.map(m => ({ ...m, value: m.unit === "%" && m.value !== null ? m.value / 100 : m.value, unit: m.unit === "%" ? "ratio" : m.unit === "horas" ? "hours" : m.unit,
      name: m.name === "open_issues_repositorio_total" ? "open_issues_repository_total" : m.name })) };
}
export const api = {
  auth: {
    perfil: () => requisicao<UsuarioPerfil | null>("/autenticacao/perfil"),
    logout: () => requisicao<null>("/autenticacao/sair", { method: "POST" }),
  },
  repositorios: {
    listar: async (page = 1, pageSize = 12): Promise<Pagina<Repositorio>> => {
      const pagina = await requisicao<Pagina<RepositorioAPI>>("/repositorios?page=" + page + "&page_size=" + pageSize);
      return { ...pagina, items: pagina.items.map(normalizarRepositorio) };
    },
    buscar: async (id: number) => normalizarRepositorio(await requisicao<RepositorioAPI>("/repositorios/" + id)),
    criar: async (dados: CriarRepositorioInput) => normalizarRepositorio(await requisicao<RepositorioAPI>("/repositorios", {
      method: "POST", body: JSON.stringify({ nome_proprietario: dados.owner_name, nome_repositorio: dados.repository_name,
        description: dados.description, branch_padrao: dados.default_branch ?? "main" }),
    })),
    atualizar: async (id: number, dados: { description?: string | null; default_branch?: string }) => normalizarRepositorio(await requisicao<RepositorioAPI>("/repositorios/" + id, { method: "PATCH", body: JSON.stringify({ description: dados.description, branch_padrao: dados.default_branch }) })),
    deletar: (id: number) => requisicao<null>("/repositorios/" + id, { method: "DELETE" }),
    listarDoGitHub: () => requisicao<RepositorioGitHub[]>("/repositorios/github/listar"),
  },
  relatorios: {
    gerar: async (id: number, tokenGitHub?: string) => normalizarRelatorio(await requisicao<RelatorioAPI>("/relatorios/repositorio/" + id + "/gerar", { headers: tokenGitHub ? { "X-GitHub-Token": tokenGitHub } : {} })),
    rapido: async (owner: string, repo: string, tokenGitHub?: string) => normalizarRelatorio(await requisicao<RelatorioAPI>("/relatorios/relatorio-rapido?proprietario=" + encodeURIComponent(owner) + "&repositorio=" + encodeURIComponent(repo), { headers: tokenGitHub ? { "X-GitHub-Token": tokenGitHub } : {} })),
    historico: async (id: number, limite = 10) => (await requisicao<RelatorioAPI[]>("/relatorios/repositorio/" + id + "/historico?limit=" + limite)).map(normalizarRelatorio),
  },
};
