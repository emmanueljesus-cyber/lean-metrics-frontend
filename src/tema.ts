/**
 * theme.ts — Lógica de alternância entre Light e Dark Mode
 * O Dark Mode é o tema padrão.
 */

import { inicializarIcones } from './utilitarios';

export function inicializarTema(): void {
  const temaSalvo = localStorage.getItem('theme') || 'dark';
  document.documentElement.classList.toggle('light', temaSalvo === 'light');

  // Aguarda o DOM estar pronto para injetar o botão na navbar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injetarBotaoTema);
  } else {
    injetarBotaoTema();
  }
}

function injetarBotaoTema(): void {
  const container = document.querySelector('.flex.items-center.gap-3');
  if (!container || document.getElementById('btn-theme-toggle')) return;

  const btn = document.createElement('button');
  btn.id = 'btn-theme-toggle';
  btn.className = 'w-8 h-8 rounded-lg flex items-center justify-center border cursor-pointer transition-all duration-200 hover:-translate-y-px';
  btn.style.cssText = `
    background: var(--color-fundo-card);
    border: 1px solid var(--color-borda);
    color: var(--color-texto-suave);
    font-size: 1rem;
    padding: 0;
    flex-shrink: 0;
  `;
  btn.title = 'Alternar tema';

  // Hover styles
  btn.addEventListener('mouseover', () => {
    btn.style.borderColor = 'var(--color-borda-hover)';
    btn.style.color = 'var(--color-texto)';
  });
  btn.addEventListener('mouseout', () => {
    btn.style.borderColor = 'var(--color-borda)';
    btn.style.color = 'var(--color-texto-suave)';
  });

  const atualizarIcone = () => {
    const isLight = document.documentElement.classList.contains('light');
    btn.innerHTML = isLight 
      ? '<i data-lucide="moon" class="w-4 h-4"></i>' 
      : '<i data-lucide="sun" class="w-4 h-4"></i>';
    inicializarIcones();
  };

  atualizarIcone();

  btn.addEventListener('click', () => {
    const isLight = document.documentElement.classList.toggle('light');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    atualizarIcone();
    
    // Se estiver na página de relatório, recarrega a página para atualizar os gráficos perfeitamente
    if (window.location.pathname.includes('relatorio.html')) {
      window.location.reload();
    } else {
      window.dispatchEvent(new Event('themechanged'));
    }
  });

  // Insere logo antes do nav-usuario (se existir) ou no início do container
  const navUsuario = document.getElementById('nav-usuario');
  if (navUsuario) {
    container.insertBefore(btn, navUsuario);
  } else {
    container.appendChild(btn);
  }
}

// Inicializa imediatamente na importação para evitar flicker na renderização
inicializarTema();
