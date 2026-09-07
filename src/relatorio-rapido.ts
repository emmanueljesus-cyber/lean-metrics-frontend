import "./style.css";
import { api, encontrarOuCadastrar } from "./api";
import { iniciarInterface, exigirAutenticacao } from "./autenticacao";
import {
  extrairGithubUrl,
  validarRepositorio,
  htmlCarregando,
  htmlErro,
  mensagemErro,
  setBtnCarregando,
  inicializarIcones,
} from "./utilitarios";
import { destruirGraficos, renderizarRelatorio } from "./visualizacao";
iniciarInterface();
const form = document.getElementById("form-quick") as HTMLFormElement;
const link = document.getElementById("input-link-github") as HTMLInputElement;
const owner = document.getElementById("input-owner") as HTMLInputElement;
const repo = document.getElementById("input-repo") as HTMLInputElement;
const token = document.getElementById("input-token") as HTMLInputElement;
const btn = document.getElementById("btn-analisar") as HTMLButtonElement;
const area = document.getElementById("area-resultado")!;
const erro = document.getElementById("erro-form")!;
link.addEventListener("input", () => {
  const parsed = extrairGithubUrl(link.value);
  if (parsed) {
    owner.value = parsed.owner;
    repo.value = parsed.repo;
    erro.hidden = true;
  }
});
document.querySelectorAll<HTMLButtonElement>("[data-repo]").forEach((exemplo) =>
  exemplo.addEventListener("click", () => {
    if (btn.disabled) return;
    [owner.value, repo.value] = exemplo.dataset.repo!.split("/");
    link.value = "https://github.com/" + exemplo.dataset.repo;
  }),
);
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (btn.disabled || !form.reportValidity()) return;
  erro.hidden = true;
  if (
    (link.value.trim() && !extrairGithubUrl(link.value)) ||
    !validarRepositorio(owner.value.trim(), repo.value.trim())
  ) {
    erro.textContent =
      "Confira a URL do GitHub, o proprietário e o nome do repositório.";
    erro.hidden = false;
    return;
  }
  setBtnCarregando(btn, true);
  destruirGraficos();
  document.getElementById("resultado-nome")!.hidden = true;
  area.innerHTML = htmlCarregando(
    "Preparando o cadastro e consultando o GitHub…",
  );
  try {
    const cadastro = await encontrarOuCadastrar(
      owner.value.trim(),
      repo.value.trim(),
    );
    const relatorio = await api.relatorios.gerar(
      cadastro.id,
      token.value.trim() || undefined,
    );
    const titulo = document.getElementById("resultado-nome")!;
    titulo.textContent = relatorio.full_name;
    titulo.hidden = false;
    renderizarRelatorio(area, relatorio);
    titulo.scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
  } catch (falha) {
    document.getElementById("resultado-nome")!.hidden = true;
    area.innerHTML = htmlErro(mensagemErro(falha));
    inicializarIcones();
  } finally {
    setBtnCarregando(btn, false);
  }
});
const params = new URLSearchParams(location.search);
owner.value = params.get("owner") ?? params.get("proprietario") ?? "";
repo.value = params.get("repo") ?? params.get("repositorio") ?? "";
exigirAutenticacao();
