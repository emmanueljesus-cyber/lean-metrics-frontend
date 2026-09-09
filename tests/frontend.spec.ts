import { test, expect, type Page } from "@playwright/test";
const token =
  "e30." +
  Buffer.from(
    JSON.stringify({ sub: "1", exp: Math.floor(Date.now() / 1000) + 3600 }),
  ).toString("base64url") +
  ".assinatura-de-teste";
const metric = (name: string, value: number | null, unit = "count") => ({
  name,
  value,
  unit,
  description: "Descrição da API",
});
const relatorio = {
  repositorio_id: 1,
  full_name: "fastapi/fastapi",
  gerado_em: "2026-09-07T15:30:00Z",
  metrics: [
    metric("lead_time_pr_hours", 84.25, "hours"),
    metric("cycle_time_issue_hours", 38.5, "hours"),
    metric("throughput_30d", 27),
    metric("wip_open_pull_requests", 12),
    metric("wip_open_issues", 8),
    metric("defect_rate", 0.35, "ratio"),
    metric("active_contributors_30d", 18),
    metric("top_contributor_share", 0.68, "ratio"),
    metric("open_issues_repository_total", 145),
  ],
  waste_signals: [
    {
      category: "waiting",
      severity: "high",
      message: "Lead time alto; revise gargalos de revisão.",
    },
    {
      category: "handoff",
      severity: "medium",
      message: "Contribuição concentrada no autor mais ativo.",
    },
  ],
};

test("contrato português, metas persistentes, histórico e exportação", async ({ page }) => {
  await sessao(page);
  await page.setViewportSize({ width: 390, height: 844 });
  const dados = {
    ...relatorio,
    metrics: [
      metric("lead_time_pr_hours", 84.25, "horas"),
      metric("waiting_time_pr_hours", 30, "horas"),
      metric("wip_open_pull_requests", 12, "PRs"),
      metric("wip_open_issues", 8, "issues"),
      metric("defect_rate", 35, "%"),
      metric("total_issues_sampled", 60, "issues"),
      { ...metric("contributor_distribution", null, "json"), extra: { "dev <script>": 0.75, outro: 0.25 } },
    ],
    waste_signals: [{ category: "Espera", severity: "alta", message: "Atenção ao fluxo." }],
  };
  await mockRelatorio(page, dados);
  let consultas = 0;
  await page.route("**/api/v1/relatorios/repositorio/1/historico?*", route => {
    consultas++;
    return route.fulfill({ json: [{ ...dados, gerado_em: "2026-09-01T12:00:00Z" }, dados] });
  });
  await page.goto("/relatorio.html?id=1");
  await expect(page.locator(".signal.high .severity")).toHaveText("Alta");
  await expect(page.locator(".metric-value").filter({ hasText: "35%" })).toHaveCount(1);
  await page.getByRole("button", { name: "Explorar gráficos e metas" }).click();
  await page.getByLabel("Meta de lead time (horas)").fill("100");
  await page.getByRole("button", { name: "Salvar metas" }).click();
  await expect(page.locator("[data-status]")).toHaveText("Metas salvas neste navegador.");
  await expect(page.locator("[data-conteudo] script")).toHaveCount(0);
  await semOverflow(page);
  await page.getByRole("button", { name: "Carregar histórico" }).click();
  await expect(page.getByRole("heading", { name: "Evolução do lead time" })).toBeVisible();
  expect(consultas).toBe(1);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar JSON" }).click();
  expect((await download).suggestedFilename()).toBe("lean-metrics-fastapi-fastapi.json");
  await page.reload();
  await page.getByRole("button", { name: "Explorar gráficos e metas" }).click();
  await expect(page.getByLabel("Meta de lead time (horas)")).toHaveValue("100");
  await page.getByRole("button", { name: "Ativar tema claro" }).click();
  await expect(page.getByLabel("Meta de lead time (horas)")).toHaveValue("100");
  await semOverflow(page);
});

test("importação preserva a branch remota e exclusão usa o cadastro local", async ({ page }) => {
  await sessao(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/v1/repositorios?*", route => route.fulfill({ json: { items: [repo()], page: 1, page_size: 12, total: 1, total_pages: 1 } }));
  await page.route("**/api/v1/repositorios/github/listar", route => route.fulfill({ json: [{ id: 10, name: "privado", full_name: "dev/privado", private: true, branch_padrao: "develop", description: "Projeto importado", html_url: "https://github.com/dev/privado", owner: { login: "dev" } }] }));
  let criou = false, excluiu = false;
  await page.route("**/api/v1/repositorios", async route => {
    expect(route.request().postDataJSON()).toEqual({ nome_proprietario: "dev", nome_repositorio: "privado", description: "Projeto importado", branch_padrao: "develop" });
    criou = true;
    await route.fulfill({ status: 201, json: repo() });
  });
  await page.route("**/api/v1/repositorios/1", async route => {
    expect(route.request().method()).toBe("DELETE"); excluiu = true;
    await route.fulfill({ status: 204 });
  });
  await page.goto("/painel.html");
  await page.getByRole("button", { name: "Importar do GitHub" }).click();
  await expect(page.getByRole("heading", { name: "privado" })).toBeVisible();
  await expect(page.getByText("Projeto importado")).toBeVisible();
  await expect(page.getByText("Branch padrão:")).toContainText("develop");
  await semOverflow(page);
  await page.getByRole("button", { name: "Selecionar dev/privado" }).click();
  await expect(page.getByLabel("Branch padrão")).toHaveValue("develop");
  await page.getByRole("button", { name: "Salvar repositório" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(criou).toBe(true);
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Excluir", exact: true }).click();
  await expect.poll(() => excluiu).toBe(true);
});
const repo = (id = 1) => ({
  id,
  nome_proprietario: "fastapi",
  nome_repositorio: "fastapi-" + id,
  description: "Um projeto para entender métricas Lean.",
  branch_padrao: "main",
  provider: "github",
  ativo: true,
  criado_em: "2026-09-07T12:00:00Z",
  atualizado_em: "2026-09-07T12:00:00Z",
  usuario_id: 1,
});
async function sessao(page: Page, tema = "dark") {
  await page.context().addCookies([{ name: "access_token", value: token, domain: "127.0.0.1", path: "/", httpOnly: true, sameSite: "Lax" }]);
  await page.route("**/api/v1/autenticacao/perfil", route => route.fulfill({ json: { id: 1, nome_usuario: "Emmanuel", email: "dev@example.com", ativo: true, url_avatar: null, tem_github: true, criado_em: "2026-09-08T00:00:00Z" } }));
  await page.addInitScript(tema => localStorage.setItem("theme", tema), tema);
}

async function semOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const fora = await page
    .locator("main .card, .navbar, main .button, canvas")
    .evaluateAll((elements) =>
      elements
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width && (r.left < -1 || r.right > innerWidth + 1);
        })
        .map((el) => el.outerHTML.slice(0, 160)),
    );
  expect(fora).toEqual([]);
}
async function mockRelatorio(page: Page, dados = relatorio) {
  await page.route("**/api/v1/relatorios/repositorio/1/gerar", (route) =>
    route.fulfill({ json: dados }),
  );
}
for (const largura of [320, 390, 768, 1440]) {
  for (const tema of ["dark", "light"]) {
    test(
      "relatório responsivo " + largura + " " + tema,
      async ({ page }, testInfo) => {
        const erros: string[] = [];
        page.on("pageerror", (erro) => erros.push(erro.message));
        await page.setViewportSize({ width: largura, height: 900 });
        await sessao(page, tema);
        await mockRelatorio(page);
        await page.goto("/relatorio.html?id=1");
        await expect(page.locator(".metric-card")).toHaveCount(9);
        await expect(page.locator("canvas")).toHaveCount(4);
        await expect(
          page.locator(".metric-value").filter({ hasText: "35%" }),
        ).toHaveCount(1);
        await expect(page.locator(".report-meta")).toContainText("2026");
        await expect(
          page
            .locator(".metric-card")
            .filter({ hasText: "Contribuidores na amostra" }),
        ).toContainText("18");
        await page.waitForFunction(() =>
          [...document.querySelectorAll("canvas")].every(
            (c) => c.width > 0 && c.height > 0,
          ),
        );
        await semOverflow(page);
        await expect(
          page.getByRole("heading", { name: "Sinais de desperdício" }),
        ).toBeVisible();
        await page.screenshot({
          path: testInfo.outputPath(
            "relatorio-" + largura + "-" + tema + ".png",
          ),
          fullPage: true,
          animations: "disabled",
        });
        expect(erros).toEqual([]);
      },
    );
  }
}
test("início disponível sem backend, responsivo e com navegação móvel", async ({
  page,
}, testInfo) => {
  await page.route("**/api/**", (route) => route.abort());
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Entenda o fluxo",
    );
    await expect(
      page.getByRole("link", { name: "Análise rápida", exact: true }),
    ).toBeVisible();
    await semOverflow(page);
    await page.screenshot({
      path: testInfo.outputPath("inicio-" + width + ".png"),
      fullPage: true,
    });
  }
});
test("login usa GitHub OAuth e não oferece senha", async ({ page }) => {
  await page.route("**/api/v1/autenticacao/perfil", route => route.fulfill({ json: null }));
  await page.route("**/api/v1/autenticacao/github/entrar", route => route.fulfill({ contentType: "text/html", body: "Redirecionamento OAuth iniciado" }));
  await page.goto("/");
  await expect(page.getByLabel("Senha", { exact: true })).toHaveCount(0);
  await page.locator("[data-login-github]").click();
  await expect(page).toHaveURL(/autenticacao\/github\/entrar/);
});

test("logout chama API e encerra a sessão por cookie", async ({ page }) => {
  await sessao(page);
  await page.route("**/api/v1/autenticacao/sair", async route => {
    expect(route.request().method()).toBe("POST");
    expect(route.request().headers().cookie).toContain("access_token=");
    await route.fulfill({ status: 204 });
  });
  await page.goto("/");
  await page.locator("#btn-logout").click();
  await expect(page).toHaveURL(/index.html/);
});

test("pagina todos os repositórios e mantém nome longo seguro no celular", async ({
  page,
}, testInfo) => {
  await sessao(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/v1/repositorios?*", (route) => {
    const pageNumber = Number(
      new URL(route.request().url()).searchParams.get("page"),
    );
    return route.fulfill({
      json: {
        items:
          pageNumber === 1
            ? [
                {
                  ...repo(),
                  nome_repositorio:
                    "repositorio-com-um-nome-muito-longo-".repeat(3),
                  description: '<img src=x onerror="alert(1)">',
                },
              ]
            : [repo(13)],
        page: pageNumber,
        total: 13,
        page_size: 12,
        total_pages: 2,
      },
    });
  });
  await page.goto("/painel.html");
  await expect(page.getByText("13 repositórios cadastrados")).toBeVisible();
  await expect(page.locator(".repo-card img")).toHaveCount(0);
  await semOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath("painel-mobile.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Próxima" }).click();
  await expect(page.getByRole("heading", { name: "fastapi-13" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Próxima" })).toBeDisabled();
});
test("modal móvel, URL validada, cadastro e retorno do foco", async ({
  page,
}) => {
  await sessao(page);
  await page.setViewportSize({ width: 320, height: 640 });
  await page.route("**/api/v1/repositorios?*", (route) =>
    route.fulfill({
      json: { items: [], page: 1, total: 0, page_size: 12, total_pages: 0 },
    }),
  );
  let criou = false;
  await page.route("**/api/v1/repositorios", async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      nome_proprietario: "fastapi",
      nome_repositorio: "fastapi",
      description: null,
      branch_padrao: "develop",
    });
    criou = true;
    await route.fulfill({ status: 201, json: repo() });
  });
  await page.goto("/painel.html");
  await page.locator("#btn-adicionar").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByLabel("Link do GitHub")
    .fill("https://evilgithub.com/fastapi/fastapi");
  await expect(page.getByLabel("Proprietário", { exact: true })).toHaveValue(
    "",
  );
  await page
    .getByLabel("Link do GitHub")
    .fill("https://github.com/fastapi/fastapi.git");
  await expect(page.getByLabel("Repositório", { exact: true })).toHaveValue(
    "fastapi",
  );
  await page.getByLabel("Branch padrão").fill("develop");
  await page.getByRole("button", { name: "Salvar repositório" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(criou).toBe(true);
  await expect(page.locator("#btn-adicionar")).toBeFocused();
});
test("troca de tema não recarrega página nem consulta relatório", async ({
  page,
}) => {
  await sessao(page);
  let chamadas = 0;
  await page.route("**/api/v1/relatorios/repositorio/1/gerar", (route) => {
    chamadas++;
    return route.fulfill({ json: relatorio });
  });
  await page.goto("/relatorio.html?id=1");
  await expect(page.locator("canvas")).toHaveCount(4);
  await page.getByRole("button", { name: "Ativar tema claro" }).click();
  await expect(page.locator("html")).toHaveClass("light");
  await expect(page.locator("canvas")).toHaveCount(4);
  expect(chamadas).toBe(1);
});
test("nulo não vira zero e amostra vazia não inventa gráficos", async ({
  page,
}) => {
  await sessao(page);
  await mockRelatorio(page, {
    ...relatorio,
    metrics: [
      metric("lead_time_pr_hours", null, "hours"),
      metric("wip_open_pull_requests", 0),
      metric("top_contributor_share", 0, "ratio"),
    ],
    waste_signals: [],
  });
  await page.goto("/relatorio.html?id=1");
  await expect(
    page
      .locator(".metric-card")
      .filter({ hasText: "Lead time" })
      .locator(".metric-value"),
  ).toHaveText("Sem dados");
  await expect(
    page
      .locator(".metric-card")
      .filter({ hasText: "PRs em andamento" })
      .locator(".metric-value"),
  ).toHaveText("0");
  await expect(page.locator("canvas")).toHaveCount(1);
  await expect(page.locator("#area-relatorio")).not.toContainText("NaN");
  await expect(
    page.getByText("Sem participação identificável", { exact: false }),
  ).toBeVisible();
});
test("erro da API permite repetir a consulta com token GitHub", async ({
  page,
}) => {
  await sessao(page);
  let chamadas = 0;
  await page.route("**/api/v1/relatorios/repositorio/1/gerar", async (route) => {
    chamadas++;
    if (chamadas === 1)
      return route.fulfill({
        status: 502,
        json: { error: { message: "GitHub indisponível" } },
      });
    expect(route.request().headers()["x-github-token"]).toBe(
      "token-github-teste",
    );
    expect(route.request().headers().cookie).toContain("access_token=");
    return route.fulfill({ json: relatorio });
  });
  await page.goto("/relatorio.html?id=1");
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByLabel("Token GitHub").fill("token-github-teste");
  await page.getByRole("button", { name: "Atualizar análise" }).click();
  await expect(page.locator("canvas")).toHaveCount(4);
  expect(
    await page.evaluate(
      () => JSON.stringify(sessionStorage) + JSON.stringify(localStorage),
    ),
  ).not.toContain("token-github-teste");
});
test("análise pública não cadastra e impede envio duplicado", async ({ page }) => {
  await page.route("**/api/v1/autenticacao/perfil", route => route.fulfill({ json: null }));
  let chamadas = 0;
  await page.route("**/api/v1/relatorios/relatorio-rapido?*", async route => {
    chamadas++;
    await new Promise(resolve => setTimeout(resolve, 150));
    await route.fulfill({ json: { ...relatorio, repositorio_id: null } });
  });
  await page.route("**/api/v1/repositorios**", () => { throw new Error("Análise pública não deve cadastrar"); });
  await page.goto("/relatorio-rapido.html");
  await page.getByRole("button", { name: "fastapi/fastapi", exact: true }).click();
  expect(chamadas).toBe(0);
  await page.getByRole("button", { name: "Analisar repositório" }).click();
  await expect(page.locator("#btn-analisar")).toBeDisabled();
  await expect(page.locator("canvas")).toHaveCount(4);
  expect(chamadas).toBe(1);
});

test("identificador inválido não dispara relatório", async ({ page }) => {
  await sessao(page);
  await page.route("**/api/v1/relatorios/**", () => {
    throw new Error("Não deve consultar a API");
  });
  await page.goto("/relatorio.html?id=1abc");
  await expect(page.getByRole("alert")).toContainText("identificador");
  await expect(
    page.getByRole("button", { name: "Atualizar análise" }),
  ).toBeDisabled();
});
test("sessão expirada pela API retorna ao login preservando destino", async ({
  page,
}) => {
  await sessao(page);
  await page.route("**/api/v1/repositorios?*", (route) =>
    route.fulfill({ status: 401, json: { detail: "Not authenticated" } }),
  );
  await page.goto("/painel.html");
  await expect(page).toHaveURL(/expirada=1/);
  await expect(page.locator("[data-login-github]")).toBeVisible();
});

test("URL de gráficos abre análise pública com parâmetros", async ({ page }) => {
  await page.route("**/api/v1/autenticacao/perfil", route => route.fulfill({ json: null }));
  await page.route("**/api/v1/relatorios/relatorio-rapido?*", route => route.fulfill({ json: { ...relatorio, repositorio_id: null } }));
  await page.goto("/graficos.html?proprietario=fastapi&repositorio=fastapi");
  await expect(page.locator("#resultado-nome")).toHaveText("fastapi/fastapi");
  await expect(page.getByRole("heading", { name: "Metas deste repositório" })).toBeVisible();
});

test("exportação PNG produz imagem do relatório", async ({ page }) => {
  await sessao(page);
  await mockRelatorio(page);
  await page.goto("/relatorio.html?id=1");
  await expect(page.locator(".metric-card")).toHaveCount(9);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar PNG" }).click();
  await expect(page.locator("[data-status]")).toHaveText("Exportação concluída.");
  expect((await download).suggestedFilename()).toBe("lean-metrics-fastapi-fastapi.png");
});

test("relatório sem métricas tem estado vazio e tabela consultável", async ({
  page,
}) => {
  await sessao(page);
  await mockRelatorio(page, { ...relatorio, metrics: [], waste_signals: [] });
  await page.goto("/relatorio.html?id=1");
  await expect(
    page.getByRole("heading", { name: "Nenhuma métrica disponível" }),
  ).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
  await page.locator("summary").first().click();
  await expect(page.getByRole("table")).toBeVisible();
});
