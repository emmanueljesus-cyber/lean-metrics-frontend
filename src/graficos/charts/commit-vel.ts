/**
 * charts/commit-vel.ts — Velocidade de Commits (Radial/Gauge).
 * Dado real: commit_velocity_daily.
 */

import ApexCharts from 'apexcharts';
import { TEMA_BASE, COR_TEXTO, COR_TEXTO_FORTE, isLight } from '../tema';
import type { DadosRadialSimples } from '../dados';

export function renderCommitVel(elementId: string, dados: DadosRadialSimples): ApexCharts {
  const el = document.getElementById(elementId);
  if (!el) throw new Error(`[commit-vel] #${elementId} não encontrado.`);

  const cor = dados.valor >= 70 ? '#00c896' : dados.valor >= 40 ? '#ffb84d' : '#ff4d6d';

  const chart = new ApexCharts(el, {
    ...TEMA_BASE,
    chart: { ...TEMA_BASE.chart, type: 'radialBar', height: 200 },
    series: [dados.valor],
    plotOptions: {
      radialBar: {
        startAngle: -135,
        endAngle:    135,
        hollow:  { size: '58%' },
        track:   { background: isLight ? 'rgba(15, 23, 42, 0.06)' : 'rgba(255,255,255,0.05)', strokeWidth: '90%' },
        dataLabels: {
          show: true,
          name: {
            show: true, offsetY: -6,
            color: COR_TEXTO, fontSize: '11px', fontWeight: '500',
          },
          value: {
            show: true, offsetY: 6,
            color: COR_TEXTO_FORTE, fontSize: '24px', fontWeight: '800',
            formatter: () => dados.label,
          },
        },
      },
    },
    colors: [cor],
    labels: ['Velocidade'],
  });

  chart.render();
  return chart;
}
