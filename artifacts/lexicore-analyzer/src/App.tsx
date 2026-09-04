import { useMemo, useState, type ChangeEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Link, Route, Router as WouterRouter, Switch, useLocation } from 'wouter';
import {
  Activity,
  Archive,
  ArrowDownAZ,
  ArrowRight,
  BookOpen,
  Braces,
  Check,
  ChevronDown,
  CircleAlert,
  Code2,
  Copy,
  Download,
  FileCode2,
  FileText,
  Filter,
  Gauge,
  GitBranch,
  Info,
  LayoutDashboard,
  Library,
  Menu,
  Network,
  Play,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Table2,
  Terminal,
  Upload,
  X,
  Zap,
} from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { analyzeSource, type AnalysisResult } from '@/analyzer';

const queryClient = new QueryClient();

type TokenKind = 'keyword' | 'identifier' | 'operator' | 'literal' | 'delimiter' | 'comment' | 'directive';
type PipelineState = 'complete' | 'ready' | 'idle' | 'running' | 'error';
type Token = { id: number; lexeme: string; kind: TokenKind; line: number; column: number; value: string };
type SymbolEntry = { name: string; type: string; scope: string; line: number; usage: string };

const starterCode = `// LexiCore sample · iterative factorial
int factorial(int n) {
    if (n <= 1) {
        return 1;
    }
    return n * factorial(n - 1);
}

int main() {
    int input = 5;
    int result = factorial(input);
    print(result);
    return 0;
}`;

const pipeline = [
  { name: 'Preprocessor', meta: '01', icon: FileCode2 },
  { name: 'Lexer', meta: '02', icon: Braces },
  { name: 'Validator', meta: '03', icon: ShieldCheck },
  { name: 'Symbols', meta: '04', icon: Table2 },
];

const kindStyles: Record<TokenKind, string> = {
  keyword: 'bg-[#e5ecff] text-[#425dc3] border-[#bdcaf5]',
  identifier: 'bg-[#e0f5f0] text-[#147765] border-[#abdccc]',
  operator: 'bg-[#fff0d5] text-[#9a6310] border-[#f3d59e]',
  literal: 'bg-[#f2e4f7] text-[#7c4f91] border-[#dec6e9]',
  delimiter: 'bg-[#edf0f4] text-[#596474] border-[#d7dde4]',
  comment: 'bg-[#e7f0e9] text-[#4f7460] border-[#cbe0d0]',
  directive: 'bg-[#e4eef8] text-[#3a6a96] border-[#c2d8ea]',
};

function toUiToken(token: AnalysisResult['tokens'][number]): Token {
  return {
    id: token.id,
    lexeme: token.lexeme,
    kind: token.type.toLowerCase() as TokenKind,
    line: token.line,
    column: token.column,
    value: token.value,
  };
}

function IconMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5" data-testid="brand-lexicore">
      <div className="relative grid size-9 place-items-center rounded-[10px] bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar)]">
        <span className="absolute left-2 top-2 h-1.5 w-1.5 rounded-full bg-[hsl(var(--sidebar))]" />
        <span className="absolute bottom-2 right-2 h-1.5 w-1.5 rounded-full bg-[hsl(var(--sidebar))]" />
        <Network className="size-5" strokeWidth={1.8} />
      </div>
      {!compact && (
        <div>
          <div className="font-display text-[15px] font-bold tracking-[-0.02em] text-[hsl(var(--sidebar-foreground))]">LexiCore</div>
          <div className="font-mono-ui text-[9px] uppercase tracking-[0.18em] text-[hsl(var(--sidebar-foreground)/.54)]">intelligent analyzer</div>
        </div>
      )}
    </div>
  );
}

function StatusDot({ state }: { state: PipelineState }) {
  const color = state === 'complete' ? 'bg-[#35b99a]' : state === 'running' ? 'bg-[#e6a63a]' : state === 'error' ? 'bg-[#dc5b54]' : 'bg-[#95a0ad]';
  return <span className={`inline-block size-1.5 rounded-full ${color} ${state === 'running' ? 'animate-pulse' : ''}`} />;
}

function Sidebar({ onClose }: { onClose?: () => void }) {
  const [location] = useLocation();
  const links = [
    { href: '/', label: 'Analyzer', icon: LayoutDashboard },
    { href: '/architecture', label: 'Architecture', icon: GitBranch },
    { href: '/project', label: 'Project brief', icon: Library },
    { href: '/documentation', label: 'Documentation', icon: BookOpen },
  ];
  return (
    <aside className="flex h-full w-[250px] shrink-0 flex-col border-r border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))]" data-testid="sidebar-navigation">
      <div className="flex h-[76px] items-center border-b border-[hsl(var(--sidebar-border))] px-5">
        <Link href="/" onClick={onClose} className="no-underline"><IconMark /></Link>
        {onClose && <button onClick={onClose} className="ml-auto rounded-md p-2 text-[hsl(var(--sidebar-foreground)/.62)] hover:bg-[hsl(var(--sidebar-accent))]" data-testid="button-close-menu"><X className="size-4" /></button>}
      </div>
      <div className="px-3 py-5">
        <div className="mb-2 px-2 font-mono-ui text-[9px] uppercase tracking-[.18em] text-[hsl(var(--sidebar-foreground)/.4)]">Workbench</div>
        <nav className="space-y-1">
          {links.map(({ href, label, icon: NavIcon }) => {
            const active = location === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                data-testid={`link-${label.toLowerCase().replace(' ', '-')}`}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-colors ${active ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-accent-foreground))]' : 'text-[hsl(var(--sidebar-foreground)/.68)] hover:bg-[hsl(var(--sidebar-accent)/.65)] hover:text-[hsl(var(--sidebar-foreground))]'}`}
              >
                <NavIcon className={`size-[16px] ${active ? 'text-[hsl(var(--sidebar-primary))]' : 'text-[hsl(var(--sidebar-foreground)/.46)]'}`} strokeWidth={1.8} />
                {label}
                {active && <span className="ml-auto size-1.5 rounded-full bg-[hsl(var(--sidebar-primary))]" />}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="mt-auto p-4">
        <div className="rounded-xl border border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-accent)/.48)] p-3.5">
          <div className="mb-2 flex items-center gap-2 font-mono-ui text-[10px] uppercase tracking-[.12em] text-[hsl(var(--sidebar-primary))]"><Zap className="size-3.5" /> Local-first</div>
          <p className="text-[11px] leading-relaxed text-[hsl(var(--sidebar-foreground)/.55)]">Your source stays in this workspace. Analysis is inspectable at every stage.</p>
        </div>
        <div className="mt-4 flex items-center justify-between px-1 font-mono-ui text-[9px] text-[hsl(var(--sidebar-foreground)/.36)]">
          <span>CAPSTONE / v0.8.2</span><span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-[#35b99a]" /> ready</span>
        </div>
      </div>
    </aside>
  );
}

function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();
  const current = location === '/' ? 'Analyzer' : location.slice(1).replace('-', ' ');
  return (
    <div className="min-h-[100dvh] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] md:flex">
      <div className={`fixed inset-0 z-40 bg-[hsl(var(--sidebar)/.45)] backdrop-blur-sm transition-opacity md:hidden ${mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`} onClick={() => setMobileOpen(false)} />
      <div className={`fixed inset-y-0 left-0 z-50 transition-transform md:sticky md:top-0 md:block md:h-[100dvh] ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}><Sidebar onClose={() => setMobileOpen(false)} /></div>
      <main className="min-w-0 flex-1 md:ml-0">
        <header className="flex h-[76px] items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--card)/.8)] px-4 sm:px-7">
          <div className="flex items-center gap-3">
            <button className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] md:hidden" onClick={() => setMobileOpen(true)} data-testid="button-open-menu"><Menu className="size-5" /></button>
            <div className="font-mono-ui text-[10px] uppercase tracking-[.15em] text-[hsl(var(--muted-foreground))]"><span className="text-[hsl(var(--primary))]">lexicore</span><span className="mx-2 opacity-40">/</span>{current}</div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="hidden items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.45)] px-3 py-1.5 font-mono-ui text-[10px] text-[hsl(var(--muted-foreground))] sm:flex"><span className="size-1.5 rounded-full bg-[hsl(var(--primary))]" /> session local</span>
            <button className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]" data-testid="button-settings"><Settings2 className="size-4" /></button>
          </div>
        </header>
         <div className="min-h-[calc(100dvh-76px)]">{children}</div>
         <footer className="border-t border-[hsl(var(--border))] bg-[hsl(var(--card)/.55)] px-5 py-6 sm:px-8" data-testid="project-footer">
           <div className="flex flex-col gap-2 text-[10px] leading-5 text-[hsl(var(--muted-foreground))] sm:flex-row sm:items-start sm:justify-between">
             <div><div className="font-mono-ui uppercase tracking-[.12em] text-[hsl(var(--foreground))]">An Intelligent Lexical Analysis And Token Classification System</div><div>Capstone Project · Presented by Tharunesh P (192421272), Sree Sharvesh (192424046), V. Naga Revanth (192411128)</div></div>
             <div className="sm:text-right"><div>Guided by Dr. W. Devi Priya</div><div className="font-mono-ui uppercase tracking-[.12em]">C language support · local analysis</div></div>
           </div>
         </footer>
      </main>
    </div>
  );
}

function SectionTitle({ eyebrow, title, detail }: { eyebrow: string; title: string; detail: string }) {
  return <div className="mb-7 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
    <div><div className="mb-2 font-mono-ui text-[10px] uppercase tracking-[.17em] text-[hsl(var(--primary))]">{eyebrow}</div><h1 className="font-display text-3xl font-bold tracking-[-.04em] text-[hsl(var(--foreground))] sm:text-4xl">{title}</h1></div>
    <p className="max-w-md text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">{detail}</p>
  </div>;
}

function Metric({ label, value, hint, accent = false }: { label: string; value: string; hint: string; accent?: boolean }) {
  return <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4" data-testid={`metric-${label.toLowerCase().replaceAll(' ', '-')}`}>
    <div className="mb-3 flex items-center justify-between"><span className="font-mono-ui text-[9px] uppercase tracking-[.15em] text-[hsl(var(--muted-foreground))]">{label}</span><Activity className={`size-3.5 ${accent ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground)/.65)]'}`} /></div>
    <div className={`font-display text-2xl font-bold tracking-[-.04em] ${accent ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--foreground))]'}`}>{value}</div>
    <div className="mt-1 font-mono-ui text-[10px] text-[hsl(var(--muted-foreground))]">{hint}</div>
  </div>;
}

function PipelineRail({ isRunning, analysis }: { isRunning: boolean; analysis: AnalysisResult }) {
  const details = [
    `${analysis.preprocess.cleanedLines} lines normalized`,
    `${analysis.tokens.length} tokens emitted`,
    analysis.errors.length ? `${analysis.errors.length} errors found` : '0 blocking errors',
    `${analysis.symbols.length} symbols indexed`,
  ];
  const hasError = analysis.errors.length > 0;
  return <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="pipeline-states">
    {pipeline.map(({ name, meta, icon: PipelineIcon }, index) => {
      const state = hasError && index === 2 ? 'error' : isRunning && index === 1 ? 'running' : 'complete';
      return <div key={name} className={`relative rounded-lg border px-3 py-3 transition-colors ${state === 'error' ? 'border-[#eab7b4] bg-[#fff3f1]' : 'border-[hsl(var(--border))] bg-[hsl(var(--card))]'}`}>
        {index < pipeline.length - 1 && <ArrowRight className="absolute -right-3 top-5 z-10 hidden size-3.5 text-[hsl(var(--muted-foreground)/.6)] sm:block" />}
        <div className="mb-2 flex items-center justify-between"><span className="font-mono-ui text-[9px] text-[hsl(var(--muted-foreground))]">{meta}</span><StatusDot state={state} /></div>
        <div className="flex items-center gap-2"><PipelineIcon className={`size-4 ${state === 'error' ? 'text-[#c6504a]' : 'text-[hsl(var(--primary))]'}`} strokeWidth={1.8} /><span className="text-[12px] font-bold">{name}</span></div>
        <div className="mt-1 pl-6 font-mono-ui text-[9px] text-[hsl(var(--muted-foreground))]">{state === 'running' ? 'processing…' : state === 'error' ? 'needs attention' : details[index]}</div>
      </div>;
    })}
  </div>;
}

function CodeEditor({ code, setCode, onUpload, onClear, onExample }: { code: string; setCode: (code: string) => void; onUpload: (event: ChangeEvent<HTMLInputElement>) => void; onClear: () => void; onExample: () => void }) {
  const lines = code.split('\n');
  return <div className="overflow-hidden rounded-xl border border-[hsl(var(--border))] bg-[#17222c] shadow-[0_10px_30px_hsl(222_36%_16%/.08)]" data-testid="source-editor">
    <div className="flex h-11 items-center justify-between border-b border-white/10 px-3.5">
      <div className="flex items-center gap-2"><div className="size-2 rounded-full bg-[#e46b60]" /><div className="size-2 rounded-full bg-[#e7ae4c]" /><div className="size-2 rounded-full bg-[#4ebb91]" /><span className="ml-2 font-mono-ui text-[10px] text-white/45">source.c</span></div>
       <div className="flex items-center gap-1"><button onClick={onExample} className="rounded-md p-1.5 text-white/45 hover:bg-white/10 hover:text-white/80" title="Load example code" data-testid="button-example-code"><FileCode2 className="size-3.5" /></button><label htmlFor="source-upload" className="cursor-pointer rounded-md p-1.5 text-white/45 hover:bg-white/10 hover:text-white/80" title="Upload source file" data-testid="button-upload-source"><Upload className="size-3.5" /></label><input id="source-upload" type="file" accept=".c,.cpp,.txt" className="hidden" onChange={onUpload} /><button onClick={onClear} className="rounded-md p-1.5 text-white/45 hover:bg-white/10 hover:text-white/80" title="Clear source" data-testid="button-clear-source"><X className="size-3.5" /></button><button className="rounded-md p-1.5 text-white/45 hover:bg-white/10 hover:text-white/80" title="Editor settings" data-testid="button-editor-settings"><SlidersHorizontal className="size-3.5" /></button></div>
    </div>
    <div className="relative flex min-h-[350px] max-h-[440px] overflow-auto code-scroll font-mono-ui text-[12px] leading-[1.8]">
      <div className="select-none border-r border-white/10 bg-[#13202a] px-3 py-4 text-right text-[10px] text-white/25">{lines.map((_, index) => <div key={index}>{String(index + 1).padStart(2, '0')}</div>)}</div>
      <textarea value={code} onChange={(event) => setCode(event.target.value)} spellCheck={false} aria-label="Source code editor" data-testid="input-source-code" className="min-h-[350px] flex-1 resize-none bg-transparent px-4 py-4 text-[#d9e7e6] outline-none placeholder:text-white/30" />
    </div>
  </div>;
}

function TokenPanel({ tokens }: { tokens: Token[] }) {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<'all' | TokenKind>('all');
  const [sortAsc, setSortAsc] = useState(true);
  const filtered = useMemo(() => tokens.filter((token) => (kind === 'all' || token.kind === kind) && token.lexeme.toLowerCase().includes(query.toLowerCase())).sort((a, b) => sortAsc ? a.line - b.line : b.line - a.line), [tokens, query, kind, sortAsc]);
  return <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]" data-testid="token-panel">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[hsl(var(--border))] px-4 py-3">
      <div><div className="flex items-center gap-2 text-sm font-bold"><Braces className="size-4 text-[hsl(var(--primary))]" /> Token stream <span className="rounded-full bg-[hsl(var(--muted))] px-2 py-0.5 font-mono-ui text-[9px] text-[hsl(var(--muted-foreground))]">{filtered.length} / {tokens.length}</span></div><p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">Classified output from lexical analysis</p></div>
      <div className="flex items-center gap-1"><button onClick={() => setSortAsc(!sortAsc)} className="rounded-md p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]" title="Sort by line" data-testid="button-sort-tokens"><ArrowDownAZ className={`size-4 transition-transform ${sortAsc ? '' : 'rotate-180'}`} /></button><button onClick={() => { setQuery(''); setKind('all'); }} className="rounded-md p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]" title="Reset token filters" data-testid="button-reset-token-filters"><RefreshCw className="size-4" /></button></div>
    </div>
    <div className="flex flex-wrap gap-2 border-b border-[hsl(var(--border))] p-3">
      <div className="relative min-w-[180px] flex-1"><Search className="absolute left-2.5 top-2.5 size-3.5 text-[hsl(var(--muted-foreground))]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search lexemes…" className="h-8 w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--muted)/.42)] pl-8 pr-2 text-[11px] outline-none focus:border-[hsl(var(--ring))]" data-testid="input-token-search" /></div>
      <div className="relative"><Filter className="pointer-events-none absolute left-2.5 top-2.5 size-3.5 text-[hsl(var(--muted-foreground))]" /><select value={kind} onChange={(event) => setKind(event.target.value as 'all' | TokenKind)} className="h-8 appearance-none rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--muted)/.42)] pl-8 pr-7 text-[11px] outline-none focus:border-[hsl(var(--ring))]" data-testid="select-token-kind"><option value="all">All classes</option>{Object.keys(kindStyles).map((item) => <option key={item} value={item}>{item}</option>)}</select><ChevronDown className="pointer-events-none absolute right-2 top-2.5 size-3.5 text-[hsl(var(--muted-foreground))]" /></div>
    </div>
    <div className="max-h-[280px] overflow-auto thin-scroll"><table className="w-full text-left"><thead className="sticky top-0 bg-[hsl(var(--card))]"><tr className="font-mono-ui text-[9px] uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]"><th className="px-4 py-2 font-medium">lexeme</th><th className="px-2 py-2 font-medium">class</th><th className="px-2 py-2 text-right font-medium">line</th><th className="px-4 py-2 text-right font-medium">column</th></tr></thead><tbody>{filtered.map((token) => <tr key={token.id} className="border-t border-[hsl(var(--border)/.65)] text-[11px] hover:bg-[hsl(var(--muted)/.45)]" data-testid={`row-token-${token.id}`}><td className="px-4 py-2 font-mono-ui font-medium text-[hsl(var(--foreground))]">{token.lexeme}</td><td className="px-2 py-2"><span className={`rounded border px-1.5 py-0.5 font-mono-ui text-[9px] ${kindStyles[token.kind]}`}>{token.kind}</span></td><td className="px-2 py-2 text-right font-mono-ui text-[hsl(var(--muted-foreground))]">{token.line}</td><td className="px-4 py-2 text-right font-mono-ui text-[hsl(var(--muted-foreground))]">{token.column}</td></tr>)}</tbody></table>{filtered.length === 0 && <div className="px-4 py-8 text-center text-xs text-[hsl(var(--muted-foreground))]">No tokens match this filter.</div>}</div>
  </div>;
}

function FinalTokenTable({ tokens, onCopy }: { tokens: Token[]; onCopy: () => void }) {
  return <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]" data-testid="final-token-stream">
    <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-4 py-3">
      <div><div className="flex items-center gap-2 text-sm font-bold"><Check className="size-4 text-[hsl(var(--primary))]" /> Final validated token stream</div><p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">Only valid lexemes are emitted for the next compiler phase.</p></div>
      <button onClick={onCopy} className="rounded-md p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]" title="Copy token stream" data-testid="button-copy-token-stream"><Copy className="size-3.5" /></button>
    </div>
    <div className="max-h-[250px] overflow-auto thin-scroll"><table className="w-full min-w-[510px] text-left"><thead className="sticky top-0 bg-[hsl(var(--card))]"><tr className="font-mono-ui text-[9px] uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]"><th className="px-4 py-2 font-medium">#</th><th className="px-2 py-2 font-medium">line</th><th className="px-2 py-2 font-medium">lexeme</th><th className="px-2 py-2 font-medium">type</th><th className="px-4 py-2 text-right font-medium">status</th></tr></thead><tbody>{tokens.map((token, index) => <tr key={`final-${token.id}`} className="border-t border-[hsl(var(--border)/.65)] text-[11px]"><td className="px-4 py-2 font-mono-ui text-[hsl(var(--muted-foreground))]">{index + 1}</td><td className="px-2 py-2 font-mono-ui text-[hsl(var(--muted-foreground))]">{token.line}</td><td className="px-2 py-2 font-mono-ui font-medium">{token.lexeme}</td><td className="px-2 py-2"><span className={`rounded border px-1.5 py-0.5 font-mono-ui text-[9px] ${kindStyles[token.kind]}`}>{token.kind}</span></td><td className="px-4 py-2 text-right font-mono-ui text-[9px] text-[hsl(var(--primary))]">valid</td></tr>)}</tbody></table>{tokens.length === 0 && <div className="p-6 text-center text-xs text-[hsl(var(--muted-foreground))]">No valid tokens emitted yet.</div>}</div>
  </div>;
}

function Results({ analysis, status }: { analysis: AnalysisResult; status: 'idle' | 'running' | 'complete' | 'error' }) {
  const tokens = analysis.tokens.map(toUiToken);
  const errors = analysis.errors;
  const symbols = analysis.symbols.map((symbol) => ({
    name: symbol.identifier,
    type: symbol.type,
    scope: 'source',
    line: symbol.line,
    usage: symbol.value,
  }));
  const count = (kind: TokenKind) => tokens.filter((token) => token.kind === kind).length;
  const hasError = errors.length > 0;
  const tokenLines = tokens.slice(0, 12);
  const copyValidated = async () => {
    await navigator.clipboard?.writeText(tokens.map((token, index) => `${index + 1}\t${token.line}\t${token.lexeme}\t${token.kind}\tvalid`).join('\n'));
  };
  return <div className="space-y-4">
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Metric label="Tokens" value={status === 'running' ? '—' : String(tokens.length)} hint={`${count('keyword')} keywords · ${count('identifier')} identifiers`} accent /><Metric label="Errors" value={hasError ? String(errors.length) : '0'} hint={hasError ? 'review required' : 'blocking issues'} /><Metric label="Symbols" value={status === 'running' ? '—' : String(symbols.length)} hint="source identifiers" /><Metric label="Lines" value={String(analysis.preprocess.cleanedLines)} hint={`${analysis.preprocess.commentsRemoved} comments removed`} /></div>
     <TokenPanel tokens={tokens} />
     <FinalTokenTable tokens={tokens} onCopy={copyValidated} />
    <div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
      <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]" data-testid="validated-output">
        <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-4 py-3"><div><div className="flex items-center gap-2 text-sm font-bold"><Check className="size-4 text-[hsl(var(--primary))]" /> Validated output</div><p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">Canonical stream after validation</p></div><button className="rounded-md p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]" title="Copy validated stream" data-testid="button-copy-output"><Copy className="size-3.5" /></button></div>
         <div className="m-3 rounded-lg bg-[#17222c] p-3.5 font-mono-ui text-[10px] leading-6 text-[#bfd1d4]"><div><span className="text-[#68c5ae]">{hasError ? 'PARTIAL' : 'VALID'}</span><span className="mx-2 text-white/30">·</span>{hasError ? 'invalid lexemes excluded from final output' : 'sequence integrity confirmed'}</div><div><span className="text-white/45">schema</span> token.v1 <span className="text-white/45">/ valid</span> {tokens.length} <span className="text-white/45">/ analysis</span> {analysis.processingTimeMs} ms</div><div className="mt-2 border-t border-white/10 pt-2 text-white/45">{tokenLines.map((token) => `${token.lexeme} → ${token.kind}`).join('  ·  ') || 'No validated tokens emitted.'}</div></div>
      </div>
      <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]" data-testid="error-list">
         <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] px-4 py-3 text-sm font-bold"><CircleAlert className={`size-4 ${hasError ? 'text-[#c6504a]' : 'text-[hsl(var(--muted-foreground))]'}`} /> Diagnostics <span className="ml-auto rounded-full bg-[hsl(var(--muted))] px-2 py-0.5 font-mono-ui text-[9px] text-[hsl(var(--muted-foreground))]">{errors.length}</span></div>
         {hasError ? <div className="max-h-[190px] space-y-2 overflow-auto p-3">{errors.map((error) => <div key={error.id} className="rounded-lg border border-[#edc1bd] bg-[#fff4f2] p-3 text-[11px] text-[#91443f]"><div className="font-bold">{error.errorType}</div><div className="mt-1">Line {error.line}, column {error.column} — {error.description}</div><div className="mt-1 font-mono-ui">lexeme: {error.lexeme || '∅'}</div></div>)}</div> : <div className="flex items-center gap-3 p-5 text-[11px] text-[hsl(var(--muted-foreground))]"><Check className="size-4 text-[hsl(var(--primary))]" /> No lexical errors detected.</div>}
      </div>
    </div>
    <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]" data-testid="symbol-table">
      <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-4 py-3"><div><div className="flex items-center gap-2 text-sm font-bold"><Table2 className="size-4 text-[hsl(var(--primary))]" /> Symbol table</div><p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">Names resolved with scope and inferred role</p></div><button className="rounded-md p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]" title="Export symbols" data-testid="button-export-symbols"><Download className="size-3.5" /></button></div>
       <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left"><thead><tr className="font-mono-ui text-[9px] uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]"><th className="px-4 py-2 font-medium">identifier</th><th className="px-2 py-2 font-medium">type</th><th className="px-2 py-2 font-medium">scope</th><th className="px-2 py-2 font-medium">line</th><th className="px-4 py-2 text-right font-medium">value</th></tr></thead><tbody>{symbols.map((symbol) => <tr key={`${symbol.name}-${symbol.line}`} className="border-t border-[hsl(var(--border)/.65)] text-[11px] hover:bg-[hsl(var(--muted)/.45)]"><td className="px-4 py-2.5 font-mono-ui font-medium text-[hsl(var(--primary))]">{symbol.name}</td><td className="px-2 py-2.5">{symbol.type}</td><td className="px-2 py-2.5 font-mono-ui text-[hsl(var(--muted-foreground))]">{symbol.scope}</td><td className="px-2 py-2.5 font-mono-ui text-[hsl(var(--muted-foreground))]">{symbol.line}</td><td className="px-4 py-2.5 text-right text-[hsl(var(--muted-foreground))]">{symbol.usage}</td></tr>)}</tbody></table>{symbols.length === 0 && <div className="p-6 text-center text-xs text-[hsl(var(--muted-foreground))]">No typed declarations found in this source.</div>}</div>
    </div>
  </div>;
}

function Analyzer() {
  const [code, setCode] = useState(starterCode);
  const [analysis, setAnalysis] = useState<AnalysisResult>(() => analyzeSource(starterCode));
  const [status, setStatus] = useState<'idle' | 'running' | 'complete' | 'error'>('complete');
  const [activeView, setActiveView] = useState<'results' | 'preprocessed'>('results');
  const [copied, setCopied] = useState(false);
  const preprocess = analysis.cleanedSource;
  const runAnalysis = () => {
    setStatus('running');
    window.setTimeout(() => {
      const nextAnalysis = analyzeSource(code);
      setAnalysis(nextAnalysis);
      setStatus(nextAnalysis.errors.length ? 'error' : 'complete');
    }, 520);
  };
  const resetSource = () => {
    setCode(starterCode);
    setAnalysis(analyzeSource(starterCode));
    setStatus('complete');
  };
  const clearSource = () => {
    setCode('');
    setAnalysis(analyzeSource(''));
    setStatus('idle');
  };
  const copyCode = async () => {
    await navigator.clipboard?.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };
  const exportReport = () => {
    const payload = JSON.stringify({ source: code, preprocessed: preprocess, ...analysis }, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'lexicore-analysis.json'; anchor.click(); URL.revokeObjectURL(url);
  };
  const uploadSource = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setCode(String(reader.result ?? '')); setStatus('idle'); };
    reader.readAsText(file);
  };
  return <div className="mx-auto max-w-[1500px] p-4 sm:p-7">
     <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
       <div><div className="mb-2 flex items-center gap-2 font-mono-ui text-[10px] uppercase tracking-[.16em] text-[hsl(var(--primary))]"><span className="size-1.5 rounded-full bg-[hsl(var(--primary))]" /> analysis workspace</div><h1 className="font-display text-3xl font-bold tracking-[-.045em] sm:text-[38px]">Intelligent Lexical Analyzer<span className="text-[hsl(var(--primary))]">.</span></h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">Analyze, classify, and validate source code efficiently. Trace every transformation into inspectable compiler evidence.</p></div>
       <div className="flex flex-wrap items-center gap-2"><button onClick={copyCode} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 text-[11px] font-bold hover:bg-[hsl(var(--muted))]" data-testid="button-copy-source">{copied ? <Check className="size-3.5 text-[hsl(var(--primary))]" /> : <Copy className="size-3.5" />}{copied ? 'Copied' : 'Copy source'}</button><button onClick={exportReport} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 text-[11px] font-bold hover:bg-[hsl(var(--muted))]" data-testid="button-export-report"><Download className="size-3.5" /> Export report</button><button onClick={resetSource} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 text-[11px] font-bold hover:bg-[hsl(var(--muted))]" data-testid="button-reset-source"><RefreshCw className="size-3.5" /> Reset</button><button onClick={runAnalysis} disabled={status === 'running'} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-3.5 text-[11px] font-bold text-[hsl(var(--primary-foreground))] shadow-sm hover:brightness-105 disabled:opacity-60" data-testid="button-run-analysis"><Play className="size-3.5 fill-current" />{status === 'running' ? 'Analyzing…' : 'Analyze Source Code'}</button></div>
    </div>
     <PipelineRail isRunning={status === 'running'} analysis={analysis} />
    <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(340px,.77fr)_minmax(580px,1.23fr)]">
      <section className="space-y-3">
        <div className="flex items-center justify-between"><div><div className="flex items-center gap-2 text-sm font-bold"><Terminal className="size-4 text-[hsl(var(--primary))]" /> Source editor</div><p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">C-like input · local session</p></div><span className="font-mono-ui text-[9px] text-[hsl(var(--muted-foreground))]">{code.split('\n').length} lines</span></div>
         <CodeEditor code={code} setCode={(value) => { setCode(value); setStatus('idle'); }} onUpload={uploadSource} onClear={clearSource} onExample={resetSource} />
        <div className="grid grid-cols-2 gap-2"><div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3"><div className="mb-1 flex items-center gap-2 font-mono-ui text-[9px] uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]"><Archive className="size-3" /> Original</div><div className="font-mono-ui text-[11px] font-medium">{code.length} chars</div></div><div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3"><div className="mb-1 flex items-center gap-2 font-mono-ui text-[9px] uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]"><FileText className="size-3" /> Preprocessed</div><div className="font-mono-ui text-[11px] font-medium">{preprocess.length} chars</div></div></div>
      </section>
       <section className="min-w-0">
        <div className="mb-3 flex items-center justify-between"><div><div className="flex items-center gap-2 text-sm font-bold"><Gauge className="size-4 text-[hsl(var(--primary))]" /> Analysis surface</div><p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">Results remain attached to this source revision</p></div><div className="flex rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-0.5"><button onClick={() => setActiveView('results')} className={`rounded-md px-2.5 py-1.5 text-[10px] font-bold ${activeView === 'results' ? 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))]'}`} data-testid="button-view-results">Results</button><button onClick={() => setActiveView('preprocessed')} className={`rounded-md px-2.5 py-1.5 text-[10px] font-bold ${activeView === 'preprocessed' ? 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))]'}`} data-testid="button-view-preprocessed">Preprocessed</button></div></div>
         {activeView === 'preprocessed' ? <div className="scanline min-h-[640px] rounded-xl border border-[hsl(var(--border))] bg-[#17222c] p-5 font-mono-ui text-[11px] leading-6 text-[#c3d5d5]" data-testid="preprocessed-output"><div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3 text-[10px] text-white/45"><span>PREPROCESSOR OUTPUT / NORMALIZED</span><span>{analysis.preprocess.cleanedLines} lines · {analysis.preprocess.commentsRemoved} comments removed</span></div>{(preprocess || 'No meaningful source lines remain after preprocessing.').split('\n').map((line, index) => <div key={index}><span className="mr-4 inline-block w-5 text-right text-white/25">{index + 1}</span>{line || ' '}</div>)}</div> : status === 'idle' ? <div className="grid min-h-[640px] place-items-center rounded-xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card)/.5)] p-8 text-center" data-testid="empty-analysis-state"><div><div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-[hsl(var(--muted))] text-[hsl(var(--primary))]"><Play className="size-5" /></div><div className="font-display text-lg font-bold">Ready for a fresh pass</div><p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">The source changed. Run analysis to refresh tokens, diagnostics, and symbols.</p><button onClick={runAnalysis} className="mt-4 rounded-lg bg-[hsl(var(--primary))] px-3.5 py-2 text-[11px] font-bold text-[hsl(var(--primary-foreground))]" data-testid="button-run-empty-analysis">Run analysis</button></div></div> : status === 'running' ? <div className="space-y-3" data-testid="loading-analysis-state">{[1, 2, 3, 4].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]" />)}</div> : <Results analysis={analysis} status={status} />}
      </section>
    </div>
  </div>;
}

function Architecture() {
  const modules = [
    { no: '01', title: 'Preprocessing', icon: FileCode2, color: '#2c9b83', copy: 'Normalizes the input surface without losing the original source. Comments and whitespace are represented as traceable transformations.', output: 'normalized source' },
    { no: '02', title: 'Lexical analysis', icon: Braces, color: '#5471c6', copy: 'Scans left to right, recognizing lexemes and assigning token classes with line and column coordinates.', output: 'classified tokens' },
    { no: '03', title: 'Validation & symbols', icon: ShieldCheck, color: '#bd7a21', copy: 'Checks stream integrity, reports diagnostics, then indexes names with scope and inferred role for review.', output: 'evidence set' },
  ];
  return <div className="mx-auto max-w-[1180px] p-5 sm:p-10"><SectionTitle eyebrow="System map / 03 modules" title="A visible pipeline." detail="LexiCore makes each compiler step inspectable. Nothing important is collapsed into a single result card." /><div className="grid gap-4 lg:grid-cols-3">{modules.map((module, index) => <div key={module.title} className="relative overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6" data-testid={`architecture-module-${module.no}`}><div className="mb-12 flex items-start justify-between"><span className="font-mono-ui text-[11px] text-[hsl(var(--muted-foreground))]">{module.no}</span><div className="grid size-10 place-items-center rounded-xl" style={{ background: `${module.color}18`, color: module.color }}><module.icon className="size-5" /></div></div><h2 className="font-display text-xl font-bold tracking-[-.03em]">{module.title}</h2><p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{module.copy}</p><div className="mt-8 flex items-center gap-2 border-t border-[hsl(var(--border))] pt-3 font-mono-ui text-[10px]" style={{ color: module.color }}><ArrowRight className="size-3.5" /> emits {module.output}</div>{index < 2 && <div className="absolute -right-3 top-1/2 z-10 hidden rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-1.5 lg:block"><ArrowRight className="size-3 text-[hsl(var(--muted-foreground))]" /></div>}</div>)}</div><div className="mt-5 rounded-2xl border border-[hsl(var(--border))] bg-[#17222c] p-5 text-[#d1dfdf]"><div className="mb-4 flex items-center justify-between font-mono-ui text-[10px] text-white/45"><span>TRACE / MODULE CONTRACT</span><span>local-first runtime</span></div><div className="flex flex-col gap-3 font-mono-ui text-[11px] sm:flex-row sm:items-center sm:justify-between"><span><b className="text-[#6bc4ad]">source</b> → preprocess</span><ArrowRight className="hidden size-4 text-white/30 sm:block" /><span><b className="text-[#88a5ee]">lexemes</b> → classify</span><ArrowRight className="hidden size-4 text-white/30 sm:block" /><span><b className="text-[#e3b25f]">evidence</b> → validate / index</span></div></div></div>;
}

function Project() {
  return <div className="mx-auto max-w-[1100px] p-5 sm:p-10"><SectionTitle eyebrow="Capstone context / about the build" title="A compiler tool made for review." detail="LexiCore is a focused workbench for students building language tooling—and evaluators who need to see how it works." /><div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]"><div className="grid-paper rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 sm:p-9"><div className="font-mono-ui text-[10px] uppercase tracking-[.16em] text-[hsl(var(--primary))]">The premise</div><h2 className="mt-5 max-w-xl font-display text-3xl font-bold leading-tight tracking-[-.045em]">Good compiler work should leave a trail.</h2><p className="mt-5 max-w-xl text-sm leading-7 text-[hsl(var(--muted-foreground))]">A capstone compiler is more than a final output. Its value is in the decisions between input and output: what was removed, what was recognized, what was rejected, and what names were understood.</p><p className="mt-4 max-w-xl text-sm leading-7 text-[hsl(var(--muted-foreground))]">LexiCore gives those decisions a calm, inspectable surface. Students can debug their implementation. Evaluators can follow the evidence.</p><div className="mt-8 flex items-center gap-3 border-t border-[hsl(var(--border))] pt-5"><div className="grid size-8 place-items-center rounded-lg bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-primary))]"><Code2 className="size-4" /></div><div><div className="text-xs font-bold">Compiler Construction Capstone</div><div className="font-mono-ui text-[10px] text-[hsl(var(--muted-foreground))]">2024–25 · local evaluation surface</div></div></div></div><div className="space-y-4"><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6"><div className="mb-5 flex items-center gap-2 text-sm font-bold"><TargetIcon /> Objectives</div><ul className="space-y-4 text-sm text-[hsl(var(--muted-foreground))]">{['Make preprocessing observable, not magical.', 'Classify tokens with useful coordinates.', 'Report errors with enough context to act.', 'Connect symbols back to source scope.'].map((item, index) => <li key={item} className="flex gap-3"><span className="font-mono-ui text-[10px] text-[hsl(var(--primary))]">0{index + 1}</span><span>{item}</span></li>)}</ul></div><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.38)] p-6"><div className="mb-2 font-mono-ui text-[10px] uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]">Built for two readers</div><div className="grid grid-cols-2 gap-4"><div><div className="text-sm font-bold">Students</div><p className="mt-1 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">Inspect, iterate, and explain.</p></div><div><div className="text-sm font-bold">Evaluators</div><p className="mt-1 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">Trace, verify, and assess.</p></div></div></div></div></div></div>;
}

function TargetIcon() { return <div className="grid size-7 place-items-center rounded-md bg-[hsl(var(--primary)/.12)] text-[hsl(var(--primary))]"><CircleAlert className="size-4" /></div>; }

function Documentation() {
  const docs = [
    { icon: FileCode2, title: 'Preprocessing', copy: 'A deterministic pass that prepares source for scanning. It strips or normalizes non-semantic surface details while preserving enough context to explain the change.' },
    { icon: Braces, title: 'Tokens & lexemes', copy: 'A lexeme is the smallest meaningful sequence in source. LexiCore records its class, value, line, and column so each token can be traced back to input.' },
    { icon: CircleAlert, title: 'Errors & diagnostics', copy: 'Diagnostics are attached to a location and a reason. Blocking errors stop validation; the workbench keeps the rest of the evidence visible for debugging.' },
    { icon: Table2, title: 'Symbol tables', copy: 'Symbols map names to inferred roles and scopes. This makes declarations and references reviewable without requiring a hidden runtime.' },
    { icon: GitBranch, title: 'Module flow', copy: 'Source enters preprocessing, moves into lexical analysis, then reaches validation and symbol indexing. Each module emits an inspectable artifact.' },
    { icon: ShieldCheck, title: 'Validated output', copy: 'The validated stream is the canonical handoff: ordered, classified, and checked for unresolved references before it becomes evidence.' },
  ];
  return <div className="mx-auto max-w-[1180px] p-5 sm:p-10"><SectionTitle eyebrow="Reference / concise explainers" title="Read the evidence." detail="Short definitions for the concepts surfaced in the analyzer. Start with the module flow, then inspect a real source revision." /><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{docs.map(({ icon: DocIcon, title, copy }, index) => <article key={title} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 transition-transform hover:-translate-y-0.5" data-testid={`doc-card-${index}`}><div className="mb-7 flex items-center justify-between"><div className="grid size-9 place-items-center rounded-lg bg-[hsl(var(--muted))] text-[hsl(var(--primary))]"><DocIcon className="size-4" /></div><span className="font-mono-ui text-[9px] text-[hsl(var(--muted-foreground))]">0{index + 1}</span></div><h2 className="font-display text-base font-bold">{title}</h2><p className="mt-2 text-[12px] leading-6 text-[hsl(var(--muted-foreground))]">{copy}</p></article>)}</div><div className="mt-5 flex flex-col gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><Info className="mt-0.5 size-4 shrink-0 text-[hsl(var(--primary))]" /><div><div className="text-sm font-bold">A note on implementation</div><p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">The analyzer surface is intentionally local-first. Connect your supplied analysis state to the existing panels; no server contract is required.</p></div></div><Link href="/" className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[hsl(var(--sidebar))] px-3.5 py-2 text-[11px] font-bold text-[hsl(var(--sidebar-foreground))]" data-testid="link-open-analyzer">Open analyzer <ArrowRight className="size-3.5" /></Link></div></div>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Router() {
  return <RoutedErrorBoundary><AppShell><Switch><Route path="/" component={Analyzer} /><Route path="/architecture" component={Architecture} /><Route path="/project" component={Project} /><Route path="/documentation" component={Documentation} /><Route component={NotFound} /></Switch></AppShell></RoutedErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;