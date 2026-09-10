import "./style.css";
import { api } from "./api";
import { iniciarInterface, exigirAutenticacao } from "./autenticacao";
import {
  escaparHtml as e,
  extrairGithubUrl,
  validarRepositorio,
  formatarData,
  htmlCarregando,
  htmlErro,
  inicializarIcones,
  mensagemErro,
  setBtnCarregando,
  urlGithub,
} from "./utilitarios";
iniciarInterface();
const area = document.getElementById("area-repositorios")!;
const dialog = document.getElementById(
  "modal-repositorio",
) as HTMLDialogElement;
const form = document.getElementById("form-repositorio") as HTMLFormElement;
const owner = document.getElementById("input-owner") as HTMLInputElement;
const repo = document.getElementById("input-repo") as HTMLInputElement;
const link = document.getElementById("input-link-github") as HTMLInputElement;
const branch = document.getElementById("input-branch") as HTMLSelectElement;
const branchHint = document.getElementById("branch-hint")!;
const erro = document.getElementById("erro-form")!;
const salvar = document.getElementById("btn-salvar-repo") as HTMLButtonElement;
let paginaAtual = 1;
let carregamento = 0;
let carregamentoBranches = 0;
let branchEscolhida = "main";

function preencherBranches(branches: string[], selecionada = "main"): void {
  const nomes = Array.from(new Set([selecionada, ...branches].filter(Boolean)));
  branch.innerHTML = nomes.map(nome => '<option value="' + e(nome) + '">' + e(nome) + "</option>").join("");
  branch.value = selecionada;
  branchEscolhida = selecionada;
  branch.disabled = false;
}

async function carregarBranches(proprietario: string, repositorio: string, selecionada = "main"): Promise<void> {
  const versao = ++carregamentoBranches;
  branch.disabled = true;
  branch.innerHTML = '<option value="">Carregando branches…</option>';
  branchHint.textContent = "Consultando as branches no GitHub…";
  try {
    const branches = await api.repositorios.listarBranchesDoGitHub(proprietario, repositorio);
    if (versao !== carregamentoBranches) return;
    preencherBranches(branches, selecionada);
    branchHint.textContent = branches.length ? branches.length + " branches encontradas no GitHub." : "O GitHub não retornou branches; será usada a branch padrão.";
  } catch (falha) {
    if (versao !== carregamentoBranches) return;
    preencherBranches([], selecionada);
    branchHint.textContent = mensagemErro(falha) + " A branch padrão foi mantida.";
  }
}
async function carregar(page = paginaAtual): Promise<void> {
  const versao = ++carregamento;
  area.innerHTML = htmlCarregando("Carregando repositórios…");
  try {
    const dados = await api.repositorios.listar(page, 12);
    if (versao !== carregamento) return;
    paginaAtual = dados.page;
    document.getElementById("total-repositorios")!.textContent =
      dados.total +
      (dados.total === 1
        ? " repositório cadastrado"
        : " repositórios cadastrados");
    area.innerHTML = dados.items.length
      ? '<div class="repo-grid">' +
        dados.items
          .map(
            (r) =>
              '<article class="card repo-card"><div class="repo-card-top"><span class="repo-icon"><i data-lucide="folder" aria-hidden="true"></i></span><a class="icon-button" href="' +
              e(urlGithub(r.owner_name, r.repository_name)) +
              '" target="_blank" rel="noopener noreferrer" aria-label="Abrir ' +
              e(r.owner_name + "/" + r.repository_name) +
              ' no GitHub"><i data-lucide="external-link" aria-hidden="true"></i></a></div><p class="eyebrow">' +
              e(r.owner_name) +
              "</p><h2>" +
              e(r.repository_name) +
              '</h2><p class="muted repo-description">' +
              e(r.description || "Sem descrição cadastrada.") +
              '</p><p class="small muted">Branch cadastrada: <strong>' +
              e(r.default_branch) +
              '</strong></p><div class="repo-footer"><span class="small muted">' +
              e(formatarData(r.created_at)) +
              '</span><a class="button primary small-button" href="/relatorio.html?id=' +
              r.id +
              '">Analisar <i data-lucide="arrow-right" aria-hidden="true"></i></a><button class="button small-button" data-excluir="' + r.id + '">Excluir</button></div></article>',
          )
          .join("") +
        "</div>"
      : '<div class="card estado"><i data-lucide="folder" aria-hidden="true"></i><h2>Nenhum repositório por aqui</h2><p>Adicione o primeiro repositório para começar sua análise.</p><button type="button" class="button primary" id="btn-primeiro">Adicionar repositório</button></div>';
    if (dados.total_pages > 1) {
      area.insertAdjacentHTML(
        "beforeend",
        '<nav class="pagination" aria-label="Paginação de repositórios"><button class="button" id="pagina-anterior"' +
          (page <= 1 ? " disabled" : "") +
          '>Anterior</button><span role="status">Página ' +
          page +
          " de " +
          dados.total_pages +
          '</span><button class="button" id="pagina-proxima"' +
          (page >= dados.total_pages ? " disabled" : "") +
          ">Próxima</button></nav>",
      );
      document
        .getElementById("pagina-anterior")!
        .addEventListener("click", () => void carregar(page - 1));
      document
        .getElementById("pagina-proxima")!
        .addEventListener("click", () => void carregar(page + 1));
    }
    document.getElementById("btn-primeiro")?.addEventListener("click", abrir);
    area.querySelectorAll<HTMLButtonElement>("[data-excluir]").forEach(botao => botao.addEventListener("click", async () => {
      if (!confirm("Excluir este cadastro e seu histórico de relatórios? O repositório no GitHub será mantido.")) return;
      botao.disabled = true;
      try { await api.repositorios.deletar(Number(botao.dataset.excluir)); await carregar(1); }
      catch (falha) { botao.disabled = false; avisoRemoto.textContent = mensagemErro(falha); }
    }));
  } catch (falha) {
    if (versao !== carregamento) return;
    area.innerHTML =
      htmlErro(mensagemErro(falha)) +
      '<button class="button retry" id="tentar-novamente">Tentar novamente</button>';
    document
      .getElementById("tentar-novamente")!
      .addEventListener("click", () => void carregar(page));
  }
  inicializarIcones();
}
function abrir(): void {
  form.reset();
  preencherBranches([], "main");
  branchHint.textContent = "As branches serão carregadas do GitHub depois que você informar o repositório.";
  erro.hidden = true;
  dialog.showModal();
  link.focus();
}
document.getElementById("btn-adicionar")!.addEventListener("click", abrir);
const importar = document.createElement("button");
importar.type = "button"; importar.className = "button"; importar.textContent = "Importar do GitHub";
document.getElementById("btn-adicionar")!.after(importar);
const avisoRemoto = document.createElement("p"); avisoRemoto.className = "muted"; avisoRemoto.setAttribute("role", "status");
const remotos = document.createElement("div"); remotos.className = "card goals-form"; remotos.hidden = true;
area.before(avisoRemoto, remotos);
importar.addEventListener("click", async () => {
  importar.disabled = true; avisoRemoto.textContent = "Consultando seus repositórios no GitHub…";
  try {
    const dados = await api.repositorios.listarDoGitHub();
    remotos.hidden = false;
    avisoRemoto.textContent = dados.length + " repositórios encontrados.";
    remotos.innerHTML =
      '<div class="github-import-header"><div><p class="eyebrow">Sua conta GitHub</p><h2>Escolha um repositório</h2><p class="muted">Escolha o projeto e confirme a branch antes da análise.</p></div><button type="button" class="button small-button" id="alternar-importacao" aria-expanded="true">Recolher lista</button></div><div id="conteudo-importacao">' +
      (dados.length
        ? '<div class="github-import-grid" role="list">' + dados.map((r, i) =>
          '<article class="github-import-item" role="listitem"><div class="github-import-title"><div><p class="eyebrow">' + e(r.owner.login) + '</p><h3>' + e(r.name) + '</h3></div><span class="badge">' + (r.private ? 'Privado' : 'Público') + '</span></div><p class="muted github-import-description">' + e(r.description || 'Sem descrição no GitHub.') + '</p><p class="small muted">Branch padrão: <strong>' + e(r.branch_padrao) + '</strong></p><div class="github-import-actions"><a class="button small-button" href="' + e(r.html_url) + '" target="_blank" rel="noopener noreferrer">Abrir no GitHub</a><button type="button" class="button primary small-button" data-importar-repositorio="' + i + '" aria-label="Selecionar ' + e(r.full_name) + '">Selecionar</button></div></article>'
        ).join('') + '</div>'
        : '<div class="estado"><p>Nenhum repositório foi retornado pelo GitHub.</p></div>') + '</div>';
    remotos.querySelector("#alternar-importacao")!.addEventListener("click", event => {
      const botao = event.currentTarget as HTMLButtonElement;
      const conteudo = remotos.querySelector<HTMLElement>("#conteudo-importacao")!;
      conteudo.hidden = !conteudo.hidden;
      botao.setAttribute("aria-expanded", String(!conteudo.hidden));
      botao.textContent = conteudo.hidden ? "Expandir lista" : "Recolher lista";
    });
    remotos.querySelectorAll<HTMLButtonElement>("[data-importar-repositorio]").forEach(botao => botao.addEventListener("click", async () => {
      const r = dados[Number(botao.dataset.importarRepositorio)];
      if (!r) return;
      abrir();
      owner.value = r.owner.login;
      repo.value = r.name;
      link.value = r.html_url || urlGithub(r.owner.login, r.name);
      (document.getElementById("input-descricao") as HTMLInputElement).value = r.description ?? "";
      await carregarBranches(r.owner.login, r.name, r.branch_padrao);
    }));
    inicializarIcones();
  } catch (falha) { avisoRemoto.textContent = mensagemErro(falha); }
  finally { importar.disabled = false; }
});
document.getElementById("btn-cancelar-modal")!.addEventListener("click", () => {
  if (!salvar.disabled) dialog.close();
});
dialog.addEventListener("cancel", (event) => {
  if (salvar.disabled) event.preventDefault();
});
link.addEventListener("input", () => {
  const parsed = extrairGithubUrl(link.value);
  if (parsed) {
    owner.value = parsed.owner;
    repo.value = parsed.repo;
    erro.hidden = true;
  }
});
link.addEventListener("change", () => {
  const parsed = extrairGithubUrl(link.value);
  if (parsed) void carregarBranches(parsed.owner, parsed.repo);
});
repo.addEventListener("change", () => {
  if (validarRepositorio(owner.value.trim(), repo.value.trim())) void carregarBranches(owner.value.trim(), repo.value.trim());
});
branch.addEventListener("change", () => { branchEscolhida = branch.value; });
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (salvar.disabled || !form.reportValidity()) return;
  if (
    (link.value.trim() && !extrairGithubUrl(link.value)) ||
    !validarRepositorio(owner.value.trim(), repo.value.trim())
  ) {
    erro.textContent =
      "Informe uma URL válida do GitHub ou confira proprietário e repositório.";
    erro.hidden = false;
    return;
  }
  const dadosCadastro = {
    owner_name: owner.value.trim(),
    repository_name: repo.value.trim(),
    description:
      (document.getElementById("input-descricao") as HTMLInputElement).value.trim() || null,
    default_branch: branchEscolhida || "main",
  };
  setBtnCarregando(salvar, true);
  erro.hidden = true;
  try {
    const criado = await api.repositorios.criar(dadosCadastro);
    dialog.close();
    location.assign("/relatorio.html?id=" + criado.id);
  } catch (falha) {
    erro.textContent = mensagemErro(falha);
    erro.hidden = false;
  } finally {
    setBtnCarregando(salvar, false);
  }
});
void exigirAutenticacao().then(ok => { if (ok) void carregar(); });
