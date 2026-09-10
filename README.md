# LeanMetrics — frontend

Interface TypeScript + Vite para o backend FastAPI em `../tcc_lean`. Login com GitHub OAuth, análise pública, painel paginado, importação de repositórios, gráficos, metas locais e histórico.

## Executar

Use Node.js 22.12+.

```sh
npm ci
npm run dev
```

Acesse http://localhost:3000. Inicie o backend com o [guia Docker](../tcc_lean/README.md). O proxy do Vite encaminha `/api` para `http://localhost:8000`.

Para login, configure o OAuth App no backend conforme o [guia de configuração](../tcc_lean/docs/configuracao.md#login-com-github). Use `FRONTEND_URL=http://localhost:3000`, inclua essa origem em `CORS_ORIGINS` e mantenha o callback em `http://localhost:8000/api/v1/autenticacao/github/callback`. `VITE_OAUTH_URL=http://localhost:8000` faz o login iniciar no mesmo host do callback e preserva o cookie de estado OAuth.

O botão Entrar com GitHub abre o OAuth. O backend define o JWT em cookie HttpOnly e a interface envia requisições com `credentials: include`. Não há cadastro ou login por senha. A análise de repositórios públicos funciona sem sessão.

## Configuração e build

Copie `.env.example` para `.env`. `VITE_API_URL` aceita uma origem ou uma base terminada em `/api/v1`; vazia, usa o proxy local. `VITE_OAUTH_URL` define a origem canônica do backend para iniciar o login e deve ter o mesmo host do callback cadastrado no GitHub. Configure antes do build; as variáveis são incorporadas nos arquivos gerados.

```sh
npm run build
npm run preview
```

O build verifica TypeScript e gera cinco páginas em `dist/`: início, painel, relatório, relatório rápido e o acesso compatível de gráficos. O preview usa http://localhost:4173; ajuste a origem do frontend e o CORS do backend caso queira testar login por ele.

## Fluxos disponíveis

| Fluxo | Comportamento |
| --- | --- |
| Análise rápida | Consulta pública sem cadastrar nem salvar histórico |
| Painel | Lista os cadastros do usuário com paginação |
| Importar do GitHub | Lista repositórios remotos e preenche o formulário para revisão |
| Excluir | Remove cadastro local e histórico após confirmação; mantém o repositório remoto |
| Relatório cadastrado | Gera métricas e persiste snapshot no backend |
| Gráficos e metas | Compara valores e metas, mostra distribuições e permite exportar JSON, CSV e PNG |
| Histórico | Busca snapshots reais; gráficos não inventam evolução temporal |
| Metas | Salvas por repositório no localStorage deste navegador |
| Logout | Solicita ao backend a remoção do cookie de sessão |

As rotas atuais usam `/autenticacao`, `/repositorios` e `/relatorios`. [Mapa completo da API](../tcc_lean/docs/fluxo-de-uso.md).

O token GitHub opcional permanece no campo da página e segue no header `X-GitHub-Token`. O JWT da aplicação fica em cookie HttpOnly. Metas e tema usam localStorage; o destino após login usa sessionStorage.

## Gráficos e interpretação

Tempos, contagens e percentuais usam gráficos separados. O adaptador em `src/api.ts` converte percentuais do backend para razões usadas pela interface e normaliza os campos de data e identificação. Severidades em português e inglês são aceitas.

Valores nulos aparecem como “Sem dados”; zero permanece zero. Metas representam limites configurados pelo usuário. O Lean Score só é exibido com todas as métricas necessárias. Consulte amostra e descrição antes de interpretar um indicador.

## Organização

| Arquivo | Responsabilidade |
| --- | --- |
| src/api.ts | Transporte HTTP, cookies e adaptação do contrato |
| src/autenticacao.ts | Perfil, OAuth, logout e navegação |
| src/painel.ts | Cadastro, importação, exclusão e paginação |
| src/visualizacao.ts | Resumo, valores acessíveis e gráficos principais |
| src/analise-avancada.ts | Metas, distribuições, exportação e histórico |
| src/relatorioCompartilhado.ts | Metas e cálculo de score preservados da branch de gráficos |
| src/graficos/ | Componentes de gráficos e acesso compatível de versões anteriores |
| src/style.css | Layout responsivo e temas |

## Testes

```sh
npm test
```

Playwright usa Google Chrome instalado e inicia o Vite se necessário. Os testes interceptam a API com fixtures no contrato atual: OAuth, cookies, análise pública, importação, paginação, erros, valores nulos, metas, histórico e exportação. Também verificam os temas claro/escuro e larguras de 320 a 1440 pixels.

Esses testes não substituem a autorização real no GitHub ou a execução com PostgreSQL. Resultados e limites da integração ficam no [registro de validação](../tcc_lean/docs/integracao-branches.md).
