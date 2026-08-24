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

/**
 * ── 인체 실루엣 ────────────────────────────────────────────────
 *
 * 몸의 절반(화면 왼쪽, 정수리 → 가랑이)만 점으로 적고, 좌우로 접어서
 * 하나의 닫힌 윤곽선을 만든다. 이렇게 하는 이유:
 *
 *  1. 좌우가 정확히 대칭이 된다. 손으로 양쪽 좌표를 적으면 반드시 어긋난다.
 *  2. 머리·몸통·팔·다리가 **끊기지 않은 하나의 윤곽**이 된다.
 *     예전 그림은 몸통 위에 팔을 따로 얹어 두어서, 어깨에서 팔이
 *     흘러나오지 않고 소매를 걸친 것처럼 보였다. 몸통도 밑단이 둥근
 *     통짜 덩어리라 큰 티셔츠 하나 걸친 모습에 가까웠다.
 *  3. 비례를 한자리에서 조절할 수 있다.
 *
 * 비례는 8등신 중립 — 어깨가 골반보다 아주 조금 넓고, 가슴·엉덩이를
 * 강조하지 않는다. 남녀 어느 쪽으로도 읽히지 않게 하려는 것이다.
 */
type Point = [number, number];

/** 화면 왼쪽 절반의 윤곽 — 정수리에서 가랑이까지 */
const HALF_OUTLINE: Point[] = [
  // 머리 — 두개골이 가장 넓은 곳은 위쪽이고, 광대에서 턱으로 각이 진다.
  // (위아래로 고른 타원을 그리면 달걀이 되어 풍선처럼 떠 보인다)
  [60, 16],
  [53.8, 18],
  [49.2, 23],
  [48.4, 29],
  [49.4, 35],
  [51.2, 39.5],
  [53.4, 42],
  [54.6, 45.5],
  // 목 — 짧고 굵게. 여기가 가늘고 길면 머리가 풍선처럼 떠 보인다
  [53.4, 48.5],
  [52.8, 51.5],
  // 등세모근 → 어깨 → 삼각근
  [49.6, 54],
  [44.6, 57],
  [39.2, 60],
  [35.2, 64],
  [33.5, 69.5],
  // 위팔 바깥
  [32.9, 78],
  [32.1, 90],
  [31.4, 102],
  // 아래팔 바깥 → 손목
  [30.8, 113],
  [30.3, 123],
  [29.9, 132],
  // 손 — 손목보다 넓게 벌어졌다가 둥글게 맺는다
  [28.6, 139],
  [28.8, 149],
  [30.8, 154],
  [33.6, 151],
  [34.8, 143],
  [35.0, 134],
  // 아래팔 안쪽
  [36.1, 123],
  [37.4, 113],
  // 위팔 안쪽 → 겨드랑이
  [38.6, 102],
  [40.1, 90],
  [41.4, 78],
  // 몸통 옆선 — 가슴이 넓고 허리에서 들어갔다 골반에서 다시 벌어진다
  [42.6, 77],
  [42.5, 85],
  [43.2, 94],
  [44.4, 103],
  [43.8, 112],
  [42.6, 121],
  [41.6, 131],
  [41.4, 139],
  // 허벅지 바깥 → 무릎
  [41.2, 147],
  [40.0, 163],
  [41.8, 181],
  // 종아리 — 바깥쪽이 볼록해야 통짜 막대로 보이지 않는다
  [39.4, 198],
  [42.8, 219],
  [46.6, 236],
  // 발
  [46.0, 243],
  [43.6, 250],
  [43.0, 255],
  [49.0, 258],
  [56.0, 257.5],
  [57.0, 251],
  [55.2, 244],
  // 발목 안쪽 → 종아리 안쪽
  [53.6, 236],
  [54.0, 219],
  [52.0, 199],
  // 무릎 안쪽 → 허벅지 안쪽 → 가랑이
  [53.6, 181],
  [55.2, 163],
  [57.4, 151],
  [60, 143],
];

const CENTER_X = 60;

/** 반쪽 점들을 좌우로 접어 닫힌 윤곽 점열로 만든다 */
function mirrored(half: Point[]): Point[] {
  const back = half
    .slice(1, -1)
    .reverse()
    .map(([x, y]) => [CENTER_X * 2 - x, y] as Point);
  return [...half, ...back];
}

/**
 * 점들을 부드러운 닫힌 곡선으로 잇는다 (Catmull-Rom → 3차 베지어).
 * 점만 옮기면 곡선이 알아서 따라오므로, 비례를 고칠 때 제어점을 다시
 * 계산할 필요가 없다.
 */
function closedSpline(pts: Point[], tension = 0.22): string {
  const n = pts.length;
  const at = (i: number) => pts[(i + n) % n];
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = at(i - 1);
    const [x1, y1] = at(i);
    const [x2, y2] = at(i + 1);
    const [x3, y3] = at(i + 2);
    const c1x = x1 + (x2 - x0) * tension;
    const c1y = y1 + (y2 - y0) * tension;
    const c2x = x2 - (x3 - x1) * tension;
    const c2y = y2 - (y3 - y1) * tension;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  }
  return `${d} Z`;
}

const BODY_PATH = closedSpline(mirrored(HALF_OUTLINE));

interface Zone {
  part: BodyPart;
  shapes: Array<
    | { kind: "rect"; x: number; y: number; w: number; h: number; r?: number }
    | { kind: "ellipse"; cx: number; cy: number; rx: number; ry: number }
  >;
}

/*
 * 부위 영역은 단순한 네모·타원으로 두고, 그리는 순간에 실루엣으로
 * 잘라 낸다(clipPath). 그래서 고른 부위가 몸 밖으로 삐져나오지 않고
 * 몸의 곡선을 그대로 따라간다 — 예전에는 어깨를 고르면 몸보다 넓은
 * 알약이 튀어나왔다.
 * 누르는 자리는 자르지 않은 원래 네모라 손끝이 닿기 쉬운 크기를 유지한다.
 */
const ARM_SHAPES: Zone["shapes"] = [
  { kind: "rect", x: 26, y: 72, w: 15, h: 88, r: 7 },
  { kind: "rect", x: 79, y: 72, w: 15, h: 88, r: 7 },
];
const LEG_SHAPES: Zone["shapes"] = [
  { kind: "rect", x: 36, y: 141, w: 23, h: 93, r: 11 },
  { kind: "rect", x: 61, y: 141, w: 23, h: 93, r: 11 },
];
const FOOT_SHAPES: Zone["shapes"] = [
  { kind: "rect", x: 38, y: 232, w: 22, h: 30, r: 9 },
  { kind: "rect", x: 60, y: 232, w: 22, h: 30, r: 9 },
];
const KNEE_SHAPES: Zone["shapes"] = [
  { kind: "ellipse", cx: 47.7, cy: 181, rx: 7.4, ry: 10 },
  { kind: "ellipse", cx: 72.3, cy: 181, rx: 7.4, ry: 10 },
];
/*
 * 몸통 부위는 네모가 아니라 타원으로 잡는다.
 * 네모로 칠하면 밑단이 수평으로 뚝 끊겨 옷을 걸친 것처럼 보였다.
 * 타원 + 가장자리로 갈수록 옅어지는 칠은 '그 언저리'로 읽힌다.
 */
const SHOULDER_SHAPE: Zone["shapes"] = [
  { kind: "ellipse", cx: 60, cy: 67, rx: 22, ry: 11.5 },
];

const FRONT_ZONES: Zone[] = [
  { part: "neck_shoulder", shapes: SHOULDER_SHAPE },
  { part: "abdomen", shapes: [{ kind: "ellipse", cx: 60, cy: 97, rx: 18, ry: 20 }] },
  { part: "pelvis_hip", shapes: [{ kind: "ellipse", cx: 60, cy: 130, rx: 19, ry: 15 }] },
  { part: "arm", shapes: ARM_SHAPES },
  { part: "leg", shapes: LEG_SHAPES },
  { part: "knee", shapes: KNEE_SHAPES },
  { part: "foot_ankle", shapes: FOOT_SHAPES },
];

const BACK_ZONES: Zone[] = [
  { part: "neck_shoulder", shapes: SHOULDER_SHAPE },
  { part: "back", shapes: [{ kind: "ellipse", cx: 60, cy: 89, rx: 18, ry: 14 }] },
  { part: "waist", shapes: [{ kind: "ellipse", cx: 60, cy: 111, rx: 17, ry: 9 }] },
  { part: "pelvis_hip", shapes: [{ kind: "ellipse", cx: 60, cy: 132, rx: 19, ry: 14 }] },
  { part: "arm", shapes: ARM_SHAPES },
  { part: "leg", shapes: LEG_SHAPES },
  { part: "knee", shapes: KNEE_SHAPES },
  { part: "foot_ankle", shapes: FOOT_SHAPES },
];

/** 앞/뒷면 구분용 해부 라인 — 있는 듯 없는 듯한 굵기로만 */
function AnatomyLines({ view }: { view: View }) {
  return view === "front" ? (
    <g
      fill="none"
      stroke="rgb(var(--c-aqua-700))"
      strokeWidth="0.7"
      opacity="0.28"
      strokeLinecap="round"
    >
      {/* 쇄골 */}
      <path d="M47.5 65 Q54 69.5 60 68.8 Q66 69.5 72.5 65" />
      {/* 명치에서 배꼽으로 내려오는 정중선 */}
      <path d="M60 77 V 113" opacity="0.55" />
    </g>
  ) : (
    <g
      fill="none"
      stroke="rgb(var(--c-aqua-700))"
      strokeWidth="0.7"
      opacity="0.28"
      strokeLinecap="round"
    >
      {/* 척주 */}
      <path d="M60 59 V 134" />
      {/* 견갑골 */}
      <path d="M49.5 71 Q54.5 77.5 53.2 86" />
      <path d="M70.5 71 Q65.5 77.5 66.8 86" />
      {/* 골반 라인 */}
      <path d="M48.5 136 Q60 143.5 71.5 136" />
    </g>
  );
}

/** 실루엣 — 윤곽선 하나 + 부드러운 안쪽 음영 */
function Silhouette({ view, clipId }: { view: View; clipId: string }) {
  return (
    <g>
      <path d={BODY_PATH} fill="url(#bodyFill)" />
      {/* 몸 안쪽에만 얹히는 은은한 입체감 — 왼쪽에서 들어오는 빛 한 겹 */}
      <rect
        x="24"
        y="6"
        width="72"
        height="256"
        fill="url(#bodyShade)"
        clipPath={`url(#${clipId})`}
      />
      <AnatomyLines view={view} />
      <path
        d={BODY_PATH}
        fill="none"
        stroke="url(#bodyEdge)"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
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

/** 부위 영역 하나를 svg 요소로 */
function ZoneShape({
  s,
  ...rest
}: {
  s: Zone["shapes"][number];
} & Record<string, unknown>) {
  return s.kind === "rect" ? (
    <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={s.r ?? 6} {...rest} />
  ) : (
    <ellipse cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} {...rest} />
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
  const clipId = `bodyClip-${view}`;

  /** 이 shape 이 칠해져야 하는가 (좌/우 구분 반영) */
  const isFilled = (zone: Zone, i: number) => {
    const record = records.find((r) => r.part === zone.part);
    if (!record) return false;
    const twoSided = zone.shapes.length === 2;
    const side = record.side ?? "both";
    return side === "both" || !twoSided || shapeBodySide(view, i) === side;
  };

  const label = (zone: Zone) => {
    const record = records.find((r) => r.part === zone.part);
    const side = record?.side ?? "both";
    const twoSided = zone.shapes.length === 2;
    return `${BODY_PART_LABELS[zone.part]}${twoSided && record && side !== "both" ? ` (${SIDE_LABELS[side]})` : ""}`;
  };

  return (
    <div className="flex flex-col items-center">
      <div className="rounded-card bg-gradient-to-b from-aqua-50/70 to-card px-2.5 pb-1.5 pt-3 ring-1 ring-aqua-100">
        <svg
          /* 사람 하나는 세로로 길다 — 틀을 몸에 맞춰 잘라야 여백이 안 뜬다 */
          viewBox="26 10 68 252"
          className="h-auto w-full max-w-[80px] sm:max-w-[98px]"
          role="group"
          aria-label={view === "front" ? "신체 앞면" : "신체 뒷면"}
        >
          <defs>
            <clipPath id={clipId}>
              <path d={BODY_PATH} />
            </clipPath>
            <linearGradient id="bodyFill" x1="0" y1="0" x2="0.35" y2="1">
              <stop offset="0%" stopColor="#DCEEEB" />
              <stop offset="52%" stopColor="#C7E3DF" />
              <stop offset="100%" stopColor="#B4D9D4" />
            </linearGradient>
            <linearGradient id="bodyShade" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.42" />
              <stop offset="42%" stopColor="#FFFFFF" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#0B706E" stopOpacity="0.07" />
            </linearGradient>
            <linearGradient id="bodyEdge" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8CC4C0" />
              <stop offset="100%" stopColor="#6FB0AB" />
            </linearGradient>
            <radialGradient id="zoneFill" cx="0.5" cy="0.46" r="0.66">
              <stop offset="0%" stopColor="#2AB3AF" stopOpacity="0.96" />
              <stop offset="60%" stopColor="#12908D" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#0B706E" stopOpacity="0.42" />
            </radialGradient>
          </defs>

          <Silhouette view={view} clipId={clipId} />

          {/*
            누르는 자리 — 투명하고 자르지 않는다.
            문서 순서상 먼저 두어야 색칠한 층이 그 위에 얹히는데,
            색칠한 층은 pointer-events 를 받지 않으므로 누름은 그대로
            이 네모로 내려온다.
          */}
          {!readOnly &&
            zones.map((zone) =>
              zone.shapes.map((s, i) => (
                <ZoneShape
                  key={`hit-${zone.part}-${i}`}
                  s={s}
                  data-part={zone.part}
                  fill="transparent"
                  className="cursor-pointer"
                  onClick={() => onToggle(zone.part)}
                >
                  <title>{label(zone)}</title>
                </ZoneShape>
              )),
            )}

          {/* 색칠 — 실루엣으로 잘라 몸 밖으로 나가지 않게 */}
          <g clipPath={`url(#${clipId})`} pointerEvents="none">
            {zones.map((zone) =>
              zone.shapes.map((s, i) => {
                const filled = isFilled(zone, i);
                if (!filled && readOnly) return null;
                return (
                  <ZoneShape
                    key={`fill-${zone.part}-${i}`}
                    s={s}
                    fill={filled ? "url(#zoneFill)" : "rgba(20,157,154,0.035)"}
                  />
                );
              }),
            )}
          </g>

          {/* 고른 부위 위에 다시 얹는 몸 윤곽 — 색이 몸 모양을 따라간 것을 분명히 */}
          <path
            d={BODY_PATH}
            fill="none"
            stroke="url(#bodyEdge)"
            strokeWidth="0.9"
            strokeLinejoin="round"
            pointerEvents="none"
          />
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
