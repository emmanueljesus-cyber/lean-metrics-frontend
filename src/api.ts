import type {
  CadastroResposta,
  CriarRepositorioInput,
  Pagina,
  Repositorio,
  RelatorioRepositorio,
  RespostaToken,
} from "./tipos";

const origem = (import.meta.env.VITE_API_URL ?? "").trim().replace(/\/+$/, "");
export const API_BASE = origem.endsWith("/api/v1")
  ? origem
  : origem + "/api/v1";
const TOKEN_KEY = "lean-metrics-token";
export function obterToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}
export function salvarToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}
export function limparSessao(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem("lean-metrics-user");
}
export class ErroApiHTTP extends Error {
  status: number;
  codigo: string;
  constructor(message: string, status: number, codigo = "api_error") {
    super(message);
    this.name = "ErroApiHTTP";
    this.status = status;
    this.codigo = codigo;
  }
}
export async function requisicao<T>(
  caminho: string,
  opcoes: RequestInit = {},
): Promise<T> {
  const headers = new Headers(opcoes.headers);
  headers.set("Accept", "application/json");
  if (opcoes.body) headers.set("Content-Type", "application/json");
  const token = obterToken();
  if (token) headers.set("Authorization", "Bearer " + token);
  let resposta: Response;
  try {
    resposta = await fetch(API_BASE + caminho, {
      ...opcoes,
      headers,
      signal: opcoes.signal ?? AbortSignal.timeout(90000),
    });
  } catch (erro) {
    if (erro instanceof DOMException && erro.name === "AbortError") throw erro;
    throw new ErroApiHTTP(
      "Não foi possível acessar a API. Verifique sua conexão e se o backend está em execução.",
      0,
    );
  }
  const dados = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    if (resposta.status === 401 && !caminho.startsWith("/auth/")) {
      limparSessao();
      window.dispatchEvent(new Event("sessionexpired"));
    }
    const traducoes: Record<string, string> = {
      "This repository is already registered.":
        "Este repositório já está cadastrado.",
      "Invalid or expired access token.":
        "Sua sessão expirou. Entre novamente.",
      "Repository was not found.": "Repositório não encontrado.",
      "Invalid credentials.": "E-mail ou senha incorretos.",
    };
    const mensagem =
      dados?.error?.message ??
      (typeof dados?.detail === "string" ? dados.detail : null);
    const padrao: Record<number, string> = {
      401: "E-mail ou senha incorretos, ou sessão expirada.",
      409: "Cadastro já existente. Verifique os dados informados.",
      422: "Confira os campos informados e tente novamente.",
      429: "Limite de requisições atingido. Aguarde antes de tentar novamente.",
      502: "O GitHub não respondeu à consulta. Confira o repositório e as permissões do token.",
    };
    throw new ErroApiHTTP(
      (mensagem && traducoes[mensagem]) ||
        padrao[resposta.status] ||
        mensagem ||
        "Não foi possível concluir a solicitação.",
      resposta.status,
      dados?.error?.code,
    );
  }
  if (!dados || typeof dados !== "object")
    throw new ErroApiHTTP(
      "A API retornou uma resposta inválida.",
      resposta.status,
    );
  return dados as T;
}
export const api = {
  auth: {
    login: (email: string, password: string) =>
      requisicao<RespostaToken>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    registrar: (username: string, email: string, password: string) =>
      requisicao<CadastroResposta>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ username, email, password }),
      }),
  },
  repositorios: {
    listar: (page = 1, pageSize = 12) =>
      requisicao<Pagina<Repositorio>>(
        "/repositories?page=" + page + "&page_size=" + pageSize,
      ),
    buscar: (id: number) => requisicao<Repositorio>("/repositories/" + id),
    criar: (dados: CriarRepositorioInput) =>
      requisicao<Repositorio>("/repositories", {
        method: "POST",
        body: JSON.stringify(dados),
      }),
  },
  relatorios: {
    gerar: (id: number, tokenGitHub?: string) =>
      requisicao<RelatorioRepositorio>("/repositories/" + id + "/report", {
        headers: tokenGitHub ? { "X-GitHub-Token": tokenGitHub } : {},
      }),
  },
};
/** Reutiliza um cadastro existente; trata também cadastros simultâneos. */
export async function encontrarOuCadastrar(
  owner: string,
  repo: string,
): Promise<Repositorio> {
  async function encontrar(): Promise<Repositorio | null> {
    for (let page = 1; ; page++) {
      const resposta = await api.repositorios.listar(page, 100);
      const item = resposta.items.find(
        (r) =>
          r.owner_name.toLowerCase() === owner.toLowerCase() &&
          r.repository_name.toLowerCase() === repo.toLowerCase(),
      );
      if (item) return item;
      if (page >= resposta.total_pages) return null;
    }
  }
  const existente = await encontrar();
  if (existente) return existente;
  try {
    return await api.repositorios.criar({
      owner_name: owner,
      repository_name: repo,
    });
  } catch (erro) {
    if (erro instanceof ErroApiHTTP && erro.status === 409) {
      const cadastrado = await encontrar();
      if (cadastrado) return cadastrado;
    }
    throw erro;
  }
}
