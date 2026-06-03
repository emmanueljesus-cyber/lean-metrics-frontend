/**
 * tema.ts — Configuração base do ApexCharts v5 integrada ao design system.
 *
 * Princípio OCP: novos gráficos estendem este tema sem modificá-lo.
 * Princípio DIP: os módulos de gráficos dependem desta abstração,
 *                não de valores hardcoded de cor/fonte.
 */

import type ApexCharts from 'apexcharts';

export const isLight = document.documentElement.classList.contains('light');

// ── Tokens de cores do tema ────────────────────────────────────────
export const COR_TEXTO = isLight ? '#475569' : '#8b9ab3'; // Slate-600 vs Slate-400
export const COR_TEXTO_FORTE = isLight ? '#0f172a' : '#e8edf5'; // Slate-900 vs Slate-100
export const COR_BORDA_GRID = isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.06)';

export const CORES: string[] = [
  '#00c896', // verde-acento
  isLight ? '#0284c7' : '#4dcfff', // azul
  '#8b5cf6', // violeta
  isLight ? '#ea580c' : '#ffb84d', // laranja
  isLight ? '#e11d48' : '#ff4d6d', // vermelho
  '#10b981', // esmeralda
];

// ── Opções base compartilhadas por todos os gráficos ──────────────
export const TEMA_BASE: ApexCharts.ApexOptions = {
  theme: { mode: isLight ? 'light' : 'dark' },

  chart: {
    background: 'transparent',
    foreColor:  COR_TEXTO,
    fontFamily: "'Inter', system-ui, sans-serif",
    toolbar: {
      show: true,
      tools: {
        download:  true,
        selection: false,
        zoom:      false,
        zoomin:    false,
        zoomout:   false,
        pan:       false,
        reset:     false,
      },
      export: {
        csv: {
          filename:        'lean-metrics-dados',
          columnDelimiter: ';',
          headerCategory:  'Categoria',
        },
        svg: { filename: 'lean-metrics-grafico' },
        png: { filename: 'lean-metrics-grafico' },
      },
    },
    animations: {
      enabled: true,
      speed:   700,
      animateGradually: { enabled: true, delay: 80 },
    },
  },

  grid: {
    borderColor:     COR_BORDA_GRID,
    strokeDashArray: 4,
  },

  tooltip: {
    theme: isLight ? 'light' : 'dark',
    style: { fontFamily: "'Inter', system-ui, sans-serif" },
  },
};
