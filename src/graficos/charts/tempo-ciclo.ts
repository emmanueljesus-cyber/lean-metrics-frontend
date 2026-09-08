/**
 * charts/tempo-ciclo.ts — Lead Time, Cycle Time e Waiting Time.
 * Tipo: Colunas com cores distribuídas + valor real em horas.
 */

import ApexCharts from 'apexcharts';
import { TEMA_BASE, CORES, COR_TEXTO, COR_TEXTO_FORTE } from '../tema';
import type { DadosColuna } from '../dados';

export function renderTempoCiclo(elementId: string, dados: DadosColuna): ApexCharts {
  const el = document.getElementById(elementId);
  if (!el) throw new Error(`[tempo-ciclo] #${elementId} não encontrado.`);

  const chart = new ApexCharts(el, {
    ...TEMA_BASE,
    chart: { ...TEMA_BASE.chart, type: 'bar', height: 280 },
    series: [{ name: `Lead/Cycle/Wait (${dados.unidade})`, data: dados.valores }],
    xaxis: {
      categories: dados.categorias,
      labels: { style: { colors: COR_TEXTO, fontSize: '12px' } },
    },
    yaxis: {
      title: { text: dados.unidade, style: { color: COR_TEXTO, fontWeight: '500' } },
      labels: { style: { colors: COR_TEXTO, fontSize: '12px' } },
    },
    plotOptions: { bar: { borderRadius: 6, columnWidth: '52%', distributed: true } },
    colors: CORES,
    dataLabels: {
      enabled: true,
      formatter: (val: string | number) => `${val}h`,
      style: { fontSize: '11px', fontWeight: '700', colors: [COR_TEXTO_FORTE] },
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
