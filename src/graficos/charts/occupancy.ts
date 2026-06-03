/**
 * charts/occupancy.ts — Gauge de Taxa de Ocupação.
 * Tipo: Radial Bar (semicírculo) com indicação de meta.
 */

import ApexCharts from 'apexcharts';
import { TEMA_BASE, COR_TEXTO, COR_TEXTO_FORTE, isLight } from '../tema';
import type { DadosOccupancy } from '../dados';

export function renderOccupancy(elementId: string, dados: DadosOccupancy): ApexCharts {
  const el = document.getElementById(elementId);
  if (!el) throw new Error(`[occupancy] Elemento #${elementId} não encontrado.`);

  const dentroMeta =
    dados.atual >= dados.meta_min && dados.atual <= dados.meta_max;

  const chart = new ApexCharts(el, {
    ...TEMA_BASE,
    chart: {
      ...TEMA_BASE.chart,
      type:   'radialBar',
      height: 180,
    },
    series: [dados.atual],
    plotOptions: {
      radialBar: {
        startAngle: -135,
        endAngle:    135,
        hollow:  { size: '58%' },
        track:   {
          background:  isLight ? 'rgba(15, 23, 42, 0.06)' : 'rgba(255,255,255,0.05)',
          strokeWidth: '90%',
        },
        dataLabels: {
          show: true,
          name: {
            show:       true,
            offsetY:   -6,
            color:      COR_TEXTO,
            fontSize:   '11px',
            fontWeight: '500',
          },
          value: {
            show:       true,
            offsetY:    6,
            color:      COR_TEXTO_FORTE,
            fontSize:   '28px',
            fontWeight: '800',
            formatter:  () => `${dados.atual}%`,
          },
        },
      },
    },
    colors: [dentroMeta ? '#00c896' : '#ffb84d'],
    labels: ['Ocupação'],
  });

  chart.render();
  return chart;
}
