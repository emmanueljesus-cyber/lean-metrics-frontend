/**
 * charts/linha-historica.ts — Gráficos temporais de evolução histórica.
 */

import ApexCharts from 'apexcharts';
import { TEMA_BASE, CORES, COR_TEXTO, COR_TEXTO_FORTE } from '../tema';

export function renderLinhaHistorica(
  elementId: string,
  datas: string[],
  series: { name: string; data: number[] }[],
  unidade: string,
  titulo?: string
): ApexCharts {
  const el = document.getElementById(elementId);
  if (!el) throw new Error(`[linha-historica] Elemento #${elementId} não encontrado.`);

  const chart = new ApexCharts(el, {
    ...TEMA_BASE,
    chart: {
      ...TEMA_BASE.chart,
      type: 'line',
      height: 280,
      zoom: { enabled: true }
    },
    ...(titulo ? { title: { text: titulo, align: 'left', style: { fontSize: '14px', fontWeight: '600', color: COR_TEXTO_FORTE } } } : {}),
    stroke: {
      curve: 'smooth',
      width: 3
    },
    series: series,
    colors: CORES,
    xaxis: {
      categories: datas,
      labels: {
        style: { colors: COR_TEXTO, fontSize: '11px' },
        rotate: -30,
        rotateAlways: false
      }
    },
    yaxis: {
      title: {
        text: unidade,
        style: { color: COR_TEXTO, fontWeight: '500' }
      },
      labels: {
        style: { colors: COR_TEXTO, fontSize: '11px' },
        formatter: (val: number) => val % 1 === 0 ? String(val) : val.toFixed(1)
      }
    },
    tooltip: {
      ...TEMA_BASE.tooltip,
      x: { show: true },
      y: {
        formatter: (val: number) => `${val % 1 === 0 ? val : val.toFixed(1)} ${unidade}`
      }
    },
    legend: {
      show: true,
      position: 'top',
      horizontalAlign: 'right',
      labels: { colors: COR_TEXTO }
    }
  });

  chart.render();
  return chart;
}

export function renderDesperdiciosAcumulados(
  elementId: string,
  datas: string[],
  series: { name: string; data: number[] }[],
  titulo?: string
): ApexCharts {
  const el = document.getElementById(elementId);
  if (!el) throw new Error(`[desperdicios-acumulados] Elemento #${elementId} não encontrado.`);

  const chart = new ApexCharts(el, {
    ...TEMA_BASE,
    chart: {
      ...TEMA_BASE.chart,
      type: 'bar',
      height: 280,
      stacked: true,
      toolbar: { show: true }
    },
    ...(titulo ? { title: { text: titulo, align: 'left', style: { fontSize: '14px', fontWeight: '600', color: COR_TEXTO_FORTE } } } : {}),
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '50%',
        borderRadius: 4
      }
    },
    series: series,
    colors: CORES,
    xaxis: {
      categories: datas,
      labels: {
        style: { colors: COR_TEXTO, fontSize: '11px' },
        rotate: -30
      }
    },
    yaxis: {
      title: {
        text: 'Sinais de Desperdício',
        style: { color: COR_TEXTO, fontWeight: '500' }
      },
      labels: {
        style: { colors: COR_TEXTO, fontSize: '11px' }
      }
    },
    tooltip: {
      ...TEMA_BASE.tooltip,
      y: {
        formatter: (val: number) => `${val} sinal(s)`
      }
    },
    legend: {
      show: true,
      position: 'top',
      horizontalAlign: 'right',
      labels: { colors: COR_TEXTO }
    }
  });

  chart.render();
  return chart;
}
