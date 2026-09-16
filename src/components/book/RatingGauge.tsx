interface RatingGaugeProps {
  rating: number
  reviewCount: number
  size?: number
}

// Speedometer-style gauge for a driver's average rating — the showroom
// world's signature instrument, standing in for the flat star-average text
// used elsewhere. 0–5 sweep across 220°, chrome bezel, glossy face.
export default function RatingGauge({ rating, reviewCount, size = 108 }: RatingGaugeProps) {
  const clamped = Math.max(0, Math.min(5, rating))
  const sweep = 220
  const startAngle = -110 // degrees, 0 at top-ish left of the arc
  const angle = startAngle + (clamped / 5) * sweep
  const toRad = (deg: number) => (deg * Math.PI) / 180

  const cx = 60
  const cy = 60
  const r = 46

  function arcPoint(deg: number, radius: number) {
    const rad = toRad(deg - 90)
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) }
  }

  const start = arcPoint(startAngle, r)
  const end = arcPoint(startAngle + sweep, r)
  const needleEnd = arcPoint(angle, r - 12)
  const largeArc = sweep > 180 ? 1 : 0

  const ticks = Array.from({ length: 6 }, (_, i) => {
    const deg = startAngle + (i / 5) * sweep
    const outer = arcPoint(deg, r + 2)
    const inner = arcPoint(deg, r - 6)
    return { outer, inner }
  })

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" width={size} height={size}>
        <defs>
          <radialGradient id="gaugeBezel" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="55%" stopColor="#dce4fb" />
            <stop offset="100%" stopColor="#9fb1e6" />
          </radialGradient>
          <linearGradient id="gaugeArc" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7e9cfe" />
            <stop offset="100%" stopColor="#003fb1" />
          </linearGradient>
        </defs>

        <circle cx={cx} cy={cy} r={54} fill="url(#gaugeBezel)" />
        <circle cx={cx} cy={cy} r={49} fill="#fbfcff" />

        <path
          d={`M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`}
          fill="none"
          stroke="#dfe4f5"
          strokeWidth={6}
          strokeLinecap="round"
        />
        <path
          d={`M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${arcPoint(angle, r).x} ${arcPoint(angle, r).y}`}
          fill="none"
          stroke="url(#gaugeArc)"
          strokeWidth={6}
          strokeLinecap="round"
        />

        {ticks.map((t, i) => (
          <line
            key={i}
            x1={t.inner.x}
            y1={t.inner.y}
            x2={t.outer.x}
            y2={t.outer.y}
            stroke="#b7c1de"
            strokeWidth={1.5}
          />
        ))}

        <line x1={cx} y1={cy} x2={needleEnd.x} y2={needleEnd.y} stroke="#003fb1" strokeWidth={2.5} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={4} fill="#003fb1" />

        <text x={cx} y={cy + 24} textAnchor="middle" fontSize="17" fontWeight="700" fill="#141b2b">
          {clamped > 0 ? clamped.toFixed(1) : '—'}
        </text>
      </svg>
      <p className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-medium text-on-surface-variant whitespace-nowrap">
        {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
      </p>
    </div>
  )
}
