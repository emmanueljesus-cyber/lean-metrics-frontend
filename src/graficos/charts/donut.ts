/**
 * charts/donut.ts — Gráfico de Rosca (Donut) para distribuições.
 */

import ApexCharts from 'apexcharts';
import { TEMA_BASE, CORES, COR_TEXTO, isLight } from '../tema';

export function renderDonut(
  elementId: string,
  labels: string[],
  valores: number[],
  titulo?: string,
  customColors?: string[]
): ApexCharts {
  const el = document.getElementById(elementId);
  if (!el) throw new Error(`[donut] Elemento #${elementId} não encontrado.`);

  const chart = new ApexCharts(el, {
    ...TEMA_BASE,
    chart: {
      ...TEMA_BASE.chart,
      type: 'donut',
      height: 260,
    },
    ...(titulo ? {
      title: {
        text: titulo,
        align: 'center',
        style: {
          fontSize: '14px',
          fontWeight: '600',
          color: isLight ? '#0f172a' : '#e8edf5'
        }
      }
    } : {}),
    labels: labels,
    series: valores,
    colors: customColors || CORES,
    plotOptions: {
      pie: {
        donut: {
          size: '65%',
          labels: {
            show: true,
            name: {
              show: true,
              fontSize: '12px',
              color: COR_TEXTO
            },
            value: {
              show: true,
              fontSize: '16px',
              fontWeight: '700',
              color: isLight ? '#0f172a' : '#e8edf5',
              formatter: (val: string) => val
            },
            total: {
              show: true,
              label: 'Total',
              color: COR_TEXTO,
              formatter: (w: { globals: { seriesTotals: number[] } }) => {
                return String(w.globals.seriesTotals.reduce((a, b) => a + b, 0));
              }
            }
          }
        }
      }
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => `${val.toFixed(1)}%`,
      style: {
        fontSize: '11px',
        fontWeight: 'bold'
      }
    },
    legend: {
      show: true,
      position: 'bottom',
      fontSize: '12px',
      labels: {
        colors: COR_TEXTO
      }
    },
    tooltip: {
      ...TEMA_BASE.tooltip,
      y: {
        formatter: (val: number) => `${val}`
      }
    }
  });

  chart.render();
  return chart;
}
