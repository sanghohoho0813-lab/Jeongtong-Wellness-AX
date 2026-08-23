"use client";

/**
 * 신체 부위 선택 Body Map (앞면 / 뒷면) — 시그니처 현장 기능
 *
 * - 자연스러운 인체 실루엣 + 앞/뒷면 디테일 구분(쇄골 / 등 중앙선·엉덩이 라인)
 * - 비선택 부위: 은은한 가이드 아웃라인 → 어디를 누를 수 있는지 즉시 인지
 * - 선택 부위: Aqua gradient fill + glow + 중심 마커
 * - 실루엣 터치와 부위 칩 양방향 동기화, 좌/우 구분(side) 지원
 * - 데이터 구조(BodyPartRecord[])와 부위 구분은 기존 그대로 유지
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
  { part: "neck_shoulder", shapes: [{ kind: "rect", x: 30, y: 29, w: 60, h: 21, r: 10 }] },
  { part: "abdomen", shapes: [{ kind: "rect", x: 40, y: 72, w: 40, h: 30, r: 10 }] },
  { part: "pelvis_hip", shapes: [{ kind: "rect", x: 36, y: 104, w: 48, h: 30, r: 12 }] },
  {
    part: "arm",
    shapes: [
      { kind: "rect", x: 17, y: 47, w: 17, h: 78, r: 8 },
      { kind: "rect", x: 86, y: 47, w: 17, h: 78, r: 8 },
    ],
  },
  {
    part: "knee",
    shapes: [
      { kind: "ellipse", cx: 48.5, cy: 174, rx: 10.5, ry: 12.5 },
      { kind: "ellipse", cx: 71.5, cy: 174, rx: 10.5, ry: 12.5 },
    ],
  },
  {
    part: "leg",
    shapes: [
      { kind: "rect", x: 37, y: 138, w: 22, h: 86, r: 10 },
      { kind: "rect", x: 61, y: 138, w: 22, h: 86, r: 10 },
    ],
  },
  {
    part: "foot_ankle",
    shapes: [
      { kind: "rect", x: 35, y: 224, w: 25, h: 20, r: 8 },
      { kind: "rect", x: 60, y: 224, w: 25, h: 20, r: 8 },
    ],
  },
];

const BACK_ZONES: Zone[] = [
  { part: "neck_shoulder", shapes: [{ kind: "rect", x: 30, y: 29, w: 60, h: 21, r: 10 }] },
  { part: "back", shapes: [{ kind: "rect", x: 37, y: 51, w: 46, h: 34, r: 10 }] },
  { part: "waist", shapes: [{ kind: "rect", x: 37, y: 86, w: 46, h: 21, r: 10 }] },
  { part: "pelvis_hip", shapes: [{ kind: "rect", x: 36, y: 108, w: 48, h: 26, r: 12 }] },
  {
    part: "arm",
    shapes: [
      { kind: "rect", x: 17, y: 47, w: 17, h: 78, r: 8 },
      { kind: "rect", x: 86, y: 47, w: 17, h: 78, r: 8 },
    ],
  },
  {
    part: "leg",
    shapes: [
      { kind: "rect", x: 37, y: 138, w: 22, h: 86, r: 10 },
      { kind: "rect", x: 61, y: 138, w: 22, h: 86, r: 10 },
    ],
  },
  {
    part: "foot_ankle",
    shapes: [
      { kind: "rect", x: 35, y: 224, w: 25, h: 20, r: 8 },
      { kind: "rect", x: 60, y: 224, w: 25, h: 20, r: 8 },
    ],
  },
];

/** 인체 실루엣 — 자연스러운 곡선의 현대적 human figure */
function Silhouette({ view }: { view: View }) {
  return (
    <g fill="url(#bodyFill)" stroke="#7FC5C1" strokeWidth="0.9" strokeLinejoin="round">
      {/* 머리 */}
      <ellipse cx="60" cy="16" rx="11" ry="12.5" />
      {/* 목 + 몸통 (어깨 곡선 → 허리 잘록 → 골반) */}
      <path
        d="M53 25.5
           Q53.5 32.5 48.5 35.8
           Q36.5 38.5 33.5 45
           Q31.5 49 32 55
           L34.5 88
           Q35.5 96 34.8 104
           L33.8 122
           Q33.5 132 38.5 136
           Q48 141.5 60 141.5
           Q72 141.5 81.5 136
           Q86.5 132 86.2 122
           L85.2 104
           Q84.5 96 85.5 88
           L88 55
           Q88.5 49 86.5 45
           Q83.5 38.5 71.5 35.8
           Q66.5 32.5 67 25.5
           Z"
      />
      {/* 팔 (어깨 → 손목, 자연스러운 테이퍼) */}
      <path
        d="M33.5 45
           Q26 48.5 24.5 56
           L21 100
           Q20 112 21.5 120
           Q22.3 125.5 27 125.2
           Q31.2 124.8 31.8 118
           L33.2 100
           L34.6 60
           Q34.9 50 33.5 45
           Z"
      />
      <path
        d="M86.5 45
           Q94 48.5 95.5 56
           L99 100
           Q100 112 98.5 120
           Q97.7 125.5 93 125.2
           Q88.8 124.8 88.2 118
           L86.8 100
           L85.4 60
           Q85.1 50 86.5 45
           Z"
      />
      {/* 손 */}
      <ellipse cx="24.6" cy="131.5" rx="4" ry="5.6" />
      <ellipse cx="95.4" cy="131.5" rx="4" ry="5.6" />
      {/* 다리 (허벅지 → 무릎 → 종아리 → 발목) */}
      <path
        d="M38.5 137.5
           Q40.5 158 42.8 172
           Q44.2 184 43.6 198
           L43.2 221
           Q43.2 228.5 48.5 229
           L53.3 229
           Q57.4 228.5 57.6 221.5
           L58.4 174
           L59.2 141.4
           Q48.5 141.8 38.5 137.5
           Z"
      />
      <path
        d="M81.5 137.5
           Q79.5 158 77.2 172
           Q75.8 184 76.4 198
           L76.8 221
           Q76.8 228.5 71.5 229
           L66.7 229
           Q62.6 228.5 62.4 221.5
           L61.6 174
           L60.8 141.4
           Q71.5 141.8 81.5 137.5
           Z"
      />
      {/* 발 */}
      <path d="M43.2 228.5 Q39.5 236 44.8 239.5 L56 239.5 Q59.4 236.5 57.8 229.5 Z" />
      <path d="M76.8 228.5 Q80.5 236 75.2 239.5 L64 239.5 Q60.6 236.5 62.2 229.5 Z" />

      {/* 앞/뒷면 디테일 (fill 없음, 은은한 라인) */}
      {view === "front" ? (
        <g fill="none" stroke="#6FB9B5" strokeWidth="1" opacity="0.55" strokeLinecap="round">
          {/* 쇄골 */}
          <path d="M47 44.5 Q54 48 60 47.2 Q66 48 73 44.5" />
        </g>
      ) : (
        <g fill="none" stroke="#6FB9B5" strokeWidth="1" opacity="0.55" strokeLinecap="round">
          {/* 등 중앙선 */}
          <path d="M60 40 V 116" />
          {/* 어깨뼈 */}
          <path d="M47 53 Q52.5 58.5 51 66" />
          <path d="M73 53 Q67.5 58.5 69 66" />
          {/* 엉덩이 라인 */}
          <path d="M47 129 Q60 136.5 73 129" />
        </g>
      )}
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

function shapeCenter(s: Zone["shapes"][number]): { cx: number; cy: number } {
  return s.kind === "rect"
    ? { cx: s.x + s.w / 2, cy: s.y + s.h / 2 }
    : { cx: s.cx, cy: s.cy };
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
        const { cx, cy } = shapeCenter(s);
        const common = {
          className: readOnly
            ? ""
            : "cursor-pointer transition-[fill] hover:fill-[rgba(20,157,154,0.14)]",
          // 편집 모드에서만 은은한 가이드로 터치 가능 영역을 보여준다
          fill: filled
            ? "url(#zoneFill)"
            : readOnly
              ? "transparent"
              : "rgba(20,157,154,0.035)",
          stroke: filled
            ? "#0E7F7D"
            : readOnly
              ? "transparent"
              : "rgba(20,157,154,0.3)",
          strokeWidth: filled ? 1.4 : 0.9,
          filter: filled ? "url(#zoneGlow)" : undefined,
          onClick: readOnly ? undefined : () => onToggle(zone.part),
        };
        const title = `${BODY_PART_LABELS[zone.part]}${twoSided && record && side !== "both" ? ` (${SIDE_LABELS[side]})` : ""}`;
        return (
          <g key={i}>
            {s.kind === "rect" ? (
              <rect
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
              <ellipse cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} {...common}>
                <title>{title}</title>
              </ellipse>
            )}
            {/* 선택 마커 */}
            {filled && (
              <g pointerEvents="none">
                <circle cx={cx} cy={cy} r="4.2" fill="rgba(255,255,255,0.9)" />
                <circle cx={cx} cy={cy} r="2" fill="#0E7F7D" />
              </g>
            )}
          </g>
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
      <div className="rounded-card bg-gradient-to-b from-aqua-50/80 to-card px-2.5 pb-1.5 pt-3 ring-1 ring-aqua-100">
        <svg
          viewBox="0 0 120 246"
          className="h-auto w-full max-w-[150px] sm:max-w-[160px]"
          role="group"
          aria-label={view === "front" ? "신체 앞면" : "신체 뒷면"}
        >
          <defs>
            <linearGradient id="bodyFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#D3EDEA" />
              <stop offset="55%" stopColor="#BCE4E0" />
              <stop offset="100%" stopColor="#A5DAD5" />
            </linearGradient>
            <linearGradient id="zoneFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2AB3AF" stopOpacity="0.92" />
              <stop offset="100%" stopColor="#0E7F7D" stopOpacity="0.92" />
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
          <Silhouette view={view} />
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
        <p className="pb-1 pt-1.5 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-0.5 text-xs font-bold text-ink-sub ring-1 ring-stone-line">
            <span
              className={`h-1.5 w-1.5 rounded-full ${view === "front" ? "bg-aqua-500" : "bg-deep-600"}`}
            />
            {view === "front" ? "앞면" : "뒷면"}
          </span>
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
      {/*
        읽기 전용일 때는 **고른 부위만** 보여 준다.
        고를 수도 없는 칩 열한 개를 늘어놓으면 폰에서 한 화면 반을 먹으면서
        정작 "이 분은 어디를 주로 하시나"는 그 안에 묻힌다.
      */}
      <div
        className={`flex flex-wrap content-start gap-2 sm:w-48 sm:flex-col ${compactChips ? "sm:w-44" : ""}`}
      >
        {CHIP_ORDER.filter((part) => !readOnly || recordByPart.has(part)).map((part) => {
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
                    ? "bg-gradient-to-r from-aqua-650 to-aqua-850 text-white shadow-[0_2px_8px_rgba(14,127,125,0.35)]"
                    : "bg-card text-ink-soft ring-1 ring-stone-line"
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
                          ? "bg-sel text-sel-ink"
                          : "bg-card text-ink-sub ring-1 ring-stone-line hover:bg-aqua-50"
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
