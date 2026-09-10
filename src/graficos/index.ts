/**
 * graficos/index.ts — Orquestrador do Dashboard de Gráficos.
 *
 * Redireciona para /relatorio.html ou /relatorio-rapido.html
 * ou exibe o formulário de busca se não houver parâmetros.
 */

import { inicializarIcones } from '../utilitarios';
import { iniciarInterface } from '../autenticacao';

void iniciarInterface();

// ── Helpers UI ────────────────────────────────────────────────────

function setCarregando(visivel: boolean): void {
  const el = document.getElementById('estado-carregando');
  const dash = document.getElementById('dashboard-export');
  if (el)   el.style.display  = visivel ? 'flex' : 'none';
  if (dash) dash.style.display = visivel ? 'none'  : '';
}

// ── Inicialização principal ───────────────────────────────────────

async function inicializar(): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  const idStr = params.get('id');
  const proprietario = params.get('proprietario');
  const repositorio  = params.get('repositorio');
  const token = params.get('token');

  // Redireciona imediatamente para a respectiva página de relatório com a aba de gráficos ativa
  if (idStr) {
    let dest = `/relatorio.html?id=${encodeURIComponent(idStr)}&tab=graficos`;
    if (token) dest += `&token=${encodeURIComponent(token)}`;
    window.location.replace(dest);
    return;
  }

  if (proprietario && repositorio) {
    let dest = `/relatorio-rapido.html?proprietario=${encodeURIComponent(proprietario)}&repositorio=${encodeURIComponent(repositorio)}&tab=graficos`;
    if (token) dest += `&token=${encodeURIComponent(token)}`;
    window.location.replace(dest);
    return;
  }

  // Se não veio parâmetros, exibe o formulário de busca
  setCarregando(false);
  const buscaEl = document.getElementById('estado-busca');
  if (buscaEl) buscaEl.style.display = 'flex';
  const dash = document.getElementById('dashboard-export');
  if (dash) dash.style.display = 'none';

  inicializarIcones();

  const form = document.getElementById('form-busca') as HTMLFormElement | null;
  form?.addEventListener('submit', e => {
    e.preventDefault();
    const o = (document.getElementById('input-owner') as HTMLInputElement)?.value.trim();
    const r = (document.getElementById('input-repo')  as HTMLInputElement)?.value.trim();
    if (o && r) {
      window.location.href = `/graficos.html?proprietario=${encodeURIComponent(o)}&repositorio=${encodeURIComponent(r)}`;
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializar);
} else {
  inicializar();
}
