"use client";

/**
 * 신체 부위 선택 Body Map (앞면 / 뒷면)
 *
 * - 그라데이션 실루엣 + 선택 부위 aqua fill & glow 하이라이트
 * - 실루엣 터치와 부위 칩 양쪽 모두로 선택 가능 (모바일 손가락 조작 고려)
 * - 데이터는 BodyPartRecord[] — side/subPart 필드로 향후 좌/우·세부 부위 확장
 */

import { BODY_PART_LABELS, BodyPart, BodyPartRecord, BodySide } from "@/lib/types";

type View = "front" | "back";

/** 좌/우 구분이 의미 있는 부위 (양측 shape 보유) */
const SIDED_PARTS: BodyPart[] = ["arm", "knee", "leg", "foot_ankle"];

const SIDE_LABELS: Record<BodySide, string> = {
  left: "좌",
  right: "우",
  both: "양쪽",
};

interface Zone {
  part: BodyPart;
  shapes: Array<
    | { kind: "rect"; x: number; y: number; w: number; h: number; r?: number }
    | { kind: "ellipse"; cx: number; cy: number; rx: number; ry: number }
  >;
}

const FRONT_ZONES: Zone[] = [
  { part: "neck_shoulder", shapes: [{ kind: "rect", x: 28, y: 33, w: 64, h: 24, r: 10 }] },
  { part: "abdomen", shapes: [{ kind: "rect", x: 38, y: 74, w: 44, h: 32, r: 10 }] },
  { part: "pelvis_hip", shapes: [{ kind: "rect", x: 35, y: 106, w: 50, h: 28, r: 10 }] },
  {
    part: "arm",
    shapes: [
      { kind: "rect", x: 12, y: 46, w: 18, h: 84, r: 9 },
      { kind: "rect", x: 90, y: 46, w: 18, h: 84, r: 9 },
    ],
  },
  {
    part: "knee",
    shapes: [
      { kind: "ellipse", cx: 49, cy: 174, rx: 11, ry: 13 },
      { kind: "ellipse", cx: 71, cy: 174, rx: 11, ry: 13 },
    ],
  },
  {
    part: "leg",
    shapes: [
      { kind: "rect", x: 38, y: 134, w: 21, h: 92, r: 9 },
      { kind: "rect", x: 61, y: 134, w: 21, h: 92, r: 9 },
    ],
  },
  {
    part: "foot_ankle",
    shapes: [
      { kind: "rect", x: 34, y: 226, w: 25, h: 22, r: 8 },
      { kind: "rect", x: 61, y: 226, w: 25, h: 22, r: 8 },
    ],
  },
];

const BACK_ZONES: Zone[] = [
  { part: "neck_shoulder", shapes: [{ kind: "rect", x: 28, y: 33, w: 64, h: 24, r: 10 }] },
  { part: "back", shapes: [{ kind: "rect", x: 36, y: 57, w: 48, h: 34, r: 10 }] },
  { part: "waist", shapes: [{ kind: "rect", x: 37, y: 91, w: 46, h: 24, r: 10 }] },
  { part: "pelvis_hip", shapes: [{ kind: "rect", x: 35, y: 115, w: 50, h: 24, r: 10 }] },
  {
    part: "arm",
    shapes: [
      { kind: "rect", x: 12, y: 46, w: 18, h: 84, r: 9 },
      { kind: "rect", x: 90, y: 46, w: 18, h: 84, r: 9 },
    ],
  },
  {
    part: "leg",
    shapes: [
      { kind: "rect", x: 38, y: 139, w: 21, h: 87, r: 9 },
      { kind: "rect", x: 61, y: 139, w: 21, h: 87, r: 9 },
    ],
  },
  {
    part: "foot_ankle",
    shapes: [
      { kind: "rect", x: 34, y: 226, w: 25, h: 22, r: 8 },
      { kind: "rect", x: 61, y: 226, w: 25, h: 22, r: 8 },
    ],
  },
];

/** 실루엣 (양쪽 뷰 공통 형태) */
function Silhouette() {
  return (
    <g fill="url(#bodyFill)" stroke="#7FC5C1" strokeWidth="1">
      {/* 머리 */}
      <circle cx="60" cy="19" r="13" />
      {/* 목 */}
      <rect x="54" y="30" width="12" height="9" rx="3" />
      {/* 몸통 */}
      <path d="M32 40 Q60 34 88 40 L84 96 Q83 112 85 120 L82 136 Q60 143 38 136 L35 120 Q37 112 36 96 Z" />
      {/* 팔 */}
      <path d="M32 41 Q22 46 20 60 L17 118 Q17 127 23 128 Q29 128 30 119 L34 62 Z" />
      <path d="M88 41 Q98 46 100 60 L103 118 Q103 127 97 128 Q91 128 90 119 L86 62 Z" />
      {/* 다리 */}
      <path d="M40 138 Q42 180 42 200 L42 224 Q42 230 48 230 L53 230 Q58 230 58 223 L59 140 Z" />
      <path d="M80 138 Q78 180 78 200 L78 224 Q78 230 72 230 L67 230 Q62 230 62 223 L61 140 Z" />
      {/* 발 */}
      <path d="M42 230 Q40 238 44 241 L56 241 Q59 238 57 231 Z" />
      <path d="M78 230 Q80 238 76 241 L64 241 Q61 238 63 231 Z" />
    </g>
  );
}

/**
 * shape index → 신체 기준 좌/우.
 * 양측 shape은 [0]=화면 좌측, [1]=화면 우측이며,
 * 앞면에서는 화면 좌측이 고객의 오른쪽, 뒷면에서는 고객의 왼쪽이다.
 */
function shapeBodySide(view: View, index: number): BodySide {
  if (view === "front") return index === 0 ? "right" : "left";
  return index === 0 ? "left" : "right";
}

function ZoneShapes({
  zone,
  view,
  record,
  onToggle,
  readOnly,
}: {
  zone: Zone;
  view: View;
  record?: BodyPartRecord;
  onToggle: (part: BodyPart) => void;
  readOnly?: boolean;
}) {
  const side = record?.side ?? "both";
  const twoSided = zone.shapes.length === 2;

  return (
    <g>
      {zone.shapes.map((s, i) => {
        const shapeSide = twoSided ? shapeBodySide(view, i) : "both";
        const filled =
          !!record && (side === "both" || !twoSided || shapeSide === side);
        const common = {
          className: readOnly ? "" : "cursor-pointer",
          fill: filled ? "url(#zoneFill)" : "transparent",
          stroke: filled ? "#0E7F7D" : "transparent",
          strokeWidth: 1.4,
          filter: filled ? "url(#zoneGlow)" : undefined,
          onClick: readOnly ? undefined : () => onToggle(zone.part),
        };
        const title = `${BODY_PART_LABELS[zone.part]}${twoSided && record && side !== "both" ? ` (${SIDE_LABELS[side]})` : ""}`;
        return s.kind === "rect" ? (
          <rect
            key={i}
            x={s.x}
            y={s.y}
            width={s.w}
            height={s.h}
            rx={s.r ?? 6}
            {...common}
          >
            <title>{title}</title>
          </rect>
        ) : (
          <ellipse key={i} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} {...common}>
            <title>{title}</title>
          </ellipse>
        );
      })}
    </g>
  );
}

function BodyFigure({
  view,
  records,
  onToggle,
  readOnly,
}: {
  view: View;
  records: BodyPartRecord[];
  onToggle: (part: BodyPart) => void;
  readOnly?: boolean;
}) {
  const zones = view === "front" ? FRONT_ZONES : BACK_ZONES;
  return (
    <div className="flex flex-col items-center">
      <div className="rounded-card bg-gradient-to-b from-aqua-50/80 to-white px-2.5 pb-1 pt-3 ring-1 ring-aqua-100">
        <svg
          viewBox="0 0 120 252"
          className="h-auto w-full max-w-[140px] sm:max-w-[150px]"
          role="group"
          aria-label={view === "front" ? "신체 앞면" : "신체 뒷면"}
        >
          <defs>
            <linearGradient id="bodyFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#C9E9E6" />
              <stop offset="100%" stopColor="#A9DBD7" />
            </linearGradient>
            <linearGradient id="zoneFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2AB3AF" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#0E7F7D" stopOpacity="0.9" />
            </linearGradient>
            <filter id="zoneGlow" x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow
                dx="0"
                dy="0"
                stdDeviation="3"
                floodColor="#149D9A"
                floodOpacity="0.55"
              />
            </filter>
          </defs>
          <Silhouette />
          {zones.map((z) => (
            <ZoneShapes
              key={z.part}
              zone={z}
              view={view}
              record={records.find((r) => r.part === z.part)}
              onToggle={onToggle}
              readOnly={readOnly}
            />
          ))}
        </svg>
        <p className="pb-1 pt-1.5 text-center text-sm font-bold text-ink-sub">
          {view === "front" ? "앞면" : "뒷면"}
        </p>
      </div>
    </div>
  );
}

const CHIP_ORDER: BodyPart[] = [
  "neck_shoulder",
  "back",
  "waist",
  "abdomen",
  "pelvis_hip",
  "arm",
  "knee",
  "leg",
  "foot_ankle",
  "etc",
];

export default function BodyMap({
  value,
  onChange,
  readOnly = false,
  compactChips = false,
}: {
  value: BodyPartRecord[];
  onChange?: (next: BodyPartRecord[]) => void;
  readOnly?: boolean;
  compactChips?: boolean;
}) {
  const recordByPart = new Map(value.map((r) => [r.part, r]));

  const toggle = (part: BodyPart) => {
    if (readOnly || !onChange) return;
    if (recordByPart.has(part)) {
      onChange(value.filter((r) => r.part !== part));
    } else {
      onChange([...value, { part, side: "both" }]);
    }
  };

  const setSide = (part: BodyPart, side: BodySide) => {
    if (readOnly || !onChange) return;
    onChange(value.map((r) => (r.part === part ? { ...r, side } : r)));
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <div className="flex flex-1 justify-center gap-4 sm:gap-6">
        <BodyFigure
          view="front"
          records={value}
          onToggle={toggle}
          readOnly={readOnly}
        />
        <BodyFigure
          view="back"
          records={value}
          onToggle={toggle}
          readOnly={readOnly}
        />
      </div>
      <div
        className={`flex flex-wrap content-start gap-2 sm:w-48 sm:flex-col ${compactChips ? "sm:w-44" : ""}`}
      >
        {CHIP_ORDER.map((part) => {
          const record = recordByPart.get(part);
          const selected = !!record;
          const sided = SIDED_PARTS.includes(part);
          return (
            <div key={part} className="flex flex-col gap-1">
              <button
                type="button"
                disabled={readOnly}
                onClick={() => toggle(part)}
                className={`touch-target inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-all ${
                  selected
                    ? "bg-gradient-to-r from-aqua-500 to-aqua-700 text-white shadow-[0_2px_8px_rgba(14,127,125,0.35)]"
                    : "bg-white text-ink-soft ring-1 ring-stone-line"
                } ${readOnly ? "" : "hover:ring-aqua-400"}`}
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full ${selected ? "bg-white" : "bg-aqua-100 ring-1 ring-aqua-400"}`}
                />
                <span className="whitespace-nowrap">
                  {BODY_PART_LABELS[part]}
                  {selected && sided && (record.side ?? "both") !== "both"
                    ? ` · ${SIDE_LABELS[record.side!]}`
                    : ""}
                </span>
              </button>
              {/* 좌/우 구분 토글 — 양측 부위 선택 시에만 노출 */}
              {selected && sided && !readOnly && (
                <div className="ml-2 flex gap-1">
                  {(["left", "both", "right"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSide(part, s)}
                      className={`rounded-full px-2.5 py-1 text-xs font-bold transition-colors ${
                        (record.side ?? "both") === s
                          ? "bg-deep-800 text-white"
                          : "bg-white text-ink-sub ring-1 ring-stone-line hover:bg-aqua-50"
                      }`}
                    >
                      {SIDE_LABELS[s]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** 읽기 전용 부위 태그 나열 */
export function BodyPartTags({ records }: { records: BodyPartRecord[] }) {
  if (!records.length)
    return <span className="text-sm text-ink-faint">기록 없음</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {records.map((r, i) => (
        <span
          key={`${r.part}-${i}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-aqua-100 px-2.5 py-0.5 text-xs font-bold text-aqua-800 whitespace-nowrap"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-aqua-500" />
          {BODY_PART_LABELS[r.part]}
          {r.side && r.side !== "both" ? ` · ${SIDE_LABELS[r.side]}` : ""}
          {r.subPart ? ` · ${r.subPart}` : ""}
        </span>
      ))}
    </div>
  );
}
