/**
 * exportar.ts — Funções de exportação do dashboard.
 * SRP: responsabilidade única de serializar e baixar dados.
 * ISP: cada função é independente — use apenas o que precisar.
 */

import type { DadosDashboard } from './dados';

function mostrarToast(msg: string, tipo: 'ok' | 'err' = 'ok'): void {
  const area = document.getElementById('area-toast');
  if (!area) return;
  const el = document.createElement('div');
  el.className = `toast toast-${tipo}`;
  el.textContent = msg;
  area.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ── CSV ────────────────────────────────────────────────────────────

export function exportarCSV(dados: DadosDashboard): void {
  const L: string[] = [];

  L.push(`Repositório;${dados.repositorio}`);
  L.push(`Gerado em;${dados.gerado_em}`);
  L.push('');

  L.push('=== KPIs ===');
  L.push('Indicador;Valor;Significado');
  dados.kpis.forEach(k => L.push(`${k.label};${k.valor};${k.sub}`));
  L.push('');

  L.push('=== Tempo de Ciclo (horas) ===');
  L.push('Métrica;Valor');
  dados.tempo_ciclo.categorias.forEach((c, i) =>
    L.push(`${c};${dados.tempo_ciclo.valores[i]}`),
  );
  L.push('');

  L.push('=== WIP (Work In Progress) ===');
  L.push('Categoria;Quantidade');
  dados.wip.labels.forEach((lb, i) => L.push(`${lb};${dados.wip.valores[i]}`));
  L.push('');

  L.push('=== Qualidade ===');
  L.push('Indicador;Valor');
  dados.qualidade.categorias.forEach((c, i) =>
    L.push(`${c};${dados.qualidade.valores[i]}`),
  );
  L.push('');

  L.push('=== Throughput / Fluxo ===');
  L.push('Indicador;Valor');
  dados.throughput.categorias.forEach((c, i) =>
    L.push(`${c};${dados.throughput.valores[i]}`),
  );
  L.push('');

  L.push('=== Contribuidores ===');
  L.push('Indicador;Valor');
  dados.contribuidores.categorias.forEach((c, i) =>
    L.push(`${c};${dados.contribuidores.valores[i]}`),
  );
  L.push('');

  L.push('=== Métricas Brutas (API) ===');
  L.push('Nome;Valor;Unidade;Descrição');
  dados.metricas_raw.forEach(m =>
    L.push(`${m.name};${m.value ?? ''};${m.unit ?? ''};${m.description ?? ''}`),
  );

  const csv  = '\uFEFF' + L.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  baixarBlob(blob, `lean-metrics-${dados.repositorio.replace('/', '-')}.csv`);
  mostrarToast('CSV exportado com sucesso!');
}

// ── JSON ───────────────────────────────────────────────────────────

export function exportarJSON(dados: DadosDashboard): void {
  const blob = new Blob([JSON.stringify(dados, null, 2)], {
    type: 'application/json',
  });
  baixarBlob(blob, `lean-metrics-${dados.repositorio.replace('/', '-')}.json`);
  mostrarToast('JSON exportado com sucesso!');
}

// ── PNG ────────────────────────────────────────────────────────────

export async function exportarPNG(elementId: string): Promise<void> {
  mostrarToast('Gerando imagem, aguarde...');
  try {
    const { default: html2canvas } = await import('html2canvas');
    const el = document.getElementById(elementId);
    if (!el) throw new Error(`Elemento #${elementId} não encontrado.`);

    const canvas = await html2canvas(el, {
      backgroundColor: '#070d1a',
      scale:           1.5,
      useCORS:         true,
      logging:         false,
      windowWidth:     el.scrollWidth,
      windowHeight:    el.scrollHeight,
    });

    const url = canvas.toDataURL('image/png');
    const a   = document.createElement('a');
    a.href     = url;
    a.download = 'lean-metrics-dashboard.png';
    a.click();
    mostrarToast('PNG exportado com sucesso!');
  } catch (e) {
    mostrarToast(`Falha ao exportar PNG: ${e instanceof Error ? e.message : e}`, 'err');
  }
}

// ── Utilitário ─────────────────────────────────────────────────────

function baixarBlob(blob: Blob, nome: string): void {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}
