import { Chart } from "chart.js";
import { api } from "./api";
import type { RelatorioRepositorio } from "./tipos";
import { obterMetas, salvarMetas, calcularLeanScore, type MetasConfig } from "./relatorioCompartilhado";
import { escaparHtml as e, formatarData, numero, mensagemErro } from "./utilitarios";

let limpar: (() => void) | null = null;
export function destruirAnaliseAvancada(): void { limpar?.(); limpar = null; }

export function renderizarAnaliseAvancada(area: HTMLElement, relatorio: RelatorioRepositorio): void {
  destruirAnaliseAvancada();
  const secao = document.createElement("section");
  secao.className = "section";
  secao.innerHTML = '<div class="section-heading"><div><span class="eyebrow">Acompanhe seu processo</span><h2>Metas, distribuição e histórico</h2></div></div>' +
    '<div class="actions"><button class="button" data-abrir-analise>Explorar gráficos e metas</button><button class="button" data-exportar="json">Exportar JSON</button><button class="button" data-exportar="csv">Exportar CSV</button><button class="button" data-exportar="png">Exportar PNG</button></div>' +
    '<p class="small muted" role="status" data-status></p><div data-conteudo hidden></div>';
  area.append(secao);
  const conteudo = secao.querySelector<HTMLElement>("[data-conteudo]")!;
  const status = secao.querySelector<HTMLElement>("[data-status]")!;
  let aberto = false;
  let ativo = true;
  let historico: RelatorioRepositorio[] | null = null;
  let carregando = false;
  let metas = obterMetas(relatorio.full_name);
  const charts: Chart[] = [];
  const valor = (nome: string, rel = relatorio) => {
    const n = rel.metrics.find(m => m.name === nome)?.value;
    return typeof n === "number" && Number.isFinite(n) ? n : null;
  };
  function grafico(titulo: string, labels: string[], valores: (number | null)[], unidade: string, tipo: "bar" | "line" = "bar", datas?: string[]): void {
    const card = document.createElement("article");
    card.className = "card chart-card";
    card.innerHTML = "<h3>" + e(titulo) + '</h3><p class="muted chart-caption">' + e(unidade) + '</p>';
    const temDados = valores.some(v => v !== null);
    if (temDados) {
      const container = document.createElement("div"); container.className = "chart-container";
      const canvas = document.createElement("canvas"); canvas.setAttribute("role", "img"); canvas.setAttribute("aria-label", titulo);
      container.append(canvas); card.append(container);
      conteudo.append(card);
      const light = document.documentElement.classList.contains("light");
      const paleta = light
        ? ["#087b65", "#2563eb", "#7c3aed", "#d97706", "#dc2626"]
        : ["#43d9af", "#60a5fa", "#a78bfa", "#fbbf24", "#fb7185"];
      const coresBarras = labels.map((_, indice) => paleta[indice % paleta.length]);
      charts.push(new Chart(canvas, {
        type: tipo, data: { labels: datas ?? labels, datasets: [{
          label: titulo,
          data: valores,
          // Categorias e comparações recebem cores distintas; uma série
          // histórica mantém uma cor única para representar continuidade.
          backgroundColor: tipo === "line" ? paleta[0] + "33" : coresBarras,
          borderColor: tipo === "line" ? paleta[0] : coresBarras,
          borderWidth: tipo === "line" ? 2 : 0,
          tension: tipo === "line" ? 0.25 : 0,
          spanGaps: false,
        }] },
        options: { responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: light ? "#334155" : "#cbd5e1" } }, y: { beginAtZero: true, ticks: { color: light ? "#334155" : "#cbd5e1" } } } }
      }));
    }
    card.insertAdjacentHTML("beforeend", '<ul class="chart-values">' + labels.map((l, i) => "<li><span>" + e(l) + "</span><strong>" + (valores[i] === null ? "Sem dados" : numero.format(valores[i]!)) + "</strong></li>").join("") + "</ul>");
    if (!temDados) card.insertAdjacentHTML("beforeend", '<p class="muted">Sem dados suficientes para este gráfico.</p>');
    conteudo.append(card);
  }
  function desenhar(): void {
    if (!ativo || !aberto) return;
    charts.splice(0).forEach(c => c.destroy());
    conteudo.innerHTML = "";
    const form = document.createElement("form"); form.className = "card goals-form";
    const campos: [keyof MetasConfig, string][] = [["leadTime", "Meta de lead time (horas)"], ["reviewTime", "Meta de espera (horas)"], ["wip", "Meta de WIP (itens)"], ["defectRate", "Meta de defeitos (%)"]];
    form.innerHTML = '<h3>Metas deste repositório</h3><p class="muted">Limites desejados, salvos neste navegador. O score é uma comparação com suas metas, não uma avaliação absoluta do projeto.</p><div class="metric-grid">' +
      campos.map(([chave, label]) => '<label>' + label + '<input name="' + chave + '" type="number" min="0.01" step="any" required value="' + metas[chave] + '"></label>').join("") +
      '</div><button class="button primary" type="submit">Salvar metas</button><p role="status" data-score></p>';
    conteudo.append(form);
    const completos = ["lead_time_pr_hours", "waiting_time_pr_hours", "wip_open_pull_requests", "wip_open_issues", "defect_rate"].every(n => valor(n) !== null);
    form.querySelector("[data-score]")!.textContent = completos ? "Lean Score: " + calcularLeanScore(relatorio, metas).leanScore + "/100" : "Score indisponível: faltam métricas para comparar todas as metas.";
    form.addEventListener("submit", event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const nova = Object.fromEntries(campos.map(([k]) => [k, Number(new FormData(form).get(k))])) as unknown as MetasConfig;
      try { salvarMetas(relatorio.full_name, nova); metas = nova; status.textContent = "Metas salvas neste navegador."; desenhar(); }
      catch { status.textContent = "Não foi possível salvar as metas no navegador."; }
    });
    const wipPR = valor("wip_open_pull_requests"), wipIssue = valor("wip_open_issues");
    const comparacoes: [string, number | null, number, string][] = [
      ["Lead time", valor("lead_time_pr_hours"), metas.leadTime, "horas"],
      ["Espera estimada", valor("waiting_time_pr_hours"), metas.reviewTime, "horas"],
      ["WIP total", wipPR === null || wipIssue === null ? null : wipPR + wipIssue, metas.wip, "itens"],
      ["Issues com bug", valor("defect_rate") === null ? null : valor("defect_rate")! * 100, metas.defectRate, "%"],
    ];
    comparacoes.forEach(([titulo, v, meta, u]) => grafico(titulo + ": atual e meta", ["Atual", "Meta"], [v, meta], u));
    const dist = relatorio.metrics.find(m => m.name === "contributor_distribution")?.extra;
    const autores = Object.entries(dist ?? {}).filter((item): item is [string, number] => typeof item[1] === "number" && Number.isFinite(item[1]));
    grafico("Distribuição de commits por autor", autores.map(([n]) => n), autores.map(([, n]) => n * 100), "% da amostra");
    const total = valor("total_commits_sampled");
    grafico("Commits por autor na amostra", autores.map(([n]) => n), autores.map(([, n]) => total === null ? null : Math.round(n * total)), "commits");
    for (const [titulo, nomeTotal, abertos] of [["Distribuição de PRs", "total_prs_sampled", wipPR], ["Distribuição de issues", "total_issues_sampled", wipIssue]] as const) {
      const totalItens = valor(nomeTotal);
      grafico(titulo, ["Abertos", "Fechados"], [abertos, totalItens === null || abertos === null ? null : Math.max(0, totalItens - abertos)], "itens na amostra");
    }
    const sinais: Record<string, number> = {};
    relatorio.waste_signals.forEach(s => { sinais[s.category] = (sinais[s.category] ?? 0) + 1; });
    grafico("Distribuição de sinais de desperdício", Object.keys(sinais), Object.values(sinais), "sinais");
    grafico("Indicadores de qualidade", ["Issues com bug", "Commits corretivos", "Mensagens curtas", "PRs fechadas sem merge"],
      ["defect_rate", "rework_fix_commit_ratio", "chaotic_commit_ratio", "rejected_pr_ratio"].map(n => valor(n) === null ? null : valor(n)! * 100), "% da respectiva amostra");
    const bloco = document.createElement("article"); bloco.className = "card goals-form";
    bloco.innerHTML = '<h3>Histórico de relatórios</h3>';
    if (relatorio.repositorio_id === null) bloco.insertAdjacentHTML("beforeend", '<p class="muted">A análise pública não salva histórico. Entre com GitHub e cadastre o repositório para acompanhar sua evolução.</p>');
    else {
      bloco.insertAdjacentHTML("beforeend", '<button class="button" data-historico' + (carregando ? " disabled" : "") + '>Carregar histórico</button>');
      bloco.querySelector("button")!.addEventListener("click", async () => {
        if (carregando) return;
        carregando = true; desenhar();
        try { historico = (await api.relatorios.historico(relatorio.repositorio_id!, 100)).sort((a, b) => Date.parse(a.gerado_em) - Date.parse(b.gerado_em)); status.textContent = historico.length + " relatórios no histórico."; }
        catch (erro) { status.textContent = mensagemErro(erro); }
        finally { carregando = false; desenhar(); }
      });
    }
    conteudo.append(bloco);
    if (historico) {
      if (!historico.length) bloco.insertAdjacentHTML("beforeend", '<p>Nenhum relatório salvo.</p>');
      const datas = historico.map(r => formatarData(r.gerado_em));
      for (const [nome, label, unidade] of [["lead_time_pr_hours", "Evolução do lead time", "horas"], ["cycle_time_issue_hours", "Evolução do ciclo de issues", "horas"], ["waiting_time_pr_hours", "Evolução da espera estimada", "horas"], ["throughput_30d", "Evolução do throughput", "PRs / 30 dias"], ["wip_open_pull_requests", "Evolução das PRs abertas", "PRs"], ["wip_open_issues", "Evolução das issues abertas", "issues"]] as const)
        grafico(label, datas, historico.map(r => valor(nome, r)), unidade, "line", datas);
      grafico("Sinais por relatório", datas, historico.map(r => r.waste_signals.length), "sinais", "line", datas);
      grafico("Evolução do code churn", datas, historico.map(r => valor("code_churn_weekly_avg", r)), "linhas / semana", "line", datas);
      grafico("Evolução do retrabalho", datas, historico.map(r => {
        const v = valor("rework_fix_commit_ratio", r); return v === null ? null : v * 100;
      }), "% de commits corretivos", "line", datas);
      const categorias = new Set(historico.flatMap(r => r.waste_signals.map(s => s.category)));
      categorias.forEach(categoria => grafico("Histórico: " + categoria, datas, historico!.map(r => r.waste_signals.filter(s => s.category === categoria).length), "sinais", "line", datas));
    }
  }
  secao.querySelector("[data-abrir-analise]")!.addEventListener("click", () => {
    aberto = !aberto; conteudo.hidden = !aberto;
    secao.querySelector("[data-abrir-analise]")!.textContent = aberto ? "Recolher gráficos e metas" : "Explorar gráficos e metas";
    if (aberto) desenhar(); else charts.splice(0).forEach(c => c.destroy());
  });
  secao.querySelectorAll<HTMLButtonElement>("[data-exportar]").forEach(btn => btn.addEventListener("click", async () => {
    btn.disabled = true;
    try {
      const tipo = btn.dataset.exportar;
      if (tipo === "png") {
        const { default: html2canvas } = await import("html2canvas");
        const canvas = await html2canvas(area, { backgroundColor: getComputedStyle(document.documentElement).getPropertyValue("--surface").trim() || "#ffffff", logging: false });
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve)); if (!blob) throw new Error("Falha ao gerar PNG.");
        baixar(blob, "png");
      } else if (tipo === "csv") {
        const cell = (v: unknown) => '"' + String(v ?? "").replace(/"/g, '""') + '"';
        const csv = [["Métrica", "Valor", "Unidade", "Descrição"], ...relatorio.metrics.map(m => [m.name, m.value, m.unit, m.description])].map(l => l.map(cell).join(";")).join("\r\n");
        baixar(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }), "csv");
      } else baixar(new Blob([JSON.stringify(relatorio, null, 2)], { type: "application/json" }), "json");
      status.textContent = "Exportação concluída.";
    } catch (erro) { status.textContent = mensagemErro(erro); }
    finally { btn.disabled = false; }
  }));
  function baixar(blob: Blob, extensao: string): void {
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = "lean-metrics-" + relatorio.full_name.replace(/[^a-z0-9_-]/gi, "-") + "." + extensao; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  window.addEventListener("themechanged", desenhar);
  limpar = () => { ativo = false; charts.splice(0).forEach(c => c.destroy()); window.removeEventListener("themechanged", desenhar); };
  if (new URLSearchParams(location.search).get("tab") === "graficos") secao.querySelector<HTMLButtonElement>("[data-abrir-analise]")!.click();
}
