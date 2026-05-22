# GitHub Lean Metrics — Interface Frontend 📊✨

Este repositório contém a interface de usuário (Frontend) do projeto **GitHub Lean Metrics**, uma ferramenta avançada desenvolvida para fins de Trabalho de Conclusão de Curso (TCC) que analisa repositórios de software sob a ótica dos princípios e métricas Lean de engenharia de software (como Lead Time, Cycle Time, Throughput, Rework, WIP e identificação de desperdícios de processos).

A interface foi projetada com foco em **desempenho extremo**, **estética ultra-premium (glassmorphism/dark mode nativo)** e **interatividade em tempo real** com gráficos analíticos complexos.

---

## 🛠️ Tecnologias Utilizadas

* **Core:** HTML5, CSS3, JavaScript & [TypeScript](https://www.typescriptlang.org/) (Tipagem estrita e robusta)
* **Bundler & Dev Server:** [Vite v8](https://vite.dev/) (Carregamento e HMR instantâneos)
* **Estilização (CSS):** [Tailwind CSS v4](https://tailwindcss.com/) (Estilização ultra-rápida baseada em utilitários de última geração)
* **Gráficos Dinâmicos:** [Chart.js v4](https://www.chartjs.org/) (Visualização analítica interativa com suporte a light/dark mode em tempo real)
* **Ícones Vetoriais:** [Lucide Icons](https://lucide.dev/) (Consistência visual limpa e moderna)

---

## 🚀 Como Executar o Projeto Localmente

Siga o passo a passo abaixo para rodar a interface em sua máquina:

### 1. Pré-requisitos
Certifique-se de ter o **Node.js** (versão 18 ou superior) instalado em seu sistema.

### 2. Instalar as Dependências
Clone este repositório, acesse a pasta raiz pelo terminal e execute:
```bash
npm install
```

### 3. Configurar a Conexão com o Backend
Crie um arquivo `.env` na raiz do projeto (você pode copiar as instruções do `.env.example`):
```bash
cp .env.example .env
```
No arquivo `.env`, você pode configurar a variável `VITE_API_URL` para apontar para a API ativa do seu backend (por exemplo, em desenvolvimento local: `http://localhost:8000`).
> 💡 **Nota:** Se você deixar a variável `VITE_API_URL` vazia, o Vite usará automaticamente o proxy interno configurado em `vite.config.ts` (`/api` → `http://localhost:8000`), o que é ideal para o desenvolvimento local sem problemas de CORS.

### 4. Iniciar o Servidor de Desenvolvimento
Inicie o servidor de desenvolvimento local:
```bash
npm run dev
```
A interface estará acessível no seu navegador (geralmente em `http://localhost:3000` ou `http://localhost:5173`).

---

## 📦 Build para Produção (Deploy)

Para compilar e otimizar os arquivos estáticos para produção:

```bash
npm run build
```

Este comando executa a verificação estrita do compilador TypeScript (`tsc`) e gera os arquivos estáticos otimizados (HTML, CSS e JS minimizados) dentro do diretório `/dist`. Esse diretório pode ser facilmente hospedado em qualquer serviço de arquivos estáticos modernos como Vercel, Netlify, GitHub Pages ou Cloudflare Pages.

---

## 🎨 Principais Recursos Visuais

1. **☀️ / 🌙 Chaveador de Temas:** Alternância instantânea entre Dark Mode e Light Mode com recalibração dinâmica automática dos gráficos analíticos do Chart.js.
2. **⚡ Telemetria de Infraestrutura:** Badges dinâmicos indicando instantaneamente o status do cache da API (`CACHE HIT` ou `CACHE MISS`), acompanhado do tempo exato de latência de processamento e logs em tempo real na tela.
3. **➕ Fluxo Inteligente de Cadastro:** Modal otimizado com preenchimento mágico automático a partir de URLs coladas do GitHub e integração de dropdown para importação silenciosa dos repositórios pessoais do desenvolvedor logado.

---

Desenvolvido com carinho para a defesa de TCC de Engenharia de Software. 🎓🚀
