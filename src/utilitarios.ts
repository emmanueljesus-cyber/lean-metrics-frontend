/**
 * utils.ts — Funções utilitárias: formatação, spinners, estados de UI
 */

import type { Severidade } from './tipos';
import {
  createIcons,
  BarChart2,
  BarChart3,
  Play,
  Search,
  Key,
  Folder,
  File,
  FileText,
  PieChart,
  Award,
  Image,
  Activity,
  Clock,
  Sliders,
  Bug,
  RotateCw,
  Code,
  Users,
  Layers,
  Zap,
  Sun,
  Moon,
  CheckCircle,
  AlertTriangle,
  Lock,
  Globe,
  Plus,
  Trash2,
  LogOut,
  Terminal,
  ChevronRight,
  Info,
  ChevronLeft,
  ArrowLeft,
  GitBranch,
  GraduationCap,
  Hourglass,
  Calendar,
  TrendingUp,
  AlertCircle,
  Database,
  GitPullRequest,
  Hash,
} from 'lucide';

export function inicializarIcones(): void {
  createIcons({
    icons: {
      BarChart2,
      BarChart3,
      Play,
      Search,
      Key,
      Folder,
      File,
      FileText,
      PieChart,
      Award,
      Image,
      Activity,
      Clock,
      Sliders,
      Bug,
      RotateCw,
      Code,
      Users,
      Layers,
      Zap,
      Sun,
      Moon,
      CheckCircle,
      AlertTriangle,
      Lock,
      Globe,
      Plus,
      Trash2,
      LogOut,
      Terminal,
      ChevronRight,
      Info,
      ChevronLeft,
      ArrowLeft,
      GitBranch,
      GraduationCap,
      Hourglass,
      Calendar,
      TrendingUp,
      AlertCircle,
      Database,
      GitPullRequest,
      Hash,
    }
  });
}

// ── Formatação de valores ──────────────────────────────────────────

/**
 * Formata um valor numérico de métrica com sua unidade.
 * Ex: 72.5 horas → "72.5 h" | null → "—"
 */
export function formatarValorMetrica(valor: number | null, unidade: string | null): string {
  if (valor === null || valor === undefined) return '—';

  const n = typeof valor === 'number' ? valor : Number(valor);
  if (isNaN(n)) return '—';

  // Arredonda para no máximo 2 casas
  const formatado = n % 1 === 0 ? String(n) : n.toFixed(2);

  if (!unidade || unidade === 'json') return formatado;

  // Unidades mais legíveis
  const mapaUnidade: Record<string, string> = {
    horas:        'h',
    proporcao:    '',
    'commits/dia':'c/dia',
    dias:         'd',
    commits:      'commits',
    prs:          'PRs',
    issues:       'issues',
    contribuidores: 'devs',
    linhas:       'linhas',
  };

  const unidadeFormatada = mapaUnidade[unidade] ?? unidade;
  return unidadeFormatada ? `${formatado} ${unidadeFormatada}` : formatado;
}

/** Formata uma data ISO para o padrão brasileiro */
export function formatarData(isoString: string | null): string {
  if (!isoString) return '—';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day:    '2-digit',
      month:  '2-digit',
      year:   'numeric',
      hour:   '2-digit',
      minute: '2-digit',
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
}

/** Formata data sem hora */
export function formatarDataCurta(isoString: string): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: 'short', year: 'numeric',
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
}

/** Converte horas em texto legível: 48 → "2 dias" | 3.5 → "3h 30min" */
export function horasParaTexto(horas: number | null): string {
  if (horas === null || horas === undefined) return '—';
  if (horas === 0) return '< 1 min';

  const totalMin = Math.round(horas * 60);
  const dias  = Math.floor(totalMin / (60 * 24));
  const h     = Math.floor((totalMin % (60 * 24)) / 60);
  const min   = totalMin % 60;

  if (dias > 0) return `${dias}d ${h > 0 ? h + 'h' : ''}`.trim();
  if (h > 0)    return `${h}h ${min > 0 ? min + 'min' : ''}`.trim();
  return `${min}min`;
}

// ── Cores por severidade ───────────────────────────────────────────

export const CORES_SEVERIDADE: Record<Severidade, { bg: string; text: string; border: string; icone: string }> = {
  high:   { bg: 'rgba(255,77,109,0.1)',  text: '#ff4d6d', border: 'rgba(255,77,109,0.3)',  icone: '<i data-lucide="alert-triangle" class="w-4 h-4 mr-1 inline-block align-middle"></i>' },
  medium: { bg: 'rgba(255,184,77,0.1)', text: '#ffb84d', border: 'rgba(255,184,77,0.3)', icone: '<i data-lucide="alert-triangle" class="w-4 h-4 mr-1 inline-block align-middle"></i>' },
  low:    { bg: 'rgba(77,207,255,0.1)', text: '#4dcfff', border: 'rgba(77,207,255,0.3)', icone: '<i data-lucide="info" class="w-4 h-4 mr-1 inline-block align-middle"></i>' },
  alta:   { bg: 'rgba(255,77,109,0.1)',  text: '#ff4d6d', border: 'rgba(255,77,109,0.3)',  icone: '<i data-lucide="alert-triangle" class="w-4 h-4 mr-1 inline-block align-middle"></i>' },
  média:  { bg: 'rgba(255,184,77,0.1)', text: '#ffb84d', border: 'rgba(255,184,77,0.3)', icone: '<i data-lucide="alert-triangle" class="w-4 h-4 mr-1 inline-block align-middle"></i>' },
  baixa:  { bg: 'rgba(77,207,255,0.1)', text: '#4dcfff', border: 'rgba(77,207,255,0.3)', icone: '<i data-lucide="info" class="w-4 h-4 mr-1 inline-block align-middle"></i>' },
};

export const TEXTO_SEVERIDADE: Record<Severidade, string> = {
  high:   'Alta',
  medium: 'Média',
  low:    'Baixa',
  alta:   'Alta',
  média:  'Média',
  baixa:  'Baixa',
};

// ── Manipulação de DOM ─────────────────────────────────────────────

/** Retorna um elemento e lança erro se não for encontrado */
export function qs<T extends HTMLElement>(seletor: string, raiz: Document | HTMLElement = document): T {
  const el = raiz.querySelector<T>(seletor);
  if (!el) throw new Error(`Elemento não encontrado: ${seletor}`);
  return el;
}

/** Retorna um elemento por ID e lança erro se não existir */
export function qsId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id) as T | null;
  if (!el) throw new Error(`Elemento #${id} não encontrado`);
  return el;
}

/** Renderiza HTML de "carregando..." com spinner */
export function htmlCarregando(mensagem = 'Carregando...'): string {
  return `
    <div class="flex items-center justify-center gap-3 py-12"
         style="color: var(--color-texto-suave); font-size: 0.9rem;">
      <div class="spinner"></div>
      <span>${mensagem}</span>
    </div>
  `;
}

/** Renderiza HTML de estado vazio */
export function htmlVazio(icone: string, titulo: string, descricao = ''): string {
  return `
    <div class="flex flex-col items-center justify-center py-16 text-center px-6"
         style="color: var(--color-texto-suave);">
      <div style="font-size: 3rem; opacity: 0.4; margin-bottom: 1rem;">${icone}</div>
      <p class="font-semibold" style="color: var(--color-texto); font-size: 1.05rem; margin-bottom: 0.4rem;">${titulo}</p>
      ${descricao ? `<p style="font-size: 0.85rem;">${descricao}</p>` : ''}
    </div>
  `;
}

/** Renderiza HTML de erro */
export function htmlErro(mensagem: string): string {
  return `
    <div class="rounded-xl px-5 py-4 text-sm flex items-center gap-2"
         style="background: rgba(255,77,109,0.1); border: 1px solid rgba(255,77,109,0.25); color: #ff4d6d;">
      <i data-lucide="alert-triangle" class="w-5 h-5 flex-shrink-0"></i>
      <span>${mensagem}</span>
    </div>
  `;
}

/** Ativa/desativa um botão mostrando spinner durante a operação */
export function setBtnCarregando(btn: HTMLButtonElement, carregando: boolean, textoOriginal?: string): void {
  if (carregando) {
    btn.disabled = true;
    btn.dataset.textoOriginal = btn.innerHTML;
    btn.innerHTML = `<div class="spinner"></div> Aguarde...`;
  } else {
    btn.disabled = false;
    btn.innerHTML = textoOriginal ?? btn.dataset.textoOriginal ?? '';
  }
}

/** Extrai o parâmetro `id` da URL (ex: /relatorio.html?id=42) */
export function obterIdDaUrl(param = 'id'): number | null {
  const valor = new URLSearchParams(window.location.search).get(param);
  const n = valor ? parseInt(valor, 10) : NaN;
  return isNaN(n) ? null : n;
}

/**
 * Extrai o owner e o repositório de uma URL do GitHub de forma robusta.
 * Ex: "https://github.com/torvalds/linux" -> { owner: "torvalds", repo: "linux" }
 */
export function extrairGithubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const match = url.trim().match(/github\.com\/([^\/]+)\/([^\/\s\?#]+)/i);
    if (match && match[1] && match[2]) {
      const repo = match[2].replace(/\.git$/, '');
      return { owner: match[1], repo };
    }
  } catch {
    // Ignora falhas de parse
  }
  return null;
}

