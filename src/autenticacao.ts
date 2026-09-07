import { obterToken, limparSessao } from "./api";
import { inicializarTema } from "./tema";
import { inicializarIcones } from "./utilitarios";

export function estaAutenticado(): boolean {
  const token = obterToken();
  if (!token) return false;
  try {
    const raw = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(raw));
    if (typeof payload.exp !== "number" || payload.exp * 1000 <= Date.now()) {
      limparSessao();
      return false;
    }
    return true; // Apenas estado visual: a API valida assinatura e acesso em cada requisição.
  } catch {
    limparSessao();
    return false;
  }
}
export function exigirAutenticacao(): boolean {
  if (estaAutenticado()) return true;
  location.replace(
    "/index.html?entrar=1&next=" +
      encodeURIComponent(location.pathname + location.search),
  );
  return false;
}
export function destinoAposLogin(): string {
  const next = new URLSearchParams(location.search).get("next");
  if (next) {
    const destino = new URL(next, location.origin);
    if (
      destino.origin === location.origin &&
      ["/painel.html", "/relatorio.html", "/relatorio-rapido.html"].includes(
        destino.pathname,
      )
    )
      return destino.pathname + destino.search;
  }
  return "/painel.html";
}
export function iniciarInterface(): void {
  inicializarTema();
  const logado = estaAutenticado();
  document.querySelectorAll<HTMLElement>("[data-auth]").forEach((el) => {
    el.hidden = (el.dataset.auth === "logado") !== logado;
  });
  const perfil = document.getElementById("nav-usuario");
  if (perfil && logado) {
    try {
      perfil.textContent =
        JSON.parse(sessionStorage.getItem("lean-metrics-user") ?? "{}")
          .username ?? "Minha conta";
    } catch {
      perfil.textContent = "Minha conta";
    }
  }
  document.getElementById("btn-logout")?.addEventListener("click", () => {
    limparSessao();
    location.assign("/index.html");
  });
  window.addEventListener(
    "sessionexpired",
    () => {
      location.replace(
        "/index.html?entrar=1&expirada=1&next=" +
          encodeURIComponent(location.pathname + location.search),
      );
    },
    { once: true },
  );
  inicializarIcones();
}
