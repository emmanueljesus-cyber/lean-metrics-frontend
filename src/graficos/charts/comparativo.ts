/**
 * charts/comparativo.ts — Comparação entre valor Atual e Meta (Target).
 * Renderiza um gráfico de barras horizontal comparando Atual vs Meta.
 */

import ApexCharts from 'apexcharts';
import { TEMA_BASE, isLight } from '../tema';

export function renderComparativo(
  elementId: string,
  label: string,
  atual: number,
  meta: number,
  unidade: string,
  menorMelhor: boolean
): ApexCharts {
  const el = document.getElementById(elementId);
  if (!el) throw new Error(`[comparativo] Elemento #${elementId} não encontrado.`);

  // Determina se a meta foi atingida
  const atingiuMeta = menorMelhor ? atual <= meta : atual >= meta;
  const corAtual = atingiuMeta ? '#00c896' : '#ff4d6d'; // Verde se atingiu, vermelho se falhou
  const corMeta = isLight ? '#64748b' : '#475569'; // Cinza neutro

  const chart = new ApexCharts(el, {
    ...TEMA_BASE,
    chart: {
      ...TEMA_BASE.chart,
      type: 'bar',
      height: 140,
      sparkline: { enabled: true } // Compacto, sem poluir a interface
    },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: '60%',
        distributed: true,
        borderRadius: 4,
        dataLabels: {
          position: 'top'
        }
      }
    },
    colors: [corAtual, corMeta],
    series: [{
      name: label,
      data: [
        { x: 'Atual', y: atual },
        { x: 'Meta', y: meta }
      ]
    }],
    xaxis: {
      categories: ['Atual', 'Meta']
    },
    dataLabels: {
      enabled: true,
      textAnchor: 'start',
      style: {
        colors: ['#fff', '#fff'],
        fontWeight: 'bold',
        fontSize: '12px'
      },
      formatter: (val: number) => `${val} ${unidade}`,
      offsetX: 0
    },
    tooltip: {
      ...TEMA_BASE.tooltip,
      y: {
        formatter: (val: number) => `${val} ${unidade}`
      }
    }
  });

  chart.render();
  return chart;
}
