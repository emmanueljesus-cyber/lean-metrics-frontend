/**
 * auth.ts — Utilitários de autenticação, sessão e notificações (toast)
 */

import './tema';
import { api, ErroApiHTTP } from './api';
import type { UsuarioPerfil } from './tipos';
import { inicializarIcones } from './utilitarios';

const API_URL_COMPLETA = import.meta.env.VITE_API_URL 
  ? (import.meta.env.VITE_API_URL.endsWith('/') ? import.meta.env.VITE_API_URL.slice(0, -1) : import.meta.env.VITE_API_URL) + '/api/v1' 
  : 'http://localhost:8000/api/v1';

const URL_LOGIN_GITHUB = `${API_URL_COMPLETA}/autenticacao/github/entrar`;

// ── Login / Logout ─────────────────────────────────────────────────

/** Redireciona para o fluxo OAuth do GitHub */
export function iniciarLoginGitHub(): void {
  window.location.href = URL_LOGIN_GITHUB;
}

/**
 * Busca o usuário autenticado via cookie httponly.
 * Retorna null se não houver sessão válida — sem lançar erro.
 */
export async function buscarUsuarioAtual(): Promise<UsuarioPerfil | null> {
  try {
    return await api.auth.perfil();
  } catch (err) {
    if (err instanceof ErroApiHTTP && (err.status === 401 || err.status === 403)) {
      return null;
    }
    throw err;
  }
}

/** Faz logout e redireciona para a landing */
export async function fazerLogout(): Promise<void> {
  try {
    await api.auth.logout();
  } catch {
    // Ignora erros — redireciona de qualquer forma
  }
  window.location.href = '/index.html';
}

/**
 * Guarda de autenticação: busca o usuário e redireciona para a
 * landing se não estiver autenticado. Use no início de páginas protegidas.
 */
export async function exigirAutenticacao(): Promise<UsuarioPerfil> {
  const usuario = await buscarUsuarioAtual();
  if (!usuario) {
    window.location.href = '/index.html';
    // Retorna uma Promise que nunca resolve (o redirect vai acontecer)
    return new Promise(() => {});
  }
  return usuario;
}

// ── Navbar ─────────────────────────────────────────────────────────

/** Atualiza o avatar e nome na navbar com os dados do usuário */
export function atualizarNavbarUsuario(usuario: UsuarioPerfil): void {
  const container = document.getElementById('nav-usuario');
  if (!container) return;

  if (usuario.url_avatar) {
    container.innerHTML = `
      <img
        src="${usuario.url_avatar}"
        alt="${usuario.nome_usuario}"
        title="${usuario.nome_usuario}"
        class="w-8 h-8 rounded-full border-2 border-white/10 object-cover"
      />
    `;
  } else {
    const inicial = (usuario.nome_usuario[0] ?? '?').toUpperCase();
    container.innerHTML = `
      <div
        title="${usuario.nome_usuario}"
        class="w-8 h-8 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-sm font-semibold"
        style="color: var(--color-texto-suave);"
      >
        ${inicial}
      </div>
    `;
  }

  // Botão de logout
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', fazerLogout);
  }
}

/**
 * Mostra/esconde elementos baseado no estado de autenticação.
 * data-auth="logado"    → visível apenas quando autenticado
 * data-auth="deslogado" → visível apenas quando não autenticado
 */
export function aplicarEstadoAuth(autenticado: boolean): void {
  document.querySelectorAll<HTMLElement>('[data-auth="logado"]').forEach(el => {
    el.style.display = autenticado ? '' : 'none';
  });
  document.querySelectorAll<HTMLElement>('[data-auth="deslogado"]').forEach(el => {
    el.style.display = autenticado ? 'none' : '';
  });
}

// ── Toast ──────────────────────────────────────────────────────────

export type TipoToast = 'sucesso' | 'erro' | 'aviso';

const ICONES_TOAST: Record<TipoToast, string> = {
  sucesso: '<i data-lucide="check-circle" class="w-4 h-4 text-[#00c896]"></i>',
  erro:    '<i data-lucide="alert-triangle" class="w-4 h-4 text-[#ff4d6d]"></i>',
  aviso:   '<i data-lucide="alert-triangle" class="w-4 h-4 text-[#ffb84d]"></i>',
};

const CORES_TOAST: Record<TipoToast, string> = {
  sucesso: 'border-l-[3px] border-l-[#00c896]',
  erro:    'border-l-[3px] border-l-[#ff4d6d]',
  aviso:   'border-l-[3px] border-l-[#ffb84d]',
};

function garantirAreaToast(): HTMLElement {
  let area = document.getElementById('area-toast');
  if (!area) {
    area = document.createElement('div');
    area.id = 'area-toast';
    area.className = 'fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none';
    document.body.appendChild(area);
  }
  return area;
}

/**
 * Exibe uma notificação toast temporária.
 * @param mensagem - Texto da notificação
 * @param tipo     - 'sucesso' | 'erro' | 'aviso'
 * @param duracao  - Duração em ms (padrão: 4000)
 */
export function mostrarToast(
  mensagem: string,
  tipo: TipoToast = 'sucesso',
  duracao = 4000,
): void {
  const area = garantirAreaToast();

  const toast = document.createElement('div');
  toast.className = [
    'pointer-events-auto flex items-center gap-2 px-4 py-3',
    'rounded-xl text-sm font-medium max-w-sm',
    'shadow-2xl animar-entrar',
    CORES_TOAST[tipo],
  ].join(' ');
  toast.style.cssText = `
    background: #0f1829;
    border: 1px solid rgba(255,255,255,0.08);
    color: var(--color-texto);
  `;
  toast.innerHTML = `<span class="flex items-center justify-center">${ICONES_TOAST[tipo]}</span><span>${mensagem}</span>`;

  area.appendChild(toast);
  inicializarIcones();

  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s, transform 0.3s';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(12px)';
    setTimeout(() => toast.remove(), 300);
  }, duracao);
}
