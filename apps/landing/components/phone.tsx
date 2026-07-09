import {
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  ChartPie,
  Check,
  Clapperboard,
  House,
  Lock,
  Plus,
  ReceiptText,
  Search,
  Settings,
  Store,
  TrainFront,
  Utensils,
  X
} from "lucide-react";

const tabs = [House, ReceiptText, ChartPie, Settings];

/* One phone shell, many screens. Everything inside is driven by the shared
   design tokens, so every mockup flips to dark mode with the page. */
export function PhoneFrame({
  children,
  activeTab = 0,
  float = false,
  className = ""
}: {
  children: React.ReactNode;
  activeTab?: number;
  float?: boolean;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      lang="en"
      className={`${float ? "animate-phone-float " : ""}mx-auto w-[300px] rounded-[3rem] border border-white/40 bg-ink/90 p-[10px] sm:w-[320px] ${className}`}
      style={{ boxShadow: "var(--shadow-lift), 0 40px 90px rgb(var(--river) / 0.22)" }}
    >
      <div className="liquid-ui relative overflow-hidden rounded-[2.4rem] bg-paper">
        {/* status bar + dynamic island */}
        <div className="relative flex items-center justify-between px-7 pb-1 pt-3 text-[11px] font-semibold text-ink/80">
          <span className="tnum">9:41</span>
          <span className="absolute left-1/2 top-2.5 h-[22px] w-[84px] -translate-x-1/2 rounded-full bg-ink/90" />
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-3 rounded-[2px] bg-ink/60" />
            <span className="inline-block h-2.5 w-5 rounded-[3px] border border-ink/50 p-[1.5px]">
              <span className="block h-full w-3/4 rounded-[1px] bg-moss" />
            </span>
          </span>
        </div>

        {children}

        {/* floating glass tab bar */}
        <div className="liquid-topbar absolute bottom-3 left-1/2 z-10 flex w-[86%] -translate-x-1/2 items-center justify-between rounded-full px-5 py-2.5">
          {tabs.map((Icon, i) =>
            i === activeTab ? (
              <span
                key={i}
                className="grid place-items-center rounded-full bg-river/10 px-3 py-1.5 text-river"
              >
                <Icon size={16} />
              </span>
            ) : (
              <span key={i} className="text-ink/45">
                <Icon size={16} />
              </span>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function ScreenHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-display text-[15px] font-bold">{title}</p>
        <p className="text-[10px] uppercase tracking-wide text-ink/45">{sub}</p>
      </div>
      <span className="grid h-8 w-8 place-items-center rounded-full bg-river/10 text-river">
        <Plus size={15} strokeWidth={2.5} />
      </span>
    </div>
  );
}

/* ---- Dashboard --------------------------------------------------------- */

const categories = [
  { name: "Food & drinks", amount: "฿9,840", pct: 76, tone: "bg-coral" },
  { name: "Transport", amount: "฿3,120", pct: 48, tone: "bg-river" },
  { name: "Groceries", amount: "฿4,560", pct: 62, tone: "bg-moss" },
  { name: "Rent & bills", amount: "฿12,000", pct: 100, tone: "bg-amber" }
];

export function DashboardScreen() {
  return (
    <div className="space-y-3 px-4 pb-24 pt-2">
      <ScreenHeader title="Dashboard" sub="July 2026" />

      <div className="grid grid-cols-2 gap-2">
        <div className="liquid-panel border p-3">
          <span className="mb-1.5 grid h-6 w-6 place-items-center rounded-full bg-moss/10 text-moss">
            <ArrowDownCircle size={13} />
          </span>
          <p className="text-[9px] uppercase tracking-wide text-ink/45">Income</p>
          <p className="tnum text-[15px] font-bold">฿48,200</p>
          <p className="text-[9px] font-medium text-moss">+8.4% vs last month</p>
        </div>
        <div className="liquid-panel border p-3">
          <span className="mb-1.5 grid h-6 w-6 place-items-center rounded-full bg-coral/10 text-coral">
            <ArrowUpCircle size={13} />
          </span>
          <p className="text-[9px] uppercase tracking-wide text-ink/45">Expenses</p>
          <p className="tnum text-[15px] font-bold">฿32,540</p>
          <p className="text-[9px] font-medium text-coral">-3.1% vs last month</p>
        </div>
      </div>

      <div className="liquid-panel border p-3">
        <div className="mb-2 flex items-baseline justify-between">
          <p className="text-[11px] font-semibold">Spending pace</p>
          <p className="text-[9px] uppercase tracking-wide text-ink/45">This month</p>
        </div>
        <svg viewBox="0 0 240 90" className="h-20 w-full text-coral">
          <defs>
            <linearGradient id="mockSpend" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="currentColor" stopOpacity="0.32" />
              <stop offset="95%" stopColor="currentColor" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {[18, 36, 54, 72].map((y) => (
            <line
              key={y}
              x1="0"
              x2="240"
              y1={y}
              y2={y}
              stroke="rgb(var(--ink) / 0.08)"
              strokeDasharray="3 3"
            />
          ))}
          <path
            d="M0,74 C24,68 38,70 54,58 C70,46 86,54 102,46 C118,38 134,50 150,38 C166,26 184,34 202,22 C218,14 230,18 240,10 L240,90 L0,90 Z"
            fill="url(#mockSpend)"
          />
          <path
            d="M0,74 C24,68 38,70 54,58 C70,46 86,54 102,46 C118,38 134,50 150,38 C166,26 184,34 202,22 C218,14 230,18 240,10"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <div className="liquid-panel border p-3">
        <p className="mb-2 text-[11px] font-semibold">Category mix</p>
        <div className="space-y-2">
          {categories.map((cat) => (
            <div key={cat.name}>
              <div className="mb-1 flex items-center justify-between text-[10px]">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className={`h-1.5 w-1.5 rounded-full ${cat.tone}`} />
                  {cat.name}
                </span>
                <span className="tnum text-ink/60">{cat.amount}</span>
              </div>
              <div className="h-1.5 rounded-full bg-ink/10">
                <div
                  className={`h-full rounded-full ${cat.tone}`}
                  style={{ width: `${cat.pct}%`, opacity: 0.85 }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---- Transactions ------------------------------------------------------ */

const txGroups = [
  {
    label: "Today",
    rows: [
      { icon: Utensils, tone: "bg-coral/10 text-coral", name: "Lunch noodles", cat: "Food & drinks", amount: "-฿120" },
      { icon: TrainFront, tone: "bg-river/10 text-river", name: "BTS fare", cat: "Transport", amount: "-฿62" },
      { icon: Store, tone: "bg-amber/10 text-amber", name: "7-Eleven", cat: "Groceries", amount: "-฿89" }
    ]
  },
  {
    label: "Yesterday",
    rows: [
      { icon: Banknote, tone: "bg-moss/10 text-moss", name: "Salary", cat: "Income", amount: "+฿48,200", income: true },
      { icon: Clapperboard, tone: "bg-coral/10 text-coral", name: "Netflix", cat: "Subscriptions", amount: "-฿419" }
    ]
  }
];

export function TransactionsScreen() {
  return (
    <div className="space-y-3 px-4 pb-24 pt-2">
      <ScreenHeader title="Transactions" sub="July 2026" />

      <div className="flex items-center gap-2 rounded-full border border-ink/10 bg-white px-3 py-2 text-[10px] text-ink/40">
        <Search size={11} />
        Search transactions…
      </div>

      {txGroups.map((group) => (
        <div key={group.label} className="liquid-panel border p-3">
          <p className="mb-2 text-[9px] uppercase tracking-wide text-ink/45">{group.label}</p>
          <div className="space-y-2.5">
            {group.rows.map((row) => (
              <div key={row.name} className="flex items-center gap-2.5">
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${row.tone}`}>
                  <row.icon size={14} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-semibold">{row.name}</span>
                  <span className="block text-[9px] text-ink/45">{row.cat}</span>
                </span>
                <span
                  className={`tnum text-[11px] font-bold ${row.income ? "text-moss" : "text-ink/80"}`}
                >
                  {row.amount}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---- Reports ----------------------------------------------------------- */

const bars = [
  { month: "F", value: 58 },
  { month: "M", value: 72 },
  { month: "A", value: 44 },
  { month: "M", value: 84 },
  { month: "J", value: 66 },
  { month: "J", value: 92, active: true }
];

export function ReportsScreen() {
  return (
    <div className="space-y-3 px-4 pb-24 pt-2">
      <ScreenHeader title="Reports" sub="Last 6 months" />

      <div className="flex gap-1 rounded-full border border-ink/10 bg-white p-1 text-[9px] font-semibold">
        <span className="rounded-full bg-river px-3 py-1 text-bright">Month</span>
        <span className="px-3 py-1 text-ink/50">6M</span>
        <span className="px-3 py-1 text-ink/50">Year</span>
      </div>

      <div className="liquid-panel border p-3">
        <div className="mb-2 flex items-baseline justify-between">
          <p className="text-[11px] font-semibold">Spending by month</p>
          <p className="tnum text-[10px] font-bold text-river">฿32,540</p>
        </div>
        <svg viewBox="0 0 240 110" className="h-24 w-full">
          {bars.map((bar, i) => {
            const height = bar.value;
            const x = 10 + i * 39;
            return (
              <g key={i}>
                <rect
                  x={x}
                  y={96 - height}
                  width="24"
                  height={height}
                  rx="6"
                  fill={bar.active ? "rgb(var(--river))" : "rgb(var(--ink) / 0.12)"}
                />
                <text
                  x={x + 12}
                  y={108}
                  textAnchor="middle"
                  fontSize="9"
                  fill="rgb(var(--ink) / 0.45)"
                >
                  {bar.month}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="liquid-panel border p-3">
        <p className="mb-2 text-[11px] font-semibold">Top categories</p>
        <div className="space-y-2">
          {categories.slice(0, 3).map((cat) => (
            <div key={cat.name} className="flex items-center justify-between text-[10px]">
              <span className="flex items-center gap-1.5 font-medium">
                <span className={`h-1.5 w-1.5 rounded-full ${cat.tone}`} />
                {cat.name}
              </span>
              <span className="tnum font-semibold text-ink/70">{cat.amount}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="liquid-panel border p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[9px] uppercase tracking-wide text-ink/45">Net this month</p>
            <p className="tnum text-[15px] font-bold text-moss">+฿15,660</p>
          </div>
          <span className="grid h-8 w-8 place-items-center rounded-full bg-moss/10 text-moss">
            <ArrowDownCircle size={15} />
          </span>
        </div>
      </div>
    </div>
  );
}

/* ---- Quick-add sheet (overlaid on a screen by the pinned scene) --------- */

export function QuickAddSheet() {
  return (
    <div className="liquid-panel rounded-t-[1.6rem] border border-b-0 p-4 pb-16">
      <span className="mx-auto mb-3 block h-1 w-9 rounded-full bg-ink/15" />
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[12px] font-bold">Add expense</p>
        <span className="grid h-6 w-6 place-items-center rounded-full bg-ink/10 text-ink/50">
          <X size={12} />
        </span>
      </div>
      <p className="tnum mb-3 text-center text-3xl font-bold">
        ฿120<span className="text-ink/30">.00</span>
      </p>
      <div className="mb-3 flex flex-wrap gap-1.5 text-[9px] font-semibold">
        <span className="flex items-center gap-1 rounded-full border border-coral/25 bg-coral/10 px-2.5 py-1 text-coral">
          <Utensils size={10} />
          Food & drinks
        </span>
        <span className="rounded-full border border-ink/10 px-2.5 py-1 text-ink/50">Transport</span>
        <span className="rounded-full border border-ink/10 px-2.5 py-1 text-ink/50">Groceries</span>
      </div>
      <div className="mb-3 rounded-xl border border-ink/10 bg-white px-3 py-2 text-[10px] text-ink/60">
        Lunch noodles
      </div>
      <div className="rounded-full bg-river py-2.5 text-center text-[11px] font-bold text-bright shadow-glow">
        Save expense
      </div>
    </div>
  );
}

/* ---- Desktop: browser window with the wide dashboard layout ------------- */

const desktopMetrics = [
  { label: "Income", value: "฿48,200", sub: "+8.4%", icon: ArrowDownCircle, tone: "bg-moss/10 text-moss", subTone: "text-moss" },
  { label: "Expenses", value: "฿32,540", sub: "-3.1%", icon: ArrowUpCircle, tone: "bg-coral/10 text-coral", subTone: "text-coral" },
  { label: "Net flow", value: "+฿15,660", sub: "this month", icon: ChartPie, tone: "bg-river/10 text-river", subTone: "text-ink/45" },
  { label: "Balance", value: "฿86,410", sub: "2 accounts", icon: Banknote, tone: "bg-amber/10 text-amber", subTone: "text-ink/45" }
];

export function DesktopMockup() {
  return (
    <div
      aria-hidden
      lang="en"
      className="mx-auto w-full max-w-4xl rounded-2xl border border-white/40 bg-ink/90 p-2"
      style={{ boxShadow: "var(--shadow-lift), 0 40px 90px rgb(var(--river) / 0.18)" }}
    >
      <div className="liquid-ui overflow-hidden rounded-xl bg-paper">
        {/* window chrome */}
        <div className="flex items-center gap-3 border-b border-ink/10 px-4 py-2.5">
          <span className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-coral/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-moss/80" />
          </span>
          <span className="mx-auto flex items-center gap-1.5 rounded-full bg-ink/10 px-4 py-1 text-[10px] text-ink/50">
            <Lock size={9} />
            app.athonesayate.com
          </span>
          <span className="w-12" />
        </div>

        <div className="space-y-3 px-5 py-4">
          {/* top nav */}
          <div className="flex items-center justify-between">
            <p className="font-display text-[13px] font-bold">Dashboard</p>
            <div className="flex gap-1 rounded-full border border-ink/10 bg-white p-1 text-[9px] font-semibold">
              <span className="rounded-full bg-river px-3 py-1 text-bright">Dashboard</span>
              <span className="px-3 py-1 text-ink/50">Transactions</span>
              <span className="px-3 py-1 text-ink/50">Reports</span>
              <span className="px-3 py-1 text-ink/50">Settings</span>
            </div>
          </div>

          {/* four-up metrics */}
          <div className="grid grid-cols-4 gap-2">
            {desktopMetrics.map((metric) => (
              <div key={metric.label} className="liquid-panel border p-2.5">
                <span className={`mb-1.5 grid h-5 w-5 place-items-center rounded-full ${metric.tone}`}>
                  <metric.icon size={11} />
                </span>
                <p className="truncate text-[8px] uppercase tracking-wide text-ink/45">
                  {metric.label}
                </p>
                <p className="tnum truncate text-[12px] font-bold sm:text-[14px]">{metric.value}</p>
                <p className={`truncate text-[8px] font-medium ${metric.subTone}`}>{metric.sub}</p>
              </div>
            ))}
          </div>

          {/* wide chart + category mix, side by side */}
          <div className="grid grid-cols-[1.5fr_1fr] gap-2">
            <div className="liquid-panel border p-3">
              <div className="mb-2 flex items-baseline justify-between">
                <p className="text-[10px] font-semibold">Spending pace</p>
                <p className="text-[8px] uppercase tracking-wide text-ink/45">This month</p>
              </div>
              <svg viewBox="0 0 240 90" preserveAspectRatio="none" className="h-24 w-full text-coral sm:h-32">
                <defs>
                  <linearGradient id="desktopSpend" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="currentColor" stopOpacity="0.32" />
                    <stop offset="95%" stopColor="currentColor" stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                {[18, 36, 54, 72].map((y) => (
                  <line
                    key={y}
                    x1="0"
                    x2="240"
                    y1={y}
                    y2={y}
                    stroke="rgb(var(--ink) / 0.08)"
                    strokeDasharray="3 3"
                  />
                ))}
                <path
                  d="M0,74 C24,68 38,70 54,58 C70,46 86,54 102,46 C118,38 134,50 150,38 C166,26 184,34 202,22 C218,14 230,18 240,10 L240,90 L0,90 Z"
                  fill="url(#desktopSpend)"
                />
                <path
                  d="M0,74 C24,68 38,70 54,58 C70,46 86,54 102,46 C118,38 134,50 150,38 C166,26 184,34 202,22 C218,14 230,18 240,10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>
            <div className="liquid-panel border p-3">
              <p className="mb-2 text-[10px] font-semibold">Category mix</p>
              <div className="space-y-2">
                {categories.map((cat) => (
                  <div key={cat.name}>
                    <div className="mb-0.5 flex items-center justify-between text-[9px]">
                      <span className="flex items-center gap-1.5 truncate font-medium">
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${cat.tone}`} />
                        {cat.name}
                      </span>
                      <span className="tnum shrink-0 text-ink/60">{cat.amount}</span>
                    </div>
                    <div className="h-1 rounded-full bg-ink/10">
                      <div
                        className={`h-full rounded-full ${cat.tone}`}
                        style={{ width: `${cat.pct}%`, opacity: 0.85 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SavedToast() {
  return (
    <div className="liquid-panel flex items-center gap-2 rounded-full border px-3.5 py-2">
      <span className="grid h-5 w-5 place-items-center rounded-full bg-moss/15 text-moss">
        <Check size={11} strokeWidth={3} />
      </span>
      <span className="text-[10px] font-semibold">
        Saved — Lunch noodles <span className="tnum text-ink/60">฿120</span>
      </span>
    </div>
  );
}
