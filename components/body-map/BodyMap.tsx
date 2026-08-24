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
 * ── 인체 그림 ──────────────────────────────────────────────────
 *
 * 앞·뒷면 그림은 매장에서 준 실제 해부 도해(public/body/*.png)를 쓴다.
 *
 * 왜 직접 그리지 않는가
 * ---------------------
 * SVG 좌표를 손으로 찍어 사람 몸을 그려 봤지만, 비례를 실측에 맞춰도
 * 전문가가 그린 그림의 밀도(근육 결·손발 형태)까지는 따라가지 못했다.
 * 도해는 이미 있는 것을 쓰고, 우리는 그 위에 부위를 칠하는 일만 한다.
 *
 * 그림 규격 (두 장이 완전히 같은 자리에 있어야 부위 좌표를 공유한다)
 *   캔버스 449 × 1059 · 몸 세로 19~1037
 *   턱 136 · 어깨 181 · 가슴 273 · 배꼽 385 · 골반 466
 *   가랑이 541 · 무릎 751 · 발목 965 · 바닥 1037
 * 아래 부위 좌표는 전부 이 그림에서 직접 잰 값이다.
 *
 * 원본에는 뒷면에 청록색 얼룩 두 개가 그려져 있었다. 우리 화면은 부위를
 * 직접 칠하므로 그건 지우고 넣었다.
 */
const IMG_W = 449;
const IMG_H = 1059;
const IMG_SRC: Record<View, string> = {
  front: "/body/front.png",
  back: "/body/back.png",
};

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
  { kind: "rect", x: 14, y: 236, w: 126, h: 384, r: 40 },
  { kind: "rect", x: 309, y: 236, w: 126, h: 384, r: 40 },
];
const LEG_SHAPES: Zone["shapes"] = [
  { kind: "rect", x: 112, y: 548, w: 112, h: 390, r: 46 },
  { kind: "rect", x: 225, y: 548, w: 112, h: 390, r: 46 },
];
const FOOT_SHAPES: Zone["shapes"] = [
  { kind: "rect", x: 112, y: 936, w: 112, h: 112, r: 40 },
  { kind: "rect", x: 225, y: 936, w: 112, h: 112, r: 40 },
];
const KNEE_SHAPES: Zone["shapes"] = [
  { kind: "ellipse", cx: 163, cy: 755, rx: 42, ry: 56 },
  { kind: "ellipse", cx: 286, cy: 755, rx: 42, ry: 56 },
];
/*
 * 몸통 부위는 네모가 아니라 타원으로 잡는다.
 * 네모로 칠하면 밑단이 수평으로 뚝 끊겨 옷을 걸친 것처럼 보인다.
 * 타원 + 가장자리로 갈수록 옅어지는 칠은 '그 언저리'로 읽힌다.
 */
const SHOULDER_SHAPE: Zone["shapes"] = [
  { kind: "ellipse", cx: 224, cy: 202, rx: 100, ry: 54 },
];

const FRONT_ZONES: Zone[] = [
  { part: "neck_shoulder", shapes: SHOULDER_SHAPE },
  { part: "abdomen", shapes: [{ kind: "ellipse", cx: 224, cy: 348, rx: 82, ry: 100 }] },
  { part: "pelvis_hip", shapes: [{ kind: "ellipse", cx: 224, cy: 482, rx: 92, ry: 62 }] },
  { part: "arm", shapes: ARM_SHAPES },
  { part: "leg", shapes: LEG_SHAPES },
  { part: "knee", shapes: KNEE_SHAPES },
  { part: "foot_ankle", shapes: FOOT_SHAPES },
];

const BACK_ZONES: Zone[] = [
  { part: "neck_shoulder", shapes: SHOULDER_SHAPE },
  { part: "back", shapes: [{ kind: "ellipse", cx: 224, cy: 330, rx: 84, ry: 86 }] },
  { part: "waist", shapes: [{ kind: "ellipse", cx: 224, cy: 428, rx: 80, ry: 40 }] },
  { part: "pelvis_hip", shapes: [{ kind: "ellipse", cx: 224, cy: 492, rx: 92, ry: 60 }] },
  { part: "arm", shapes: ARM_SHAPES },
  { part: "leg", shapes: LEG_SHAPES },
  { part: "knee", shapes: KNEE_SHAPES },
  { part: "foot_ankle", shapes: FOOT_SHAPES },
];

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
  const src = IMG_SRC[view];
  /*
   * 색칠을 몸 안쪽으로만 가두는 가림막.
   * 그림 자체를 가림막으로 쓴다 — 배경이 투명하고 몸만 불투명하므로,
   * 알파를 그대로 쓰면 손가락 사이까지 정확히 따라간다.
   * (직접 그린 윤곽선일 때는 path 로 잘랐지만, 이제 그럴 path 가 없다)
   */
  const maskId = `bodyMask-${view}`;

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
          viewBox={`0 0 ${IMG_W} ${IMG_H}`}
          /*
            팔을 벌린 도해라 가로가 넓다. 예전 그림과 같은 폭으로 두면
            사람이 그만큼 작아져서, 부위를 손끝으로 짚기 어려워진다.
            사람의 키가 예전과 비슷해 보이도록 폭을 키운다.
          */
          className="h-auto w-full max-w-[112px] sm:max-w-[132px]"
          role="group"
          aria-label={view === "front" ? "신체 앞면" : "신체 뒷면"}
        >
          <defs>
            <mask
              id={maskId}
              maskUnits="userSpaceOnUse"
              x="0"
              y="0"
              width={IMG_W}
              height={IMG_H}
              style={{ maskType: "alpha" }}
            >
              <image href={src} x="0" y="0" width={IMG_W} height={IMG_H} />
            </mask>
            {/*
              색칠은 원본 도해처럼 **부드럽게 번지게** 한다.
              선명한 타원으로 칠하면 몸 위에 스티커를 붙인 것처럼 보이고,
              그 아래 그림의 윤곽선도 가려 버린다. 가장자리로 갈수록
              투명해지는 그라데이션에 흐림을 한 겹 더한다.
            */}
            <radialGradient id="zoneFill" cx="0.5" cy="0.46" r="0.62">
              <stop offset="0%" stopColor="#1AA5A1" stopOpacity="0.62" />
              <stop offset="55%" stopColor="#12908D" stopOpacity="0.42" />
              <stop offset="100%" stopColor="#0B706E" stopOpacity="0" />
            </radialGradient>
            <filter id="zoneBlur" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="16" />
            </filter>
          </defs>

          {/* 사람 그림 */}
          <image
            href={src}
            x="0"
            y="0"
            width={IMG_W}
            height={IMG_H}
            className="dark:opacity-90"
          />

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

          {/* 색칠 — 그림의 몸 모양으로 잘라 밖으로 나가지 않게 */}
          <g
            mask={`url(#${maskId})`}
            filter="url(#zoneBlur)"
            pointerEvents="none"
          >
            {zones.map((zone) =>
              zone.shapes.map((s, i) => {
                const filled = isFilled(zone, i);
                if (!filled) return null;
                return (
                  <ZoneShape
                    key={`fill-${zone.part}-${i}`}
                    s={s}
                    fill="url(#zoneFill)"
                  />
                );
              }),
            )}
          </g>
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
