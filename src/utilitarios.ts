import {
  createIcons,
  BarChart3,
  Clock,
  RotateCw,
  Activity,
  Layers,
  Bug,
  Users,
  Folder,
  GitPullRequest,
  Sun,
  Moon,
  ArrowLeft,
  Plus,
  Search,
  ExternalLink,
  Info,
  AlertTriangle,
  CheckCircle,
  LogOut,
  ArrowRight,
  X,
  Key,
} from "lucide";

export function inicializarIcones(): void {
  createIcons({
    icons: {
      BarChart3,
      Clock,
      RotateCw,
      Activity,
      Layers,
      Bug,
      Users,
      Folder,
      GitPullRequest,
      Sun,
      Moon,
      ArrowLeft,
      Plus,
      Search,
      ExternalLink,
      Info,
      AlertTriangle,
      CheckCircle,
      LogOut,
      ArrowRight,
      X,
      Key,
    },
  });
}
export function escaparHtml(valor: unknown): string {
  return String(valor ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
}
export const numero = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2,
});
export function formatarValorMetrica(
  valor: number | null,
  unidade: string | null,
): string {
  if (typeof valor !== "number" || !Number.isFinite(valor)) return "Sem dados";
  if (unidade === "ratio") return numero.format(valor * 100) + "%";
  const sufixo: Record<string, string> = {
    hours: " h",
    count: "",
    days: " dias",
  };
  return (
    numero.format(valor) + (unidade ? (sufixo[unidade] ?? " " + unidade) : "")
  );
}
export function formatarData(iso?: string | null): string {
  if (!iso || !Number.isFinite(new Date(iso).getTime()))
    return "Data indisponível";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}
export function htmlCarregando(mensagem = "Carregando..."): string {
  return (
    '<div class="estado" role="status"><span class="spinner" aria-hidden="true"></span><p>' +
    escaparHtml(mensagem) +
    "</p></div>"
  );
}
export function htmlErro(mensagem: string): string {
  return (
    '<div class="aviso erro" role="alert"><i data-lucide="alert-triangle" aria-hidden="true"></i><p>' +
    escaparHtml(mensagem) +
    "</p></div>"
  );
}
export function setBtnCarregando(
  btn: HTMLButtonElement,
  carregando: boolean,
): void {
  if (carregando && !btn.disabled) {
    btn.dataset.original = btn.innerHTML;
    btn.innerHTML = '<span class="spinner" aria-hidden="true"></span> Aguarde…';
  } else if (!carregando && btn.dataset.original) {
    btn.innerHTML = btn.dataset.original;
    delete btn.dataset.original;
  }
  btn.disabled = carregando;
  btn.setAttribute("aria-busy", String(carregando));
  inicializarIcones();
}
export function obterIdDaUrl(): number | null {
  const raw = new URLSearchParams(location.search).get("id") ?? "";
  const n = Number(raw);
  return /^[1-9]\d*$/.test(raw) && Number.isSafeInteger(n) ? n : null;
}
export function extrairGithubUrl(
  entrada: string,
): { owner: string; repo: string } | null {
  try {
    const url = new URL(
      entrada.includes("://") ? entrada : "https://" + entrada,
    );
    if (
      url.protocol !== "https:" ||
      !["github.com", "www.github.com"].includes(url.hostname) ||
      url.username ||
      url.password
    )
      return null;
    const partes = url.pathname.split("/").filter(Boolean);
    const owner = partes[0] ?? "";
    const repo = (partes[1] ?? "").replace(/\.git$/i, "");
    return validarRepositorio(owner, repo) ? { owner, repo } : null;
  } catch {
    return null;
  }
}
export function validarRepositorio(owner: string, repo: string): boolean {
  return (
    /^[a-z\d](?:[a-z\d-]{0,38})$/i.test(owner) &&
    /^[\w.-]{1,100}$/.test(repo) &&
    ![".", ".."].includes(repo)
  );
}
export function urlGithub(owner: string, repo: string): string {
  return (
    "https://github.com/" +
    encodeURIComponent(owner) +
    "/" +
    encodeURIComponent(repo)
  );
}
export function mensagemErro(erro: unknown): string {
  return erro instanceof Error
    ? erro.message
    : "Ocorreu um erro. Tente novamente.";
}
