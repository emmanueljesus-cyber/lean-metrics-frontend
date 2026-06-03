/**
 * charts/horas.ts — Horas Mensais Registradas (Stacked Column).
 * Tipo: Barras empilhadas por mês.
 */

import ApexCharts from 'apexcharts';
import { TEMA_BASE, COR_TEXTO, CORES } from '../tema';
import type { DadosHorasMensais } from '../dados';

export function renderHoras(elementId: string, dados: DadosHorasMensais): ApexCharts {
  const el = document.getElementById(elementId);
  if (!el) throw new Error(`[horas] Elemento #${elementId} não encontrado.`);

  const chart = new ApexCharts(el, {
    ...TEMA_BASE,
    chart: {
      ...TEMA_BASE.chart,
      type:    'bar',
      height:  320,
      stacked: true,
    },
    series: [
      { name: 'Horas Diretas', data: dados.serie_a },
      { name: 'Horas Suporte', data: dados.serie_b },
    ],
    xaxis: {
      categories: dados.meses,
      labels: { style: { colors: COR_TEXTO, fontSize: '12px' } },
    },
    yaxis: {
      title: {
        text:  'Nº de Horas',
        style: { color: COR_TEXTO, fontWeight: '500' },
      },
      labels: { style: { colors: COR_TEXTO, fontSize: '12px' } },
    },
    plotOptions: {
      bar: {
        borderRadius:            5,
        columnWidth:             '55%',
        borderRadiusWhenStacked: 'last',
      },
    },
    colors:     [CORES[0], CORES[1]],
    dataLabels: { enabled: false },
    fill:       { opacity: 1 },
    legend: {
      show:            true,
      position:        'top',
      horizontalAlign: 'right',
      labels:          { colors: COR_TEXTO },
      markers:         { size: 8 },
    },
    tooltip: {
      ...TEMA_BASE.tooltip,
      y: { formatter: (val: number) => `${val}h` },
    },
  });

  chart.render();
  return chart;
}
