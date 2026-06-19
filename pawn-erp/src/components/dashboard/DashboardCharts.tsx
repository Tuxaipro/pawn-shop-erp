function maxOf(values: number[]) {
  return Math.max(...values, 1);
}

export function BarChart({
  data,
  valueKey,
  labelKey,
  color = 'bg-blue-500',
  formatValue,
}: {
  data: Array<Record<string, string | number>>;
  valueKey: string;
  labelKey: string;
  color?: string;
  formatValue?: (v: number) => string;
}) {
  const max = maxOf(data.map((d) => Number(d[valueKey])));
  return (
    <div className="flex h-40 items-end gap-2">
      {data.map((d, i) => {
        const v = Number(d[valueKey]);
        const h = Math.max(4, (v / max) * 100);
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[10px] text-zinc-500">
              {formatValue ? formatValue(v) : v}
            </span>
            <div className={`w-full rounded-t ${color}`} style={{ height: `${h}%` }} />
            <span className="text-[10px] text-zinc-600">{String(d[labelKey])}</span>
          </div>
        );
      })}
    </div>
  );
}

export function HorizontalBarChart({
  items,
  colors,
  formatValue,
}: {
  items: { label: string; value: number }[];
  colors?: string[];
  formatValue?: (v: number) => string;
}) {
  const max = maxOf(items.map((i) => i.value));
  const palette = colors ?? ['bg-amber-500', 'bg-zinc-400', 'bg-violet-400', 'bg-teal-400'];
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={item.label}>
          <div className="mb-1 flex justify-between text-xs">
            <span>{item.label}</span>
            <span className="text-zinc-500">
              {formatValue ? formatValue(item.value) : item.value.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="h-2 rounded-full bg-zinc-100">
            <div
              className={`h-2 rounded-full ${palette[i % palette.length]}`}
              style={{ width: `${Math.max(4, (item.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function LineChart({
  data,
  valueKey,
  labelKey,
}: {
  data: Array<Record<string, string | number>>;
  valueKey: string;
  labelKey: string;
}) {
  const values = data.map((d) => Number(d[valueKey]));
  const max = maxOf(values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const w = 280;
  const h = 100;
  const points = values
    .map((v, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h + 20}`} className="w-full max-w-sm">
        <polyline fill="none" stroke="#3b82f6" strokeWidth="2" points={points} />
        {data.map((d, i) => {
          const x = (i / Math.max(values.length - 1, 1)) * w;
          const y = h - ((values[i] - min) / range) * h;
          return (
            <g key={i}>
              <circle cx={x} cy={y} r="3" fill="#3b82f6" />
              <text x={x} y={h + 14} textAnchor="middle" fontSize="9" fill="#71717a">
                {String(d[labelKey])}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function PieChart({
  slices,
}: {
  slices: { label: string; pct: number }[];
}) {
  const colors = ['#3b82f6', '#8b5cf6', '#ef4444', '#22c55e'];
  let offset = 0;
  const gradient = slices
    .map((s, i) => {
      const start = offset;
      offset += s.pct;
      return `${colors[i % colors.length]} ${start}% ${offset}%`;
    })
    .join(', ');

  return (
    <div className="flex items-center gap-6">
      <div
        className="h-24 w-24 shrink-0 rounded-full"
        style={{ background: `conic-gradient(${gradient})` }}
      />
      <ul className="space-y-1 text-xs text-zinc-600">
        {slices.map((s, i) => (
          <li key={s.label} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
            <span className="capitalize">{s.label}</span> {s.pct}%
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DonutChart({
  slices,
}: {
  slices: { label: string; pct: number }[];
}) {
  const colors = ['#eab308', '#a1a1aa', '#a78bfa', '#2dd4bf'];
  let offset = 0;
  const gradient = slices
    .filter((s) => s.pct > 0)
    .map((s, i) => {
      const start = offset;
      offset += s.pct;
      return `${colors[i % colors.length]} ${start}% ${offset}%`;
    })
    .join(', ');

  return (
    <div className="flex items-center gap-6">
      <div className="relative h-24 w-24 shrink-0">
        <div
          className="absolute inset-0 rounded-full"
          style={{ background: gradient ? `conic-gradient(${gradient})` : '#e4e4e7' }}
        />
        <div className="absolute inset-[22%] rounded-full bg-white" />
      </div>
      <ul className="space-y-1 text-xs text-zinc-600">
        {slices.map((s, i) => (
          <li key={s.label} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
            {s.label} {s.pct}%
          </li>
        ))}
      </ul>
    </div>
  );
}

export function KpiBar({ label, pct }: { label: string; pct: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="capitalize">{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-zinc-100">
        <div className="h-2 rounded-full bg-teal-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
