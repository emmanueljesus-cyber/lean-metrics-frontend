/**
 * charts/lead-time.ts — Lead Time por Tipo de Item.
 * Tipo: Column com cores distribuídas por categoria.
 */

import ApexCharts from 'apexcharts';
import { TEMA_BASE, CORES, COR_TEXTO, isLight } from '../tema';
import type { DadosLeadTime } from '../dados';

export function renderLeadTime(elementId: string, dados: DadosLeadTime): ApexCharts {
  const el = document.getElementById(elementId);
  if (!el) throw new Error(`[lead-time] Elemento #${elementId} não encontrado.`);

  const chart = new ApexCharts(el, {
    ...TEMA_BASE,
    chart: {
      ...TEMA_BASE.chart,
      type:   'bar',
      height: 280,
    },
    series: [
      { name: 'Lead Time (h)', data: dados.horas },
    ],
    xaxis: {
      categories: dados.tipos,
      labels: { style: { colors: COR_TEXTO, fontSize: '12px' } },
    },
    yaxis: {
      title: {
        text:  'Horas',
        style: { color: COR_TEXTO, fontWeight: '500' },
      },
      labels: { style: { colors: COR_TEXTO, fontSize: '12px' } },
    },
    plotOptions: {
      bar: {
        borderRadius: 6,
        columnWidth:  '52%',
        distributed:  true,
      },
    },
    colors: CORES,
    dataLabels: {
      enabled:   true,
      formatter: (val: string | number) => `${val}h`,
      style: {
        fontSize:   '11px',
        fontWeight: '700',
        colors:     [isLight ? '#ffffff' : '#070d1a'],
      },
    },
    legend: { show: false },
    tooltip: {
      ...TEMA_BASE.tooltip,
      y: { formatter: (val: number) => `${val} horas` },
    },
  });

  chart.render();
  return chart;
}
