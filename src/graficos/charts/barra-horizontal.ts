/**
 * charts/barra-horizontal.ts — Gráfico de barras horizontais genérico.
 *
 * Usado para: Qualidade, Throughput/Fluxo, Contribuidores.
 * SRP: renderiza qualquer DadosBarraH com nome e elemento configuráveis.
 */

import ApexCharts from 'apexcharts';
import { TEMA_BASE, CORES, COR_TEXTO, isLight } from '../tema';
import type { DadosBarraH } from '../dados';

export function renderBarraH(
  elementId: string,
  dados:     DadosBarraH,
  titulo:    string,
  altura:    number = 260,
): ApexCharts {
  const el = document.getElementById(elementId);
  if (!el) throw new Error(`[barra-h] #${elementId} não encontrado.`);

  const chart = new ApexCharts(el, {
    ...TEMA_BASE,
    chart: { ...TEMA_BASE.chart, type: 'bar', height: altura },
    series: [{ name: titulo, data: dados.valores }],
    xaxis: {
      categories: dados.categorias,
      labels: { style: { colors: COR_TEXTO, fontSize: '11px' } },
    },
    yaxis: {
      labels: { style: { colors: COR_TEXTO, fontSize: '11px' } },
    },
    plotOptions: {
      bar: { horizontal: true, borderRadius: 6, distributed: true },
    },
    dataLabels: {
      enabled: true,
      formatter: (val: string | number, opt?: any) => {
        if (opt && opt.dataPointIndex !== undefined) {
          const cat = opt.w.config.xaxis.categories[opt.dataPointIndex];
          if (cat) {
            if (cat.includes('(%)')) {
              return `${val}%`;
            }
            if (cat.includes('churn') || cat.includes('Churn')) {
              return `${val} lin`;
            }
          }
        }
        return String(val);
      },
      style: { fontSize: '11px', fontWeight: '700', colors: [isLight ? '#ffffff' : '#070d1a'] },
    },
    colors: CORES,
    legend: { show: false },
    tooltip: {
      ...TEMA_BASE.tooltip,
      y: {
        formatter: (val: number, opt?: any) => {
          if (opt && opt.dataPointIndex !== undefined) {
            const cat = opt.w.config.xaxis.categories[opt.dataPointIndex];
            if (cat) {
              if (cat.includes('(%)')) {
                return `${val}%`;
              }
              if (cat.includes('churn') || cat.includes('Churn')) {
                return `${val} linhas/semana`;
              }
              if (cat.includes('commits/dia') || cat.includes('Commits/dia')) {
                return `${val} commits/dia`;
              }
            }
          }
          return String(val);
        }
      }
    },
  });

  chart.render();
  return chart;
}
