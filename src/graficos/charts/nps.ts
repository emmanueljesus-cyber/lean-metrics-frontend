/**
 * charts/nps.ts — Net Promoter Score (Radial Bar multi-série).
 * Tipo: Radial Bar com 4 séries (NPS, Promotores, Passivos, Detratores).
 */

import ApexCharts from 'apexcharts';
import { TEMA_BASE, COR_TEXTO, COR_TEXTO_FORTE, CORES, isLight } from '../tema';
import type { DadosNPS } from '../dados';

export function renderNPS(elementId: string, dados: DadosNPS): ApexCharts {
  const el = document.getElementById(elementId);
  if (!el) throw new Error(`[nps] Elemento #${elementId} não encontrado.`);

  const chart = new ApexCharts(el, {
    ...TEMA_BASE,
    chart: {
      ...TEMA_BASE.chart,
      type:   'radialBar',
      height: 200,
    },
    series: [dados.total, dados.promotores, dados.passivos, dados.detratores],
    labels: ['NPS', 'Promotores', 'Passivos', 'Detratores'],
    colors: [CORES[0], CORES[1], CORES[3], CORES[4]],
    plotOptions: {
      radialBar: {
        hollow: { size: '30%' },
        track:  {
          background: isLight ? 'rgba(15, 23, 42, 0.06)' : 'rgba(255,255,255,0.04)',
          margin:     3,
        },
        dataLabels: {
          show: true,
          name: {
            fontSize:   '11px',
            color:      COR_TEXTO,
            fontWeight: '500',
          },
          value: {
            fontSize:   '14px',
            color:      COR_TEXTO_FORTE,
            fontWeight: '700',
            formatter:  (val: number) => `${val}%`,
          },
          total: {
            show:       true,
            label:      'NPS',
            color:      CORES[0],
            fontSize:   '13px',
            fontWeight: '700',
            formatter:  () => `${dados.total}%`,
          },
        },
      },
    },
    legend: {
      show:     true,
      position: 'bottom',
      fontSize: '11px',
      labels:   { colors: COR_TEXTO },
      markers:  { size: 7 },
      itemMargin: { horizontal: 8, vertical: 4 },
    },
  });

  chart.render();
  return chart;
}
