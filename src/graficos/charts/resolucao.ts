/**
 * charts/resolucao.ts — Taxa Média de Resolução no Primeiro Contato.
 * Tipo: Barras horizontais com cores distribuídas.
 */

import ApexCharts from 'apexcharts';
import { TEMA_BASE, CORES, COR_TEXTO, isLight } from '../tema';
import type { DadosResolucao } from '../dados';

export function renderResolucao(elementId: string, dados: DadosResolucao): ApexCharts {
  const el = document.getElementById(elementId);
  if (!el) throw new Error(`[resolucao] Elemento #${elementId} não encontrado.`);

  const chart = new ApexCharts(el, {
    ...TEMA_BASE,
    chart: {
      ...TEMA_BASE.chart,
      type:   'bar',
      height: 260,
    },
    series: [
      { name: 'Taxa de Resolução (%)', data: dados.valores },
    ],
    xaxis: {
      categories: dados.categorias,
      max: 100,
      labels: { style: { colors: COR_TEXTO, fontSize: '12px' } },
    },
    yaxis: {
      labels: { style: { colors: COR_TEXTO, fontSize: '12px' } },
    },
    plotOptions: {
      bar: {
        horizontal:  true,
        borderRadius: 6,
        distributed: true,
      },
    },
    dataLabels: {
      enabled:   true,
      formatter: (val: string | number) => `${val}%`,
      style: {
        fontSize:  '12px',
        fontWeight: '700',
        colors:    [isLight ? '#ffffff' : '#070d1a'],
      },
    },
    colors: CORES,
    legend: { show: false },
    tooltip: {
      ...TEMA_BASE.tooltip,
      y: { formatter: (val: number) => `${val}%` },
    },
  });

  chart.render();
  return chart;
}
