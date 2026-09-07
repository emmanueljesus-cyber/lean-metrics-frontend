import { Chart, registerables } from "chart.js";
import type { RelatorioRepositorio, ValorMetrica } from "./tipos";
import { METRICAS, NOMES_CATEGORIAS } from "./tipos";
import {
  escaparHtml as e,
  formatarData,
  formatarValorMetrica,
  inicializarIcones,
  numero,
} from "./utilitarios";
Chart.register(...registerables);
const charts: Chart[] = [];
let redesenhar: (() => void) | null = null;
export function destruirGraficos(): void {
  charts.splice(0).forEach((chart) => chart.destroy());
  redesenhar = null;
}
window.addEventListener("themechanged", () => redesenhar?.());
const valorValido = (m: ValorMetrica) =>
  typeof m.value === "number" && Number.isFinite(m.value) && m.value >= 0;
const nomes = (m: ValorMetrica) => METRICAS[m.name]?.nome ?? m.name;
const descricao = (m: ValorMetrica) =>
  METRICAS[m.name]?.descricao ?? m.description;
function cor(nome: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(nome)
    .trim();
}

export function renderizarRelatorio(
  area: HTMLElement,
  relatorio: RelatorioRepositorio,
): void {
  destruirGraficos();
  const metricas = relatorio.metrics;
  const validas = metricas.filter(valorValido);
  const grupos = [
    {
      id: "tempos",
      titulo: "Tempo até a conclusão",
      subtitulo: "Médias em horas · PRs e issues têm ciclos diferentes.",
      nomes: ["lead_time_pr_hours", "cycle_time_issue_hours"],
      unidade: "hours",
      labels: ["PRs: abertura → merge", "Issues: criação → fechamento"],
    },
    {
      id: "fluxo",
      titulo: "Trabalho e entregas",
      subtitulo:
        "Contagens na amostra · entregas consideram os últimos 30 dias.",
      nomes: ["wip_open_pull_requests", "wip_open_issues", "throughput_30d"],
      unidade: "count",
      labels: ["PRs abertas", "Issues abertas", "PRs integradas (30 dias)"],
    },
    {
      id: "qualidade",
      titulo: "Issues classificadas como bug",
      subtitulo: "Percentual das issues consultadas com a etiqueta bug.",
      nomes: ["defect_rate"],
      unidade: "ratio",
      labels: ["Issues com bug"],
    },
  ];
  const graficoCard = (g: (typeof grupos)[number]) => {
    const dados = g.nomes
      .map((n) => metricas.find((m) => m.name === n))
      .filter((m): m is ValorMetrica => !!m && valorValido(m));
    return (
      '<article class="card chart-card"><h3>' +
      g.titulo +
      '</h3><p class="muted chart-caption">' +
      g.subtitulo +
      "</p>" +
      (dados.length
        ? '<div class="chart-container"><canvas id="grafico-' +
          g.id +
          '" role="img" aria-label="' +
          e(
            g.titulo +
              ": " +
              dados
                .map(
                  (m) => nomes(m) + " " + formatarValorMetrica(m.value, m.unit),
                )
                .join("; "),
          ) +
          '"></canvas></div>'
        : '<div class="chart-empty">Sem dados suficientes para este gráfico.</div>') +
      '<ul class="chart-values">' +
      g.nomes
        .map((n) => {
          const m = metricas.find((item) => item.name === n);
          return (
            "<li><span>" +
            e(METRICAS[n]?.nome ?? n) +
            "</span><strong>" +
            e(m ? formatarValorMetrica(m.value, m.unit) : "Sem dados") +
            "</strong></li>"
          );
        })
        .join("") +
      "</ul></article>"
    );
  };
  const concentracao = validas.find((m) => m.name === "top_contributor_share");
  const temConcentracao =
    !!concentracao && concentracao.value! > 0 && concentracao.value! <= 1;
  const ordem = { high: 0, medium: 1, low: 2 };
  const sinais = [...relatorio.waste_signals].sort(
    (a, b) => (ordem[a.severity] ?? 3) - (ordem[b.severity] ?? 3),
  );
  area.innerHTML =
    '<div class="report-meta"><span class="eyebrow">Visão do repositório</span><span class="muted">Atualizado em ' +
    e(formatarData(relatorio.generated_at)) +
    "</span></div>" +
    '<section aria-label="Resumo das métricas" class="metric-grid">' +
    metricas
      .map(
        (m) =>
          '<article class="card metric-card"><div class="metric-label"><span>' +
          e(nomes(m)) +
          '</span><i data-lucide="' +
          (METRICAS[m.name]?.icone ?? "info") +
          '" aria-hidden="true"></i></div><p class="metric-value' +
          (valorValido(m) ? "" : " missing") +
          '">' +
          e(formatarValorMetrica(m.value, m.unit)) +
          '</p><p class="metric-description">' +
          e(descricao(m)) +
          "</p></article>",
      )
      .join("") +
    "</section>" +
    (!metricas.length
      ? '<div class="estado"><h2>Nenhuma métrica disponível</h2><p>O relatório retornou sem métricas. Tente atualizar mais tarde.</p></div>'
      : "") +
    '<section class="section"><div class="section-heading"><div><span class="eyebrow">Leitura visual</span><h2>O fluxo em perspectiva</h2></div><span class="badge">Dados agregados</span></div><div class="chart-grid">' +
    grupos.map(graficoCard).join("") +
    '<article class="card chart-card"><h3>Como os commits se concentram</h3><p class="muted chart-caption">Autor mais ativo em relação aos demais autores identificados.</p>' +
    (temConcentracao
      ? '<div class="chart-container donut-container"><canvas id="grafico-concentracao" role="img" aria-label="' +
        e(
          "Autor mais ativo: " +
            formatarValorMetrica(concentracao!.value, "ratio"),
        ) +
        '"></canvas><div class="donut-center" aria-hidden="true"><strong>' +
        e(formatarValorMetrica(concentracao!.value, "ratio")) +
        '</strong><span>autor mais ativo</span></div></div><ul class="chart-values"><li><span><b class="dot"></b> Autor mais ativo</span><strong>' +
        e(formatarValorMetrica(concentracao!.value, "ratio")) +
        '</strong></li><li><span><b class="dot secondary"></b> Demais autores</span><strong>' +
        e(formatarValorMetrica(1 - concentracao!.value!, "ratio")) +
        "</strong></li></ul>"
      : '<div class="chart-empty">Sem participação identificável para representar a distribuição.</div>') +
    "</article></div></section>" +
    '<section class="section"><div class="section-heading"><div><span class="eyebrow">Pontos de atenção</span><h2>Sinais de desperdício</h2></div><span class="badge">' +
    sinais.length +
    " " +
    (sinais.length === 1 ? "sinal" : "sinais") +
    '</span></div><div class="signals">' +
    (sinais.length
      ? sinais
          .map(
            (s) =>
              '<article class="signal ' +
              (["high", "medium", "low"].includes(s.severity)
                ? s.severity
                : "low") +
              '"><i data-lucide="alert-triangle" aria-hidden="true"></i><div><div class="signal-title"><h3>' +
              e(NOMES_CATEGORIAS[s.category] ?? s.category) +
              '</h3><span class="severity">' +
              ({ high: "Alta", medium: "Média", low: "Baixa" }[s.severity] ??
                "Não classificada") +
              "</span></div><p>" +
              e(s.message) +
              "</p></div></article>",
          )
          .join("")
      : '<div class="aviso"><i data-lucide="info" aria-hidden="true"></i><p>Nenhum sinal retornado nesta análise. Isso não garante ausência de desperdícios; considere o tamanho e o contexto da amostra.</p></div>') +
    '</div></section><section class="card details-card"><details><summary>Consultar todos os valores (' +
    metricas.length +
    ')</summary><div class="table-scroll" tabindex="0" role="region" aria-label="Tabela de métricas"><table><caption>Valores retornados para ' +
    e(relatorio.full_name) +
    '</caption><thead><tr><th scope="col">Métrica</th><th scope="col">Valor</th><th scope="col">Como interpretar</th></tr></thead><tbody>' +
    metricas
      .map(
        (m) =>
          '<tr><th scope="row">' +
          e(nomes(m)) +
          "</th><td>" +
          e(formatarValorMetrica(m.value, m.unit)) +
          "</td><td>" +
          e(descricao(m)) +
          "</td></tr>",
      )
      .join("") +
    '</tbody></table></div></details></section><aside class="aviso sample-note"><i data-lucide="info" aria-hidden="true"></i><p><strong>Sobre a amostra.</strong> A API consulta até 100 PRs, 100 issues e 100 commits, sem percorrer páginas adicionais. Os gráficos representam agregados dessa consulta, não uma evolução histórica. Zero é um valor retornado; “Sem dados” indica ausência de valor. Taxas zero podem ocorrer quando a amostra está vazia.</p></aside>';

  const desenhar = () => {
    charts.splice(0).forEach((chart) => chart.destroy());
    const texto = cor("--muted"),
      grade = cor("--border");
    const cores = [cor("--accent"), cor("--blue"), cor("--purple")];
    for (const g of grupos) {
      const canvas = document.getElementById(
        "grafico-" + g.id,
      ) as HTMLCanvasElement | null;
      if (!canvas) continue;
      const indices = g.nomes
        .map((n, i) => ({ i, m: metricas.find((m) => m.name === n) }))
        .filter(
          (p): p is { i: number; m: ValorMetrica } => !!p.m && valorValido(p.m),
        );
      const dados = indices.map(
        (p) => p.m.value! * (g.unidade === "ratio" ? 100 : 1),
      );
      charts.push(
        new Chart(canvas, {
          type: "bar",
          data: {
            labels: indices.map((p) => g.labels[p.i]),
            datasets: [
              {
                data: dados,
                backgroundColor: indices.map((p) => cores[p.i % cores.length]),
                borderRadius: 5,
                maxBarThickness: 28,
                minBarLength: 0,
              },
            ],
          },
          options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            locale: "pt-BR",
            animation: matchMedia("(prefers-reduced-motion: reduce)").matches
              ? false
              : { duration: 350 },
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: cor("--text"),
                titleColor: cor("--surface"),
                bodyColor: cor("--surface"),
                callbacks: {
                  label: (ctx) =>
                    " " +
                    formatarValorMetrica(
                      indices[ctx.dataIndex].m.value,
                      g.unidade,
                    ),
                },
              },
            },
            scales: {
              x: {
                beginAtZero: true,
                max: g.unidade === "ratio" ? 100 : undefined,
                suggestedMax: dados.every((v) => v === 0) ? 1 : undefined,
                grid: { color: grade },
                border: { display: false },
                ticks: {
                  color: texto,
                  maxTicksLimit: 5,
                  precision: g.unidade === "count" ? 0 : undefined,
                  callback: (value) =>
                    numero.format(Number(value)) +
                    (g.unidade === "ratio"
                      ? "%"
                      : g.unidade === "hours"
                        ? " h"
                        : ""),
                },
              },
              y: {
                grid: { display: false },
                border: { display: false },
                ticks: {
                  color: texto,
                  font: { size: 11 },
                  autoSkip: false,
                  callback: (_value, index) => {
                    const label = g.labels[indices[index].i];
                    return label.length > 20
                      ? label.split(": ").length > 1
                        ? label.split(": ")
                        : label.replace(" (", "|(").split("|")
                      : label;
                  },
                },
              },
            },
          },
        }),
      );
    }
    const donut = document.getElementById(
      "grafico-concentracao",
    ) as HTMLCanvasElement | null;
    if (donut && temConcentracao)
      charts.push(
        new Chart(donut, {
          type: "doughnut",
          data: {
            labels: ["Autor mais ativo", "Demais autores"],
            datasets: [
              {
                data: [
                  concentracao!.value! * 100,
                  (1 - concentracao!.value!) * 100,
                ],
                backgroundColor: [cores[0], cores[1]],
                borderColor: cor("--surface"),
                borderWidth: 4,
                hoverOffset: 3,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "78%",
            animation: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (ctx) =>
                    " " +
                    ctx.label +
                    ": " +
                    numero.format(Number(ctx.raw)) +
                    "%",
                },
              },
            },
          },
        }),
      );
  };
  redesenhar = desenhar;
  desenhar();
  inicializarIcones();
}
