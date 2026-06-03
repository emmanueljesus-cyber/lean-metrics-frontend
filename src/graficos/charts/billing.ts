/**
 * charts/billing.ts — Tabela de Status de Faturamento por Colaborador.
 *
 * Não é um gráfico ApexCharts — renderiza uma tabela HTML semântica.
 * SRP: responsabilidade única de montar e injetar a tabela no DOM.
 */

import type { LinhaBilling } from '../dados';

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun'] as const;

export function renderBilling(tbodyId: string, linhas: LinhaBilling[]): void {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;

  tbody.innerHTML = linhas
    .map(row => {
      const celulas = MESES
        .map(mes => {
          const val = row[mes];
          return `<td>${val !== null && val !== undefined ? val : '—'}</td>`;
        })
        .join('');

      return `
        <tr>
          <td>${row.nome}</td>
          ${celulas}
          <td class="td-total">${row.total}</td>
        </tr>
      `;
    })
    .join('');
}
