import "./style.css";
import { api } from "./api";
import { iniciarInterface, exigirAutenticacao } from "./autenticacao";
import {
  obterIdDaUrl,
  htmlCarregando,
  htmlErro,
  mensagemErro,
  setBtnCarregando,
  urlGithub,
  inicializarIcones,
} from "./utilitarios";
import { destruirGraficos, renderizarRelatorio } from "./visualizacao";
iniciarInterface();
const area = document.getElementById("area-relatorio")!;
const btn = document.getElementById("btn-atualizar") as HTMLButtonElement;
const form = document.getElementById("form-atualizar") as HTMLFormElement;
const input = document.getElementById("input-token") as HTMLInputElement;
const id = obterIdDaUrl();
async function carregar(): Promise<void> {
  if (!id || btn.disabled) return;
  destruirGraficos();
  area.innerHTML = htmlCarregando(
    "Consultando o GitHub e calculando as métricas…",
  );
  setBtnCarregando(btn, true);
  try {
    const relatorio = await api.relatorios.gerar(
      id,
      input.value.trim() || undefined,
    );
    document.getElementById("nome-repositorio")!.textContent =
      relatorio.full_name;
    const [owner, repo] = relatorio.full_name.split("/");
    const link = document.getElementById("link-github") as HTMLAnchorElement;
    link.href = urlGithub(owner, repo);
    link.hidden = false;
    renderizarRelatorio(area, relatorio);
  } catch (falha) {
    area.innerHTML =
      htmlErro(mensagemErro(falha)) +
      '<p class="muted retry">Confira o token, se necessário, e clique em Atualizar análise para tentar novamente.</p>';
    inicializarIcones();
  } finally {
    setBtnCarregando(btn, false);
  }
}
form.addEventListener("submit", (event) => {
  event.preventDefault();
  void carregar();
});
if (exigirAutenticacao()) {
  if (id) void carregar();
  else {
    area.innerHTML = htmlErro(
      "O identificador do repositório é inválido. Volte ao painel e selecione um cadastro.",
    );
    btn.disabled = true;
    inicializarIcones();
  }
}
