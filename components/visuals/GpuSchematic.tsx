import { cn } from "@/lib/utils/cn";

/**
 * Original SVG schematic of a GPU accelerator board, drawn from scratch.
 *
 * This is the visual that is *always* available: it needs no JavaScript, no
 * WebGL and no network images, so the hero never depends on a 3D scene loading
 * successfully. It is also used as the fallback when the visitor prefers
 * reduced motion or is on a small screen.
 *
 * It is a schematic, not a photograph of a specific product, and it is labelled
 * as such.
 */
export function GpuSchematic({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 520 420"
      className={cn("h-full w-full", className)}
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="boardFill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#171A16" />
          <stop offset="55%" stopColor="#121412" />
          <stop offset="100%" stopColor="#0D0F0C" />
        </linearGradient>
        <linearGradient id="dieFill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1D2118" />
          <stop offset="100%" stopColor="#101210" />
        </linearGradient>
        <linearGradient id="edgeGlow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F5E642" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#F5E642" stopOpacity="0.05" />
        </linearGradient>
        <pattern id="dieGrid" width="14" height="14" patternUnits="userSpaceOnUse">
          <path d="M14 0H0V14" fill="none" stroke="#F5E642" strokeOpacity="0.16" strokeWidth="0.8" />
        </pattern>
        <pattern id="boardGrid" width="26" height="26" patternUnits="userSpaceOnUse">
          <path d="M26 0H0V26" fill="none" stroke="#30342A" strokeWidth="1" />
        </pattern>
      </defs>

      {/* Board substrate with angled corners */}
      <path
        d="M76 44 H440 L462 66 V318 H58 V66 Z"
        fill="url(#boardFill)"
        stroke="#30342A"
        strokeWidth="1.5"
      />
      <path d="M76 44 H440 L462 66 V318 H58 V66 Z" fill="url(#boardGrid)" opacity="0.35" />
      <path d="M76 44 H440 L462 66" fill="none" stroke="#F5E642" strokeOpacity="0.35" strokeWidth="1" />

      {/* Host interface fingers */}
      <g fill="#2A2E24">
        {Array.from({ length: 30 }).map((_, index) => (
          <rect key={index} x={122 + index * 9.6} y={318} width={5.4} height={16} />
        ))}
      </g>

      {/* Power delivery stage */}
      <g>
        <rect x={120} y={62} width={280} height={20} fill="#151814" stroke="#30342A" />
        {Array.from({ length: 12 }).map((_, index) => (
          <rect
            key={index}
            x={128 + index * 23}
            y={67}
            width={13}
            height={10}
            fill="#1E221A"
            stroke="#3C4133"
            strokeWidth="0.8"
          />
        ))}
      </g>

      {/* Memory stacks flanking the die */}
      {[
        { x: 118, y: 152 },
        { x: 118, y: 216 },
        { x: 338, y: 152 },
        { x: 338, y: 216 },
      ].map((stack, index) => (
        <g key={`${stack.x}-${stack.y}`}>
          <rect
            x={stack.x}
            y={stack.y}
            width={62}
            height={56}
            fill="#141712"
            stroke="#3C4133"
            strokeWidth="1"
          />
          {Array.from({ length: 7 }).map((_, row) => (
            <line
              key={row}
              x1={stack.x + 5}
              y1={stack.y + 8 + row * 6.6}
              x2={stack.x + 57}
              y2={stack.y + 8 + row * 6.6}
              stroke="#F5E642"
              strokeOpacity={0.13 + (index % 2) * 0.04}
              strokeWidth="1.4"
            />
          ))}
        </g>
      ))}

      {/* Memory bus traces: die to stacks */}
      <g stroke="#F5E642" strokeOpacity="0.42" strokeWidth="1.1" fill="none">
        {Array.from({ length: 8 }).map((_, index) => (
          <path key={`l-${index}`} d={`M190 ${168 + index * 12} H180 V${168 + index * 12}`} />
        ))}
      </g>
      <g stroke="#F5E642" strokeOpacity="0.42" strokeWidth="1.1" fill="none">
        {Array.from({ length: 8 }).map((_, index) => (
          <path key={`r-${index}`} d={`M330 ${168 + index * 12} H340`} />
        ))}
      </g>
      <g stroke="#F5E642" strokeOpacity="0.22" strokeWidth="1" fill="none">
        <path d="M260 98 V132" />
        <path d="M260 268 V300" />
        <path d="M126 96 H420" strokeDasharray="4 6" />
      </g>

      {/* Animated traces (CSS motion, disabled under reduced motion) */}
      <g
        className="animate-trace"
        fill="none"
        stroke="#FFF27A"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeDasharray="14 226"
        opacity="0.85"
      >
        <path d="M118 180 H188" />
      </g>
      <g
        className="animate-trace-slow"
        fill="none"
        stroke="#FFF27A"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeDasharray="12 228"
        opacity="0.7"
      >
        <path d="M332 244 H402" />
      </g>

      {/* Compute die */}
      <g>
        <rect x={190} y={132} width={140} height={136} fill="url(#dieFill)" stroke="#F5E642" strokeOpacity="0.55" />
        <rect x={190} y={132} width={140} height={136} fill="url(#dieGrid)" />
        <rect x={204} y={146} width={112} height={44} fill="#F5E642" fillOpacity="0.07" />
        <rect x={204} y={196} width={54} height={58} fill="#F5E642" fillOpacity="0.05" />
        <rect x={264} y={196} width={52} height={58} fill="#F5E642" fillOpacity="0.09" />
        <text x={260} y={126} textAnchor="middle" fill="#F4F4EF" fontSize="9" letterSpacing="2.4" fontFamily="monospace">
          COMPUTE DIE
        </text>
      </g>

      {/* Annotation leaders */}
      <g stroke="#A4A79D" strokeWidth="0.9" strokeOpacity="0.75">
        <path d="M96 96 H60 V128" fill="none" />
        <path d="M424 200 H470 V232" fill="none" />
        <path d="M300 300 H336 V296" fill="none" />
      </g>

      <g fontFamily="monospace" fontSize="9" letterSpacing="1.9" fill="#A4A79D">
        <text x={28} y={124} textAnchor="end">
          POWER DELIVERY
        </text>
        <text x={474} y={246} textAnchor="end">
          MEMORY BUS
        </text>
        <text x={74} y={172} textAnchor="end">
          STACK 0
        </text>
        <text x={74} y={236} textAnchor="end">
          STACK 1
        </text>
        <text x={410} y={172}>
          STACK 2
        </text>
        <text x={410} y={236}>
          STACK 3
        </text>
        <text x={340} y={340}>
          HOST INTERFACE
        </text>
        <text x={28} y={398} fill="#6F7268">
          REDFOGXPU / SCHEMATIC
        </text>
        <text x={28} y={412} fill="#6F7268">
          REV A · NOT TO SCALE
        </text>
      </g>

      {/* Live telemetry accents */}
      <g>
        <circle cx={468} cy={64} r="3.2" fill="#F5E642" className="animate-beacon" />
        <text x={458} y={48} textAnchor="end" fontFamily="monospace" fontSize="9" letterSpacing="1.9" fill="#F5E642">
          ACTIVE
        </text>
      </g>
    </svg>
  );
}
