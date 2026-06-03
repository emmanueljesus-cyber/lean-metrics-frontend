/**
 * charts/wip.ts — WIP Donut (PRs Abertas vs Issues Abertas).
 * Dados reais: wip_open_pull_requests + wip_open_issues.
 */

import ApexCharts from 'apexcharts';
import { TEMA_BASE, CORES, COR_TEXTO, COR_TEXTO_FORTE } from '../tema';
import type { DadosDonut } from '../dados';

export function renderWIP(elementId: string, dados: DadosDonut): ApexCharts {
  const el = document.getElementById(elementId);
  if (!el) throw new Error(`[wip] #${elementId} não encontrado.`);

  const total = dados.valores.reduce((a, b) => a + b, 0);

  const chart = new ApexCharts(el, {
    ...TEMA_BASE,
    chart: { ...TEMA_BASE.chart, type: 'donut', height: 280 },
    series: dados.valores,
    labels: dados.labels,
    colors: CORES,
    plotOptions: {
      pie: {
        donut: {
          size: '62%',
          labels: {
            show: true,
            total: {
              show: true, label: 'Total WIP',
              color: COR_TEXTO, fontSize: '13px', fontWeight: '600',
              formatter: () => String(total),
            },
            value: { color: COR_TEXTO_FORTE, fontSize: '24px', fontWeight: '800' },
          },
        },
      },
    },
    dataLabels: { enabled: false },
    stroke:     { width: 0 },
    legend: {
      position: 'bottom', fontSize: '11px',
      labels:   { colors: COR_TEXTO },
      markers:  { size: 7 },
      itemMargin: { horizontal: 8, vertical: 4 },
    },
    tooltip: {
      ...TEMA_BASE.tooltip,
      y: { formatter: (val: number) => `${val} itens em aberto` },
    },
  });

  chart.render();
  return chart;
}
