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
  repository_id: 1,
  full_name: "fastapi/fastapi",
  generated_at: "2026-09-07T15:30:00Z",
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
const repo = (id = 1) => ({
  id,
  owner_name: "fastapi",
  repository_name: "fastapi-" + id,
  description: "Um projeto para entender métricas Lean.",
  default_branch: "main",
  provider: "github",
  is_active: true,
  created_at: "2026-09-07T12:00:00Z",
  updated_at: "2026-09-07T12:00:00Z",
  owner_id: 1,
});
async function sessao(page: Page, tema = "dark") {
  await page.addInitScript(
    ({ token, tema }) => {
      sessionStorage.setItem("lean-metrics-token", token);
      sessionStorage.setItem(
        "lean-metrics-user",
        JSON.stringify({ username: "Emmanuel" }),
      );
      localStorage.setItem("theme", tema);
    },
    { token, tema },
  );
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
  await page.route("**/api/v1/repositories/1/report", (route) =>
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
test("login envia JSON e JWT ao endpoint correto", async ({ page }) => {
  let corpo: unknown;
  await page.route("**/api/v1/auth/login", async (route) => {
    corpo = route.request().postDataJSON();
    expect(route.request().headers()["content-type"]).toContain(
      "application/json",
    );
    await route.fulfill({
      json: { access_token: token, token_type: "bearer" },
    });
  });
  await page.route("**/api/v1/repositories?*", async (route) => {
    expect(route.request().headers().authorization).toBe("Bearer " + token);
    await route.fulfill({
      json: { items: [], page: 1, page_size: 12, total: 0, total_pages: 0 },
    });
  });
  await page.goto("/");
  await page.getByLabel("E-mail", { exact: true }).fill("dev@example.com");
  await page.getByLabel("Senha", { exact: true }).fill("senha12345");
  await page.getByRole("button", { name: "Entrar na conta" }).click();
  await expect(page).toHaveURL(/painel.html/);
  await expect(page.getByText("Nenhum repositório por aqui")).toBeVisible();
  expect(corpo).toEqual({ email: "dev@example.com", password: "senha12345" });
});
test("cadastro usa username e token aninhado", async ({ page }) => {
  await page.route("**/api/v1/auth/register", async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      username: "dev_teste",
      email: "dev@example.com",
      password: "senha12345",
    });
    await route.fulfill({
      status: 201,
      json: {
        id: 1,
        username: "dev_teste",
        email: "dev@example.com",
        is_active: true,
        token: { access_token: token, token_type: "bearer" },
      },
    });
  });
  await page.route("**/api/v1/repositories?*", (route) =>
    route.fulfill({
      json: { items: [], page: 1, page_size: 12, total: 0, total_pages: 0 },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
  await page.getByLabel("Nome de usuário").fill("dev_teste");
  await page.getByLabel("E-mail", { exact: true }).fill("dev@example.com");
  await page.getByLabel("Senha", { exact: true }).fill("senha12345");
  await page
    .getByRole("button", { name: "Criar conta", exact: true })
    .last()
    .click();
  await expect(page).toHaveURL(/painel.html/);
});
test("pagina todos os repositórios e mantém nome longo seguro no celular", async ({
  page,
}, testInfo) => {
  await sessao(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/v1/repositories?*", (route) => {
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
                  repository_name:
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
  await page.route("**/api/v1/repositories?*", (route) =>
    route.fulfill({
      json: { items: [], page: 1, total: 0, page_size: 12, total_pages: 0 },
    }),
  );
  let criou = false;
  await page.route("**/api/v1/repositories", async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      owner_name: "fastapi",
      repository_name: "fastapi",
      description: null,
      default_branch: "develop",
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
  await page.route("**/api/v1/repositories/1/report", (route) => {
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
  await page.route("**/api/v1/repositories/1/report", async (route) => {
    chamadas++;
    if (chamadas === 1)
      return route.fulfill({
        status: 502,
        json: { error: { message: "GitHub indisponível" } },
      });
    expect(route.request().headers()["x-github-token"]).toBe(
      "token-github-teste",
    );
    expect(route.request().headers().authorization).toBe("Bearer " + token);
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
test("análise rápida reutiliza cadastro e impede envio duplicado", async ({
  page,
}) => {
  await sessao(page);
  await page.route("**/api/v1/repositories?*", (route) =>
    route.fulfill({
      json: {
        items: [{ ...repo(), repository_name: "fastapi" }],
        page: 1,
        total: 1,
        page_size: 100,
        total_pages: 1,
      },
    }),
  );
  let chamadas = 0;
  await page.route("**/api/v1/repositories/1/report", async (route) => {
    chamadas++;
    await new Promise((resolve) => setTimeout(resolve, 150));
    await route.fulfill({ json: relatorio });
  });
  await page.route("**/api/v1/repositories", () => {
    throw new Error("Cadastro duplicado");
  });
  await page.goto("/relatorio-rapido.html");
  await page
    .getByRole("button", { name: "fastapi/fastapi", exact: true })
    .click();
  expect(chamadas).toBe(0);
  await page.getByRole("button", { name: "Analisar repositório" }).click();
  await expect(page.locator("#btn-analisar")).toBeDisabled();
  await expect(page.locator("canvas")).toHaveCount(4);
  expect(chamadas).toBe(1);
});
test("identificador inválido não dispara relatório", async ({ page }) => {
  await sessao(page);
  await page.route("**/api/**", () => {
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
  await page.route("**/api/v1/repositories?*", (route) =>
    route.fulfill({ status: 401, json: { detail: "Not authenticated" } }),
  );
  await page.goto("/painel.html");
  await expect(page).toHaveURL(/expirada=1/);
  await expect(page.locator("#erro-auth")).toContainText("Sua sessão expirou");
});

test("análise rápida cadastra projeto novo e usa o ID retornado", async ({
  page,
}) => {
  await sessao(page);
  await page.setViewportSize({ width: 320, height: 800 });
  await page.route("**/api/v1/repositories?*", (route) =>
    route.fulfill({
      json: { items: [], page: 1, page_size: 100, total: 0, total_pages: 0 },
    }),
  );
  await page.route("**/api/v1/repositories", async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      owner_name: "fastapi",
      repository_name: "fastapi",
    });
    return route.fulfill({ status: 201, json: repo(42) });
  });
  await page.route("**/api/v1/repositories/42/report", (route) =>
    route.fulfill({ json: { ...relatorio, repository_id: 42 } }),
  );
  await page.goto("/relatorio-rapido.html");
  await semOverflow(page);
  await page
    .getByLabel("Link do GitHub")
    .fill("https://github.com/fastapi/fastapi");
  await page.getByRole("button", { name: "Analisar repositório" }).click();
  await expect(page.locator("#resultado-nome")).toHaveText("fastapi/fastapi");
  await expect(page.locator("canvas")).toHaveCount(4);
  await semOverflow(page);
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
  await page.locator("summary").click();
  await expect(page.getByRole("table")).toBeVisible();
});
