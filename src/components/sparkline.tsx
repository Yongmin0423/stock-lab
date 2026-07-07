/** 미니 스파크라인 (서버 렌더 SVG). 상승 빨강 / 하락 파랑 */
export function Sparkline({ closes }: { closes: number[] }) {
  if (closes.length < 2) return <div className="h-7" />;

  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const w = 200;
  const h = 28;
  const pad = 2;

  const points = closes
    .map((c, i) => {
      const x = (i / (closes.length - 1)) * w;
      const y = pad + (1 - (c - min) / range) * (h - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const up = closes[closes.length - 1] >= closes[0];

  return (
    <svg className="mt-2 w-full" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polyline fill="none" stroke={up ? "#f04452" : "#3182f6"} strokeWidth="2" points={points} />
    </svg>
  );
}
