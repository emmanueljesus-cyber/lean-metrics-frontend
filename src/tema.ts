import { inicializarIcones } from "./utilitarios";
let salvo: string | null = null;
try {
  salvo = localStorage.getItem("theme");
} catch {
  /* Tema funciona sem armazenamento. */
}
document.documentElement.classList.toggle("light", salvo === "light");
export function inicializarTema(): void {
  const btn = document.getElementById(
    "btn-theme-toggle",
  ) as HTMLButtonElement | null;
  if (!btn) return;
  const atualizar = () => {
    const claro = document.documentElement.classList.contains("light");
    btn.innerHTML =
      '<i data-lucide="' +
      (claro ? "moon" : "sun") +
      '" aria-hidden="true"></i>';
    btn.setAttribute(
      "aria-label",
      claro ? "Ativar tema escuro" : "Ativar tema claro",
    );
    btn.title = btn.getAttribute("aria-label")!;
    inicializarIcones();
  };
  btn.addEventListener("click", () => {
    const claro = document.documentElement.classList.toggle("light");
    try {
      localStorage.setItem("theme", claro ? "light" : "dark");
    } catch {
      /* Opcional. */
    }
    atualizar();
    window.dispatchEvent(new Event("themechanged"));
  });
  atualizar();
}
