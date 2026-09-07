# LeanMetrics — frontend

Interface TypeScript + Vite para o backend FastAPI em `../tcc_lean`. Inclui cadastro e login por e-mail, painel paginado, análise de repositórios e gráficos Chart.js com temas claro e escuro.

## Executar

Use Node.js 22.12+ (ou 20.19+) conforme o [Vite](https://vite.dev/guide/).

```sh
npm ci
npm run dev
```

Acesse http://localhost:3000 e mantenha o backend na porta 8000. O proxy encaminha `/api` ao backend; o login envia JSON e as rotas protegidas recebem JWT no header Authorization.

Copie `.env.example` para `.env` caso precise configurar `VITE_API_URL`. A variável aceita a origem (ex.: `https://api.exemplo.com`) ou uma base terminada em `/api/v1`. Em produção, configure essa variável antes do build, ou um proxy `/api` na hospedagem. Configure também `CORS_ORIGINS` no backend.

## Build e validação

```sh
npm run build
npm run preview
```

O build verifica os tipos e produz as quatro páginas em `dist/`. O preview também encaminha `/api` ao backend local.

## Contrato e comportamento

- Login: `POST /api/v1/auth/login`; cadastro: `POST /api/v1/auth/register`.
- Repositórios: `GET/POST /api/v1/repositories`.
- Relatório: `GET /api/v1/repositories/{id}/report`.
- JWT e identificação visual ficam em sessionStorage, limitados à sessão da aba. A API valida autorização; a leitura local da expiração serve apenas à interface.
- O token GitHub permanece apenas no campo da página e é enviado no header `X-GitHub-Token`.
- A análise rápida exige login, reutiliza um repositório cadastrado ou cria seu cadastro, e consulta o relatório.
- O backend atual não oferece OAuth GitHub, exclusão, importação remota, perfil, histórico ou análise anônima. A interface não chama essas rotas.
- A listagem do backend não isola repositórios por usuário; o painel reflete a lista retornada.

## Visualizações

Tempos em horas, contagens e percentuais usam gráficos separados. Os gráficos respeitam o [dimensionamento do Chart.js](https://www.chartjs.org/docs/latest/configuration/responsive.html), atualizam o tema sem nova consulta e oferecem valores textuais e tabela acessível, seguindo as [orientações de acessibilidade](https://www.chartjs.org/docs/latest/general/accessibility.html).

As consultas atuais abrangem até 100 itens por categoria. Não há séries temporais no contrato: nenhuma evolução histórica é inventada. Valores nulos aparecem como “Sem dados”; zero permanece zero. O indicador de contribuidores é rotulado como amostra, pois o cálculo não filtra por 30 dias. O total de itens abertos do GitHub inclui PRs e issues.

## Organização

- `src/api.ts`: transporte HTTP e endpoints.
- `src/tipos.ts`: contratos e explicações das métricas.
- `src/autenticacao.ts`: sessão e navegação.
- `src/visualizacao.ts`: relatórios e ciclo de vida dos gráficos.
- `src/style.css`: layout responsivo e temas.
- `src/apresentacao.ts`, `painel.ts`, `relatorio.ts`, `relatorio-rapido.ts`: fluxos das páginas.

## Testes de navegador

```sh
npm test
```

A suíte usa o Google Chrome instalado (canal `chrome`) e inicia o Vite automaticamente. Se preferir o Chromium do Playwright, instale-o com `npx playwright install chromium` e remova `channel: 'chrome'` do arquivo de configuração.

Os testes interceptam a API com fixtures no contrato do FastAPI. Validam login/cadastro, JWT e token GitHub, paginação, formulários, erros, valores nulos, proteção de texto dinâmico, troca de tema e larguras de 320, 390, 768 e 1440 pixels. As capturas ficam em `test-results/`.

Esses testes não substituem uma execução de ponta a ponta com PostgreSQL, backend e GitHub reais.
