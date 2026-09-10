import { api, OAUTH_BASE, ErroApiHTTP } from "./api";
import { inicializarTema } from "./tema";
import { inicializarIcones, mensagemErro } from "./utilitarios";
import type { UsuarioPerfil } from "./tipos";

let perfil: Promise<UsuarioPerfil | null> | null = null;
export function buscarUsuarioAtual(): Promise<UsuarioPerfil | null> {
  return perfil ??= api.auth.perfil().catch(erro => {
    if (erro instanceof ErroApiHTTP && erro.status === 401) return null;
    perfil = null; throw erro;
  });
}
export function iniciarLoginGitHub(): void {
  const next = new URLSearchParams(location.search).get("next");
  if (next?.startsWith("/") && !next.startsWith("//")) sessionStorage.setItem("lean-login-next", next);
  location.assign(OAUTH_BASE + "/autenticacao/github/entrar");
}
export async function exigirAutenticacao(): Promise<boolean> {
  try {
    if (await buscarUsuarioAtual()) return true;
    location.replace("/index.html?entrar=1&next=" + encodeURIComponent(location.pathname + location.search) + "#acesso");
  } catch (erro) { mostrarErroAuth(erro); }
  return false;
}
function mostrarErroAuth(erro: unknown): void {
  let aviso = document.getElementById("auth-feedback");
  if (!aviso) {
    aviso = document.createElement("p"); aviso.id = "auth-feedback"; aviso.className = "container form-error";
    aviso.setAttribute("role", "alert"); document.querySelector("main")?.prepend(aviso);
  }
  aviso.textContent = mensagemErro(erro); aviso.hidden = false;
}
function aplicarEstadoAutenticacao(usuario: UsuarioPerfil | null): void {
  document.querySelectorAll<HTMLElement>("[data-auth]").forEach(el => {
    el.hidden = (el.dataset.auth === "logado") !== !!usuario;
  });
}
export async function iniciarInterface(): Promise<UsuarioPerfil | null> {
  inicializarTema();
  document.querySelectorAll<HTMLElement>("[data-login-github]").forEach(btn => btn.addEventListener("click", iniciarLoginGitHub));
  document.getElementById("btn-logout")?.addEventListener("click", async () => {
    try { await api.auth.logout(); location.assign("/index.html"); } catch (erro) { mostrarErroAuth(erro); }
  });
  window.addEventListener("sessionexpired", () => location.replace("/index.html?entrar=1&expirada=1&next=" + encodeURIComponent(location.pathname + location.search) + "#acesso"), { once: true });
  inicializarIcones();
  try {
    const usuario = await buscarUsuarioAtual();
    aplicarEstadoAutenticacao(usuario);
    const nome = document.getElementById("nav-usuario");
    if (nome && usuario) nome.textContent = usuario.nome_usuario;
    if (usuario && location.pathname === "/painel.html") {
      const next = sessionStorage.getItem("lean-login-next");
      sessionStorage.removeItem("lean-login-next");
      if (next) {
        const url = new URL(next, location.origin);
        if (url.origin === location.origin && ["/relatorio.html", "/relatorio-rapido.html"].includes(url.pathname)) location.replace(url.pathname + url.search);
      }
    }
    return usuario;
  } catch (erro) { aplicarEstadoAutenticacao(null); mostrarErroAuth(erro); return null; }
}
