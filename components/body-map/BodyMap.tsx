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
 * 비례 — 해부학 교과서의 7.5등신
 * ------------------------------
 * 앞서 그린 그림은 8.2등신에 팔뚝 두께가 머리 너비의 1/3밖에 안 됐다.
 * 패션 일러스트의 비례이고, 사람 몸으로 보면 머리가 작고 팔다리만 가늘게
 * 늘어난 모습이다. 실제 성인의 비례로 다시 잡았다.
 *
 * 기준선 (머리 하나 = 32, 전체 키 = 240 = 7.5머리)
 *   정수리 14 · 턱 46 · 어깨 62 · 젖꼭지 78 · 배꼽 112 · 골반 132
 *   가랑이 141 · 무릎 187 · 발목 242 · 바닥 254
 *
 * 실측 비례로 맞춘 것들 (성인 인체 계측 기준, 키 대비)
 *   어깨너비 23%  · 가슴 18%  · 허리 16%  · 골반 19%
 *   가랑이 높이 47.5%   무릎 높이 28%
 *   팔꿈치는 허리 높이, 손목은 가랑이 높이, 손끝은 허벅지 중간
 *
 * 남녀 어느 쪽으로도 읽히지 않게 가슴·엉덩이를 강조하지 않되,
 * 허리를 지나치게 잘록하게 만들지도 않았다 (허리/어깨 = 0.71).
 */
type Point = [number, number];

/**
 * 몸통 — 화면 왼쪽 절반, 정수리에서 가랑이까지 (팔은 뺀다)
 *
 * 팔을 이 윤곽에 넣지 않는 이유
 * -----------------------------
 * 처음에는 팔까지 한 줄로 이어 그렸다. 그랬더니 팔과 몸통 사이가
 * **절대로** 벌어지지 않는다 — 바깥 팔선을 따라 내려갔다가 안쪽 팔선을
 * 타고 되올라오면, 그 사이 공간이 윤곽 안쪽이 되어 그대로 칠해지기
 * 때문이다. 비례를 아무리 고쳐도 어깨부터 엉덩이까지 한 덩어리가 됐다.
 *
 * 그래서 팔은 따로 닫힌 모양으로 그린다. 위쪽은 어깨에 겹쳐 두어 팔이
 * 몸에서 자라나 보이게 하고, 겨드랑이 아래부터 사이가 벌어진다.
 */
const TORSO_HALF: Point[] = [
  /*
   * 머리 — 깔끔한 타원. 귀는 윤곽에 넣지 않는다.
   * 윤곽으로 넣었더니 관자놀이가 울퉁불퉁해져 머리가 뾰족해 보였다.
   * 귀는 아래 안쪽 결에서 짧은 곡선으로 그린다.
   * 머리 높이 30 · 키 240 = 8등신 (참고 도해와 같은 비례)
   */
  [60, 14],
  [53.4, 15.6],
  [50.0, 19.0],
  [48.9, 24.0],
  [49.0, 29.0],
  [49.8, 33.5],
  [51.4, 38.0],
  [53.6, 41.8],
  [55.6, 44.0],
  // 목 — 짧고 굵게 (턱 44 → 어깨 52)
  [54.0, 46.5],
  [52.8, 49.5],
  // 등세모근 → 어깨뼈 끝(견봉)
  [51.0, 52.5],
  [47.0, 54.8],
  [42.6, 56.6],
  [38.4, 58.4],
  // 겨드랑이
  [39.8, 73.0],
  // 몸통 옆선 — 가슴 44, 허리 40, 골반 46
  [38.2, 82.0],
  [38.0, 90.0],
  [38.4, 99.0],
  [39.2, 105.0],
  [40.0, 111.0],
  [39.6, 118.0],
  [38.4, 126.0],
  [37.2, 132.0],
  [37.2, 139.0],
  // 허벅지 — 위쪽이 굵고 무릎으로 가늘어진다
  [37.4, 147.0],
  [37.0, 156.0],
  [37.2, 165.0],
  [38.6, 174.0],
  [41.0, 182.0],
  [42.6, 188.0],
  // 종아리 — 바깥이 볼록
  [42.8, 196.0],
  [41.4, 205.0],
  [40.9, 214.0],
  [42.2, 224.0],
  [44.6, 234.0],
  [46.6, 242.0],
  // 발
  [46.0, 247.0],
  [44.6, 251.0],
  [45.4, 254.0],
  [52.8, 254.5],
  [56.8, 252.0],
  [56.6, 246.0],
  [55.6, 242.0],
  // 종아리 안쪽 → 무릎 안쪽
  [55.0, 234.0],
  [55.2, 224.0],
  [55.4, 214.0],
  [54.8, 205.0],
  [54.0, 196.0],
  [53.6, 188.0],
  // 허벅지 안쪽 → 가랑이
  [53.6, 180.0],
  [53.8, 170.0],
  [54.4, 160.0],
  [55.6, 149.0],
  [60, 139],
];

/**
 * 왼팔 — 그 자체로 닫힌 모양
 *
 * 거의 수직으로 내려온다. 가장 넓은 곳은 어깨(삼각근)이고 손은 그보다
 * 안쪽에 온다. 두께는 위팔 13 · 아래팔 10 · 손목 8 — 앞서보다 굵게 잡았다.
 * 가늘게 두면 몸 옆에 끈을 붙인 것처럼 보인다.
 */
const ARM_OUTLINE: Point[] = [
  // 어깨에 얹히는 위쪽 (몸통과 겹친다)
  [38.6, 55.5],
  [34.4, 57.5],
  // 삼각근 — 몸 전체에서 가장 넓다 (61 = 키의 25%)
  [29.8, 63.0],
  [29.0, 70.0],
  // 위팔 바깥
  [28.6, 80.0],
  [28.3, 90.0],
  [28.2, 100.0],
  // 팔꿈치 (허리 높이)
  [28.2, 111.0],
  // 아래팔 바깥 → 손목
  [28.4, 122.0],
  [28.0, 132.0],
  [27.8, 143.0],
  // 손 — 손끝이 허벅지 중간(163)쯤
  [27.6, 150.0],
  [28.0, 160.0],
  [30.2, 166.0],
  [33.4, 164.0],
  [34.8, 157.0],
  [35.4, 148.0],
  // 아래팔 안쪽
  [36.6, 132.0],
  [37.8, 122.0],
  // 팔꿈치 안쪽
  [39.2, 111.0],
  // 위팔 안쪽 → 겨드랑이
  [40.8, 100.0],
  [41.8, 90.0],
  [42.4, 80.0],
  [42.8, 70.0],
  [42.6, 62.0],
  [41.4, 56.0],
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

const TORSO_PATH = closedSpline(mirrored(TORSO_HALF));
const ARM_PATH_L = closedSpline(ARM_OUTLINE);
const ARM_PATH_R = closedSpline(
  ARM_OUTLINE.map(([x, y]) => [CENTER_X * 2 - x, y] as Point),
);

/** 몸통 + 양팔 — 칠할 때도, 잘라 낼 때도 이 셋을 함께 쓴다 */
const BODY_PARTS_D = [TORSO_PATH, ARM_PATH_L, ARM_PATH_R];

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
  { kind: "rect", x: 24, y: 58, w: 22, h: 110, r: 10 },
  { kind: "rect", x: 74, y: 58, w: 22, h: 110, r: 10 },
];
const LEG_SHAPES: Zone["shapes"] = [
  { kind: "rect", x: 35, y: 140, w: 24, h: 96, r: 11 },
  { kind: "rect", x: 61, y: 140, w: 24, h: 96, r: 11 },
];
const FOOT_SHAPES: Zone["shapes"] = [
  { kind: "rect", x: 38, y: 235, w: 22, h: 26, r: 9 },
  { kind: "rect", x: 60, y: 235, w: 22, h: 26, r: 9 },
];
const KNEE_SHAPES: Zone["shapes"] = [
  { kind: "ellipse", cx: 48.2, cy: 187, rx: 7.6, ry: 10.5 },
  { kind: "ellipse", cx: 71.8, cy: 187, rx: 7.6, ry: 10.5 },
];
/*
 * 몸통 부위는 네모가 아니라 타원으로 잡는다.
 * 네모로 칠하면 밑단이 수평으로 뚝 끊겨 옷을 걸친 것처럼 보였다.
 * 타원 + 가장자리로 갈수록 옅어지는 칠은 '그 언저리'로 읽힌다.
 */
const SHOULDER_SHAPE: Zone["shapes"] = [
  { kind: "ellipse", cx: 60, cy: 58, rx: 24, ry: 12 },
];

const FRONT_ZONES: Zone[] = [
  { part: "neck_shoulder", shapes: SHOULDER_SHAPE },
  { part: "abdomen", shapes: [{ kind: "ellipse", cx: 60, cy: 95, rx: 19, ry: 21 }] },
  { part: "pelvis_hip", shapes: [{ kind: "ellipse", cx: 60, cy: 130, rx: 20, ry: 15 }] },
  { part: "arm", shapes: ARM_SHAPES },
  { part: "leg", shapes: LEG_SHAPES },
  { part: "knee", shapes: KNEE_SHAPES },
  { part: "foot_ankle", shapes: FOOT_SHAPES },
];

const BACK_ZONES: Zone[] = [
  { part: "neck_shoulder", shapes: SHOULDER_SHAPE },
  { part: "back", shapes: [{ kind: "ellipse", cx: 60, cy: 87, rx: 19, ry: 15 }] },
  { part: "waist", shapes: [{ kind: "ellipse", cx: 60, cy: 110, rx: 18, ry: 9.5 }] },
  { part: "pelvis_hip", shapes: [{ kind: "ellipse", cx: 60, cy: 131, rx: 20, ry: 14 }] },
  { part: "arm", shapes: ARM_SHAPES },
  { part: "leg", shapes: LEG_SHAPES },
  { part: "knee", shapes: KNEE_SHAPES },
  { part: "foot_ankle", shapes: FOOT_SHAPES },
];

/** 앞/뒷면 구분용 해부 라인 — 있는 듯 없는 듯한 굵기로만 */
/**
 * 몸 안쪽 결 — 이게 있어야 사람으로 읽힌다
 *
 * 윤곽선만 있으면 아무리 비례를 맞춰도 납작한 덩어리로 보인다.
 * 해부 도해가 사람처럼 보이는 건 안쪽에 쇄골·가슴·무릎 같은 결이
 * 몇 줄 들어 있기 때문이다. 부위 색칠을 방해하지 않도록 아주 옅게 긋는다.
 */
function AnatomyLines({ view }: { view: View }) {
  const common = {
    fill: "none",
    stroke: "rgb(var(--c-aqua-700))",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return view === "front" ? (
    <g {...common} strokeWidth="0.7" opacity="0.42">
      {/* 귀 */}
      <path d="M51.2 27 Q49.6 30 51.2 33.2" />
      <path d="M68.8 27 Q70.4 30 68.8 33.2" />
      {/* 쇄골 */}
      <path d="M43.5 56.5 Q52 62 60 60.4 Q68 62 76.5 56.5" />
      {/* 가슴근 — 짧게. 길게 그으면 목이 파인 옷처럼 보인다 */}
      <path d="M45.5 69 Q52.5 79.5 59.3 77.5" />
      <path d="M74.5 69 Q67.5 79.5 60.7 77.5" />
      {/* 복장뼈 → 배 정중선 → 배꼽 */}
      <path d="M60 62 V 78" opacity="0.4" />
      <path d="M60 82 V 101" opacity="0.5" />
      <path d="M58.9 105.5 Q60 107.4 61.1 105.5" />
      {/* 갈비 아래 결 */}
      <path d="M45.5 88 Q50.5 93 53.5 95.5" opacity="0.35" />
      <path d="M74.5 88 Q69.5 93 66.5 95.5" opacity="0.35" />
      {/* 삼각근 — 팔이 어깨에서 자라나 보이게 */}
      <path d="M33.2 62 Q37 69 36.2 77" />
      <path d="M86.8 62 Q83 69 83.8 77" />
      {/* 골반 앞 */}
      <path d="M46.5 124 Q52.5 132 55.2 139" opacity="0.55" />
      <path d="M73.5 124 Q67.5 132 64.8 139" opacity="0.55" />
      {/* 무릎 */}
      <path d="M43.4 183 Q47.8 187.5 51.6 183" />
      <path d="M76.6 183 Q72.2 187.5 68.4 183" />
      {/* 발목 */}
      <path d="M47.2 239 Q51 241.5 54.2 239" opacity="0.5" />
      <path d="M72.8 239 Q69 241.5 65.8 239" opacity="0.5" />
      {/* 발가락 */}
      <path d="M47 249 Q50.6 251.5 54 250" opacity="0.45" />
      <path d="M73 249 Q69.4 251.5 66 250" opacity="0.45" />
      {/* 손가락 */}
      <path d="M29.6 153 L 30.4 162" opacity="0.5" />
      <path d="M31.9 152.5 L 32.6 163.5" opacity="0.5" />
      <path d="M90.4 153 L 89.6 162" opacity="0.5" />
      <path d="M88.1 152.5 L 87.4 163.5" opacity="0.5" />
    </g>
  ) : (
    <g {...common} strokeWidth="0.7" opacity="0.42">
      {/* 귀 */}
      <path d="M51.2 27 Q49.6 30 51.2 33.2" />
      <path d="M68.8 27 Q70.4 30 68.8 33.2" />
      {/* 목덜미 */}
      <path d="M54.2 49.5 Q60 53 65.8 49.5" opacity="0.55" />
      {/* 척주 */}
      <path d="M60 54 V 130" />
      {/* 견갑골 */}
      <path d="M46.5 62 Q53 70 52.6 83" />
      <path d="M73.5 62 Q67 70 67.4 83" />
      {/* 삼각근 */}
      <path d="M33.2 62 Q37 69 36.2 77" />
      <path d="M86.8 62 Q83 69 83.8 77" />
      {/* 허리 삼각 */}
      <path d="M51.5 108 Q60 114 68.5 108" opacity="0.45" />
      {/* 엉덩이 */}
      <path d="M46 130 Q60 139 74 130" />
      <path d="M60 133 V 147" opacity="0.55" />
      {/* 무릎 뒤 */}
      <path d="M43.6 184.5 Q47.8 181.5 51.4 184.5" />
      <path d="M76.4 184.5 Q72.2 181.5 68.6 184.5" />
      {/* 발목 */}
      <path d="M47.2 239 Q51 241.5 54.2 239" opacity="0.5" />
      <path d="M72.8 239 Q69 241.5 65.8 239" opacity="0.5" />
      {/* 손가락 */}
      <path d="M29.6 153 L 30.4 162" opacity="0.5" />
      <path d="M31.9 152.5 L 32.6 163.5" opacity="0.5" />
      <path d="M90.4 153 L 89.6 162" opacity="0.5" />
      <path d="M88.1 152.5 L 87.4 163.5" opacity="0.5" />
    </g>
  );
}

/** 실루엣 — 윤곽선 하나 + 부드러운 안쪽 음영 */
function Silhouette({ view, clipId }: { view: View; clipId: string }) {
  return (
    <g>
      {BODY_PARTS_D.map((d, i) => (
        <path key={i} d={d} fill="url(#bodyFill)" />
      ))}
      {/* 몸 안쪽에만 얹히는 은은한 입체감 — 왼쪽에서 들어오는 빛 한 겹 */}
      <rect
        x="18"
        y="4"
        width="84"
        height="262"
        fill="url(#bodyShade)"
        clipPath={`url(#${clipId})`}
      />
      <AnatomyLines view={view} />
      {BODY_PARTS_D.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke="url(#bodyEdge)"
          strokeWidth="0.9"
          strokeLinejoin="round"
        />
      ))}
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
          viewBox="22 8 76 254"
          className="h-auto w-full max-w-[80px] sm:max-w-[98px]"
          role="group"
          aria-label={view === "front" ? "신체 앞면" : "신체 뒷면"}
        >
          <defs>
            <clipPath id={clipId}>
              {BODY_PARTS_D.map((d, i) => (
                <path key={i} d={d} />
              ))}
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
                    fill={filled ? "url(#zoneFill)" : "transparent"}
                  />
                );
              }),
            )}
          </g>

          {/* 고른 부위 위에 다시 얹는 몸 윤곽 — 색이 몸 모양을 따라간 것을 분명히 */}
          {BODY_PARTS_D.map((d, i) => (
            <path
              key={i}
              d={d}
              fill="none"
              stroke="url(#bodyEdge)"
              strokeWidth="0.9"
              strokeLinejoin="round"
              pointerEvents="none"
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
