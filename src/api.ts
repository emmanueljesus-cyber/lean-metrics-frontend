/**
 * api.ts — Cliente HTTP tipado para a API do GitHub Lean Metrics
 * Todas as requisições da aplicação passam por este módulo.
 */

import type {
  UsuarioPerfil,
  Repositorio,
  RepositorioGitHub,
  Pagina,
  CriarRepositorioInput,
  AtualizarRepositorioInput,
  RelatorioRepositorio,
} from './types';

// Em dev, o Vite proxy redireciona /api → http://localhost:8000/api
// Em produção ou caso VITE_API_URL esteja definida, a usamos como base absoluta.
const API_BASE = import.meta.env.VITE_API_URL 
  ? (import.meta.env.VITE_API_URL.endsWith('/') ? import.meta.env.VITE_API_URL.slice(0, -1) : import.meta.env.VITE_API_URL) + '/api/v1' 
  : '/api/v1';

// ── Classe de erro tipado ──────────────────────────────────────────

export class ErroApiHTTP extends Error {
  status: number;
  codigo: string;

  constructor(
    mensagem: string,
    status: number,
    codigo: string,
  ) {
    super(mensagem);
    this.name = 'ErroApiHTTP';
    this.status = status;
    this.codigo = codigo;
  }
}

// ── Função central de requisição ───────────────────────────────────

async function requisicao<T>(caminho: string, opcoes: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${caminho}`;

  const config: RequestInit = {
    credentials: 'include', // Envia cookie httponly automaticamente
    headers: {
      'Content-Type': 'application/json',
      ...(opcoes.headers as Record<string, string> | undefined),
    },
    ...opcoes,
  };

  const resposta = await fetch(url, config);

  // Sem conteúdo (ex: DELETE 204)
  if (resposta.status === 204) return null as T;

  const dados = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    const mensagem: string = dados?.error?.message ?? `Erro ${resposta.status}`;
    const codigo: string   = dados?.error?.code   ?? 'api_error';
    throw new ErroApiHTTP(mensagem, resposta.status, codigo);
  }

  return dados as T;
}

// ── Helpers de método ──────────────────────────────────────────────

function get<T>(caminho: string, cabecalhos?: Record<string, string>): Promise<T> {
  return requisicao<T>(caminho, { method: 'GET', headers: cabecalhos });
}

function post<T>(caminho: string, corpo?: unknown): Promise<T> {
  return requisicao<T>(caminho, { method: 'POST', body: JSON.stringify(corpo) });
}

function patch<T>(caminho: string, corpo: unknown): Promise<T> {
  return requisicao<T>(caminho, { method: 'PATCH', body: JSON.stringify(corpo) });
}

function deletar(caminho: string): Promise<null> {
  return requisicao<null>(caminho, { method: 'DELETE' });
}

// ── Endpoints agrupados por domínio ───────────────────────────────

export const api = {
  auth: {
    /** Retorna o perfil do usuário autenticado (usa cookie httponly) */
    perfil: () => get<UsuarioPerfil>('/auth/me'),

    /** Encerra a sessão e limpa os cookies */
    logout: () => post<null>('/auth/logout'),
  },

  repositorios: {
    /** Lista os repositórios do usuário com paginação */
    listar: (pagina = 1, tamanho = 20) =>
      get<Pagina<Repositorio>>(`/repositories?page=${pagina}&page_size=${tamanho}`),

    /** Busca um repositório pelo ID */
    buscar: (id: number) => get<Repositorio>(`/repositories/${id}`),

    /** Cadastra um novo repositório */
    criar: (dados: CriarRepositorioInput) =>
      post<Repositorio>('/repositories', dados),

    /** Atualiza campos opcionais de um repositório */
    atualizar: (id: number, dados: AtualizarRepositorioInput) =>
      patch<Repositorio>(`/repositories/${id}`, dados),

    /** Remove um repositório permanentemente */
    deletar: (id: number) => deletar(`/repositories/${id}`),

    /** Lista repositórios do GitHub para importação */
    listarDoGitHub: (tokenGitHub?: string) =>
      get<RepositorioGitHub[]>(
        '/repositories/github/list',
        tokenGitHub ? { 'X-GitHub-Token': tokenGitHub } : undefined,
      ),
  },

  relatorios: {
    /** Gera um relatório Lean para um repositório cadastrado */
    gerar: (repositorioId: number, tokenGitHub?: string) =>
      get<RelatorioRepositorio>(
        `/reports/${repositorioId}/report`,
        tokenGitHub ? { 'X-GitHub-Token': tokenGitHub } : undefined,
      ),

    /** Histórico de relatórios persistidos do repositório */
    historico: (repositorioId: number, limite = 10) =>
      get<RelatorioRepositorio[]>(`/reports/${repositorioId}/reports?limit=${limite}`),

    /** Análise rápida de qualquer repositório público */
    rapido: (owner: string, repo: string, tokenGitHub?: string) =>
      get<RelatorioRepositorio>(
        `/reports/quick-report?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`,
        tokenGitHub ? { 'X-GitHub-Token': tokenGitHub } : undefined,
      ),
  },
};
