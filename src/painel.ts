/**
 * dashboard.ts — Lógica do Dashboard
 * Gerencia a listagem, criação e exclusão de repositórios.
 */

import './style.css';
import { exigirAutenticacao, atualizarNavbarUsuario, fazerLogout, mostrarToast } from './autenticacao';
import { api, ErroApiHTTP } from './api';
import { htmlCarregando, htmlVazio, htmlErro, setBtnCarregando, formatarDataCurta, inicializarIcones, extrairGithubUrl } from './utilitarios';
import type { Repositorio, CriarRepositorioInput } from './tipos';

// ── Estado ─────────────────────────────────────────────────────────

let repositorios: Repositorio[] = [];

// ── Referências ao DOM ─────────────────────────────────────────────

const areaRepositorios = document.getElementById('area-repositorios')!;
const modalOverlay = document.getElementById('modal-overlay')!;
const formRepo = document.getElementById('form-repositorio') as HTMLFormElement;
const inputOwner = document.getElementById('input-owner') as HTMLInputElement;
const inputRepo = document.getElementById('input-repo') as HTMLInputElement;
const inputDescricao = document.getElementById('input-descricao') as HTMLInputElement;
const erroForm = document.getElementById('erro-form')!;
const btnSalvar = document.getElementById('btn-salvar-repo') as HTMLButtonElement;

// Novos inputs e wrapper do preenchimento rápido
const selectGithubRepo = document.getElementById('select-github-repo') as HTMLSelectElement | null;
const inputLinkGithub = document.getElementById('input-link-github') as HTMLInputElement | null;
const wrapperSelectGithub = document.getElementById('wrapper-select-github') as HTMLDivElement | null;


// ── Renderização ───────────────────────────────────────────────────

function renderizarRepositorios(): void {
  if (repositorios.length === 0) {
    areaRepositorios.innerHTML = htmlVazio(
      '<i data-lucide="folder" class="w-12 h-12"></i>',
      'Nenhum repositório cadastrado',
      'Clique em "Adicionar repositório" para começar a análise.',
    );
    inicializarIcones();
    return;
  }

  areaRepositorios.innerHTML = `
    <div class="grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));">
      ${repositorios.map(renderizarCardRepositorio).join('')}
    </div>
  `;

  // Eventos dos cards
  repositorios.forEach(repo => {
    document.getElementById(`btn-analisar-${repo.id}`)
      ?.addEventListener('click', () => irParaRelatorio(repo.id));

    document.getElementById(`btn-excluir-${repo.id}`)
      ?.addEventListener('click', () => confirmarExclusao(repo));
  });

  inicializarIcones();
}

function renderizarCardRepositorio(repo: Repositorio): string {
  const visibilidade = repo.private
    ? `<span class="text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1" style="background: rgba(255,184,77,0.12); color: #ffb84d; border: 1px solid rgba(255,184,77,0.25);"><i data-lucide="lock" class="w-3.5 h-3.5"></i> Privado</span>`
    : `<span class="text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1" style="background: var(--color-acento-suave); color: var(--color-acento); border: 1px solid rgba(0,200,150,0.25);"><i data-lucide="globe" class="w-3.5 h-3.5"></i> Público</span>`;

  return `
    <div class="glass-card p-5 flex flex-col gap-4 animar-entrar"
         style="transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;"
         onmouseover="this.style.borderColor='var(--color-borda-hover)'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 32px rgba(0,0,0,0.4)'"
         onmouseout="this.style.borderColor='var(--color-borda)'; this.style.transform=''; this.style.boxShadow=''">

      <!-- Cabeçalho do card -->
      <div class="flex items-start justify-between gap-2">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap mb-1">
            ${visibilidade}
          </div>
          <h3 class="font-bold text-base truncate" style="color: var(--color-texto);">${repo.full_name}</h3>
          <p class="text-xs mt-0.5" style="color: var(--color-texto-suave);">
            Branch: <code style="color: var(--color-acento);">${repo.branch_padrao}</code>
          </p>
        </div>
        <a href="${repo.html_url}" target="_blank" rel="noopener"
           class="text-sm flex-shrink-0 transition-colors duration-200"
           style="color: var(--color-texto-suave);"
           title="Abrir no GitHub"
           onmouseover="this.style.color='var(--color-acento)'"
           onmouseout="this.style.color='var(--color-texto-suave)'">
          ↗
        </a>
      </div>

      <!-- Descrição -->
      ${repo.description
      ? `<p class="text-sm line-clamp-2" style="color: var(--color-texto-suave); flex: 1;">${repo.description}</p>`
      : `<p class="text-sm italic" style="color: var(--color-texto-fraco); flex: 1;">Sem descrição</p>`}

      <!-- Rodapé do card -->
      <div class="flex items-center justify-between gap-2 pt-3"
           style="border-top: 1px solid var(--color-borda);">
        <span class="text-xs" style="color: var(--color-texto-fraco);">
          Cadastrado em ${formatarDataCurta(repo.criado_em)}
        </span>
        <div class="flex gap-2">
          <button id="btn-excluir-${repo.id}"
                  class="px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition-colors duration-200"
                  style="background: transparent; border-color: var(--color-borda); color: var(--color-texto-suave);"
                  onmouseover="this.style.background='rgba(255,77,109,0.1)'; this.style.color='#ff4d6d'; this.style.borderColor='rgba(255,77,109,0.3)'"
                  onmouseout="this.style.background='transparent'; this.style.color='var(--color-texto-suave)'; this.style.borderColor='var(--color-borda)'">
            Remover
          </button>
          <button id="btn-analisar-${repo.id}"
                  class="px-3 py-1.5 rounded-lg text-xs font-bold gradient-acento border-0 cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
                  style="color: #070d1a;">
            Analisar
          </button>
        </div>
      </div>
    </div>
  `;
}

// ── Navegação ──────────────────────────────────────────────────────

function irParaRelatorio(id: number): void {
  window.location.href = `/relatorio.html?id=${id}`;
}

// ── Modal ──────────────────────────────────────────────────────────

function abrirModal(): void {
  formRepo.reset();
  if (selectGithubRepo) selectGithubRepo.value = '';
  if (inputLinkGithub) inputLinkGithub.value = '';
  esconderErroForm();
  modalOverlay.style.setProperty('display', 'flex', 'important');
  setTimeout(() => {
    if (selectGithubRepo && wrapperSelectGithub && !wrapperSelectGithub.classList.contains('hidden')) {
      selectGithubRepo.focus();
    } else if (inputLinkGithub) {
      inputLinkGithub.focus();
    } else {
      inputOwner.focus();
    }
  }, 50);
}

function fecharModal(): void {
  modalOverlay.style.setProperty('display', 'none', 'important');
}

function mostrarErroForm(mensagem: string): void {
  erroForm.textContent = mensagem;
  erroForm.classList.remove('hidden');
}

function esconderErroForm(): void {
  erroForm.classList.add('hidden');
}

// ── CRUD ───────────────────────────────────────────────────────────

async function carregarRepositorios(): Promise<void> {
  areaRepositorios.innerHTML = htmlCarregando('Carregando repositórios...');
  try {
    const pagina = await api.repositorios.listar(1, 50);
    repositorios = pagina.items;
    renderizarRepositorios();
  } catch (err) {
    const msg = err instanceof ErroApiHTTP ? err.message : 'Falha ao carregar repositórios.';
    areaRepositorios.innerHTML = htmlErro(msg);
    inicializarIcones();
  }
}

async function criarRepositorio(dados: CriarRepositorioInput): Promise<void> {
  setBtnCarregando(btnSalvar, true);
  esconderErroForm();
  try {
    const novo = await api.repositorios.criar(dados);
    repositorios.unshift(novo);
    renderizarRepositorios();
    fecharModal();
    mostrarToast(`Repositório "${novo.full_name}" cadastrado com sucesso!`);
  } catch (err) {
    const msg = err instanceof ErroApiHTTP
      ? (err.status === 409 ? 'Este repositório já está cadastrado.' : err.message)
      : 'Erro ao cadastrar repositório.';
    mostrarErroForm(msg);
  } finally {
    setBtnCarregando(btnSalvar, false);
  }
}

async function confirmarExclusao(repo: Repositorio): Promise<void> {
  const confirmado = window.confirm(
    `Remover "${repo.full_name}"? Esta ação não pode ser desfeita.`,
  );
  if (!confirmado) return;

  try {
    await api.repositorios.deletar(repo.id);
    repositorios = repositorios.filter(r => r.id !== repo.id);
    renderizarRepositorios();
    mostrarToast('Repositório removido.', 'aviso');
  } catch (err) {
    const msg = err instanceof ErroApiHTTP ? err.message : 'Erro ao remover repositório.';
    mostrarToast(msg, 'erro');
  }
}

// ── Repositórios Remotos do GitHub ───────────────────────────────────

async function carregarRepositoriosRemotos(): Promise<void> {
  if (!wrapperSelectGithub || !selectGithubRepo) return;

  try {
    const list = await api.repositorios.listarDoGitHub();

    if (list && list.length > 0) {
      selectGithubRepo.innerHTML = `
        <option value="">-- Selecione um repositório seu --</option>
        ${list.map(r => `
          <option value="${r.full_name}" data-branch="${r.default_branch}" data-description="${r.description || ''}">
            ${r.full_name} (${r.private ? 'Privado' : 'Público'})
          </option>
        `).join('')}
      `;
      wrapperSelectGithub.classList.remove('hidden');
    }
  } catch (err) {
    console.warn('Não foi possível listar repositórios remotos do GitHub:', err);
  }
}

// ── Inicialização ──────────────────────────────────────────────────

async function iniciar(): Promise<void> {
  const usuario = await exigirAutenticacao();
  atualizarNavbarUsuario(usuario);

  const subtitulo = document.getElementById('subtitulo-usuario');
  if (subtitulo) {
    subtitulo.textContent = `Bem-vindo, ${usuario.nome_usuario}! Aqui estão seus repositórios.`;
  }

  // Carrega repositórios do GitHub do usuário em segundo plano
  carregarRepositoriosRemotos();

  document.getElementById('btn-logout')?.addEventListener('click', fazerLogout);
  document.getElementById('btn-adicionar')?.addEventListener('click', abrirModal);
  document.getElementById('btn-cancelar-modal')?.addEventListener('click', fecharModal);

  // Link do GitHub parseador automático
  inputLinkGithub?.addEventListener('input', () => {
    const url = inputLinkGithub.value.trim();
    if (!url) return;

    const parsed = extrairGithubUrl(url);
    if (parsed) {
      inputOwner.value = parsed.owner;
      inputRepo.value = parsed.repo;
      esconderErroForm();
      if (selectGithubRepo) selectGithubRepo.value = '';
    }
  });

  // Evento ao mudar seleção do repositório do GitHub
  selectGithubRepo?.addEventListener('change', () => {
    const escolhido = selectGithubRepo.value;
    if (!escolhido) return;

    const [owner, repoName] = escolhido.split('/');
    if (owner && repoName) {
      inputOwner.value = owner;
      inputRepo.value = repoName;

      const option = selectGithubRepo.options[selectGithubRepo.selectedIndex];
      const desc = option.getAttribute('data-description') || '';
      inputDescricao.value = desc;

      if (inputLinkGithub) inputLinkGithub.value = '';
      esconderErroForm();
    }
  });

  // Fechar modal ao clicar fora
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) fecharModal();
  });

  // Submit do formulário
  formRepo.addEventListener('submit', async (e) => {
    e.preventDefault();

    const owner = inputOwner.value.trim();
    const repo = inputRepo.value.trim();

    if (!owner || !repo) {
      mostrarErroForm('Owner e nome do repositório são obrigatórios.');
      return;
    }

    await criarRepositorio({
      nome_proprietario: owner,
      nome_repositorio: repo,
      description: inputDescricao.value.trim() || null,
    });
  });

  await carregarRepositorios();
}

iniciar();
