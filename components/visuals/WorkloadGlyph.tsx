import { cn } from "@/lib/utils/cn";

export type WorkloadKind =
  | "llm_inference"
  | "fine_tuning"
  | "training_from_scratch"
  | "image_generation"
  | "video_generation"
  | "computer_vision";

const stroke = "#A4A79D";
const accent = "#F5E642";

/**
 * Per-workload conceptual diagrams.
 *
 * Original SVG (no stock imagery, no remote assets) so each workload has its own
 * visual signature instead of a repeated card template.
 */
export function WorkloadGlyph({
  kind,
  className,
}: {
  kind: WorkloadKind;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 240 140"
      className={cn("h-full w-full", className)}
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <pattern id={`glyphGrid-${kind}`} width="12" height="12" patternUnits="userSpaceOnUse">
          <path d="M12 0H0V12" fill="none" stroke="#30342A" strokeWidth="0.7" />
        </pattern>
      </defs>
      <rect width="240" height="140" fill={`url(#glyphGrid-${kind})`} opacity="0.5" />
      {kind === "llm_inference" ? <InferenceGlyph /> : null}
      {kind === "fine_tuning" ? <FineTuningGlyph /> : null}
      {kind === "training_from_scratch" ? <TrainingGlyph /> : null}
      {kind === "image_generation" ? <ImageGlyph /> : null}
      {kind === "video_generation" ? <VideoGlyph /> : null}
      {kind === "computer_vision" ? <VisionGlyph /> : null}
    </svg>
  );
}

function InferenceGlyph() {
  return (
    <g>
      {/* Prompt tokens */}
      {[0, 1, 2].map((index) => (
        <rect
          key={index}
          x={16 + index * 26}
          y={30}
          width={18}
          height={14}
          fill="#191C18"
          stroke={stroke}
          strokeWidth="0.9"
        />
      ))}
      {/* Model body */}
      <rect x={96} y={22} width={56} height={62} fill="#121412" stroke={accent} strokeOpacity="0.7" />
      {[0, 1, 2].map((row) => (
        <line key={row} x1={104} y1={34 + row * 16} x2={144} y2={34 + row * 16} stroke={accent} strokeOpacity="0.28" />
      ))}
      {/* KV cache column */}
      <rect x={160} y={22} width={22} height={62} fill="#191C18" stroke={stroke} strokeWidth="0.9" />
      <text x={171} y={18} textAnchor="middle" fill={stroke} fontFamily="monospace" fontSize="7" letterSpacing="1.2">
        KV
      </text>
      {/* Output tokens */}
      {[0, 1, 2, 3].map((index) => (
        <rect
          key={index}
          x={194 + (index % 2) * 22}
          y={30 + Math.floor(index / 2) * 20}
          width={16}
          height={13}
          fill="#191C18"
          stroke={stroke}
          strokeWidth="0.9"
        />
      ))}
      <line x1={78} y1={37} x2={94} y2={37} stroke={accent} strokeWidth="1.4" />
      <path d="M94 37l-4-3v6z" fill={accent} />
      <line x1={152} y1={37} x2={158} y2={37} stroke={accent} strokeWidth="1.4" />
      <line x1={182} y1={37} x2={192} y2={37} stroke={accent} strokeWidth="1.4" />
      <g className="animate-trace-slow" fill="none" stroke="#FFF27A" strokeWidth="1.4" strokeDasharray="10 60">
        <path d="M104 100 H200" />
      </g>
      <text x={16} y={112} fill={stroke} fontFamily="monospace" fontSize="7" letterSpacing="1.4">
        PROMPT
      </text>
      <text x={96} y={112} fill={accent} fontFamily="monospace" fontSize="7" letterSpacing="1.4">
        WEIGHTS + KV CACHE
      </text>
      <text x={194} y={112} fill={stroke} fontFamily="monospace" fontSize="7" letterSpacing="1.4">
        STREAM
      </text>
    </g>
  );
}

function FineTuningGlyph() {
  return (
    <g>
      <rect x={18} y={26} width={62} height={82} fill="#121412" stroke={stroke} strokeWidth="0.9" />
      {[0, 1, 2, 3].map((row) => (
        <line key={row} x1={26} y1={40 + row * 18} x2={72} y2={40 + row * 18} stroke={stroke} strokeOpacity="0.35" />
      ))}
      <text x={49} y={20} textAnchor="middle" fill={stroke} fontFamily="monospace" fontSize="7" letterSpacing="1.8">
        FROZEN BASE
      </text>

      {[0, 1].map((row) => (
        <g key={row}>
          <rect
            x={96}
            y={30 + row * 46}
            width={50}
            height={30}
            fill="#F5E642"
            fillOpacity="0.16"
            stroke={accent}
            strokeWidth="1.1"
          />
          <line x1={104} y1={45 + row * 46} x2={138} y2={45 + row * 46} stroke={accent} strokeOpacity="0.7" />
        </g>
      ))}
      <text x={121} y={20} textAnchor="middle" fill={accent} fontFamily="monospace" fontSize="7" letterSpacing="1.8">
        TRAINABLE ADAPTERS
      </text>

      <line x1={80} y1={67} x2={94} y2={67} stroke={accent} strokeWidth="1.4" strokeDasharray="3 3" />

      <rect x={166} y={26} width={56} height={82} fill="#191C18" stroke={accent} strokeOpacity="0.6" />
      {[0, 1, 2, 3].map((row) => (
        <line key={row} x1={174} y1={40 + row * 18} x2={214} y2={40 + row * 18} stroke={accent} strokeOpacity="0.3" />
      ))}
      <text x={194} y={20} textAnchor="middle" fill={accent} fontFamily="monospace" fontSize="7" letterSpacing="1.2">
        YOUR MODEL
      </text>
      <line x1={146} y1={67} x2={164} y2={67} stroke={accent} strokeWidth="1.4" />
      <path d="M164 67l-4-3v6z" fill={accent} />
      <g className="animate-trace" fill="none" stroke="#FFF27A" strokeWidth="1.4" strokeDasharray="12 120">
        <path d="M104 120 H210" />
      </g>
    </g>
  );
}

function TrainingGlyph() {
  const nodes = [
    { x: 74, y: 24 },
    { x: 150, y: 24 },
    { x: 150, y: 84 },
    { x: 74, y: 84 },
  ];
  return (
    <g>
      {nodes.map((node, index) => (
        <g key={index}>
          <rect x={node.x} y={node.y} width={40} height={32} fill="#121412" stroke={accent} strokeOpacity="0.6" />
          <text
            x={node.x + 20}
            y={node.y + 20}
            textAnchor="middle"
            fill={accent}
            fontFamily="monospace"
            fontSize="7"
            letterSpacing="1.2"
          >
            GPU {index}
          </text>
        </g>
      ))}
      <path
        d="M114 40 H150 M170 56 V84 M150 100 H114 M94 84 V56"
        fill="none"
        stroke={stroke}
        strokeWidth="1"
        strokeDasharray="4 4"
      />
      <g className="animate-trace" fill="none" stroke="#FFF27A" strokeWidth="1.6" strokeDasharray="14 190">
        <path d="M114 40 H150 M170 56 V84 M150 100 H114 M94 84 V56" />
      </g>
      <text x={20} y={70} fill={stroke} fontFamily="monospace" fontSize="7" letterSpacing="1.8">
        ALL REDUCE
      </text>
      <text x={206} y={70} fill={stroke} fontFamily="monospace" fontSize="7" letterSpacing="1.4">
        EPOCHS
      </text>
      <g className="animate-trace-slow" fill="none" stroke={accent} strokeWidth="1.2" strokeDasharray="8 60">
        <path d="M20 96 H60" />
      </g>
    </g>
  );
}

function ImageGlyph() {
  const steps = [0, 1, 2, 3];
  return (
    <g>
      {steps.map((step) => (
        <rect
          key={step}
          x={22 + step * 54}
          y={40}
          width={42}
          height={42}
          fill="#141712"
          stroke={step === steps.length - 1 ? accent : stroke}
          strokeOpacity={step === steps.length - 1 ? 0.85 : 0.5}
        />
      ))}
      {/* noise → structure progression */}
      {steps.map((step) =>
        Array.from({ length: (steps.length - step) * 4 }).map((_, dot) => (
          <circle
            key={`${step}-${dot}`}
            cx={24 + step * 54 + ((dot * 13) % 38)}
            cy={42 + ((dot * 7) % 38)}
            r="1.1"
            fill={accent}
            opacity={0.18 + step * 0.16}
          />
        )),
      )}
      <rect x={202} y={48} width={26} height={26} fill={accent} fillOpacity="0.14" stroke={accent} />
      <path d="M202 74l10-12 8 9 6-5 2 8z" fill={accent} opacity="0.7" />
      <text x={22} y={32} fill={stroke} fontFamily="monospace" fontSize="7" letterSpacing="1.4">
        NOISE
      </text>
      <text x={172} y={32} fill={accent} fontFamily="monospace" fontSize="7" letterSpacing="1.4">
        DENOISE STEPS
      </text>
      <g className="animate-trace" fill="none" stroke="#FFF27A" strokeWidth="1.3" strokeDasharray="10 150">
        <path d="M24 100 H172" />
      </g>
      <text x={22} y={120} fill={stroke} fontFamily="monospace" fontSize="7" letterSpacing="1.4">
        SINGLE PROMPT / BATCH OF IMAGES
      </text>
    </g>
  );
}

function VideoGlyph() {
  return (
    <g>
      {[0, 1, 2, 3, 4].map((index) => (
        <rect
          key={index}
          x={24 + index * 30}
          y={30 + index * 6}
          width={64}
          height={40}
          fill="#121412"
          fillOpacity="0.85"
          stroke={index === 4 ? accent : stroke}
          strokeOpacity={index === 4 ? 0.9 : 0.4}
        />
      ))}
      {[0, 1, 2].map((index) => (
        <line
          key={index}
          x1={30 + index * 30}
          y1={40 + index * 6}
          x2={80 + index * 30}
          y2={40 + index * 6}
          stroke={accent}
          strokeOpacity="0.3"
        />
      ))}
      <text x={24} y={22} fill={stroke} fontFamily="monospace" fontSize="7" letterSpacing="1.4">
        FRAME t
      </text>
      <text x={168} y={112} fill={accent} fontFamily="monospace" fontSize="7" letterSpacing="1.4">
        FRAME t+n
      </text>
      <g className="animate-trace" fill="none" stroke="#FFF27A" strokeWidth="1.4" strokeDasharray="12 130">
        <path d="M30 122 H180" />
      </g>
      <path d="M186 122l-5-3.5v7z" fill={accent} />
      <text x={24} y={138} fill={stroke} fontFamily="monospace" fontSize="7" letterSpacing="1.4">
        TEMPORAL CONSISTENCY
      </text>
    </g>
  );
}

function VisionGlyph() {
  return (
    <g>
      <rect x={20} y={28} width={64} height={64} fill="#141712" stroke={stroke} strokeWidth="0.9" />
      {[0, 1, 2, 3].map((row) =>
        [0, 1, 2, 3].map((col) => (
          <rect
            key={`${row}-${col}`}
            x={24 + col * 15}
            y={32 + row * 15}
            width={13}
            height={13}
            fill={accent}
            fillOpacity={0.05 + ((row + col) % 4) * 0.05}
          />
        )),
      )}
      <rect x={30} y={44} width={34} height={26} fill="none" stroke={accent} strokeWidth="1.4" />
      <text x={30} y={22} fill={stroke} fontFamily="monospace" fontSize="7" letterSpacing="1.4">
        INPUT
      </text>

      {/* Feature pyramid */}
      <rect x={108} y={34} width={44} height={44} fill="#121412" stroke={accent} strokeOpacity="0.5" />
      <rect x={116} y={44} width={28} height={28} fill="#121412" stroke={accent} strokeOpacity="0.7" />
      <rect x={124} y={52} width={12} height={12} fill={accent} fillOpacity="0.25" />
      <text x={108} y={26} fill={accent} fontFamily="monospace" fontSize="7" letterSpacing="1.2">
        BACKBONE
      </text>

      <rect x={178} y={44} width={44} height={30} fill="#121412" stroke={stroke} />
      <line x1={186} y1={59} x2={214} y2={59} stroke={accent} strokeOpacity="0.6" />
      <text x={178} y={38} fill={stroke} fontFamily="monospace" fontSize="7" letterSpacing="1.2">
        HEADS
      </text>

      <line x1={84} y1={60} x2={106} y2={60} stroke={accent} strokeWidth="1.3" />
      <line x1={152} y1={60} x2={176} y2={60} stroke={accent} strokeWidth="1.3" />
      <g className="animate-trace-slow" fill="none" stroke="#FFF27A" strokeWidth="1.4" strokeDasharray="12 140">
        <path d="M26 112 H214" />
      </g>
      <text x={20} y={130} fill={stroke} fontFamily="monospace" fontSize="7" letterSpacing="1.4">
        CLASSIFY / DETECT / SEGMENT
      </text>
    </g>
  );
}
