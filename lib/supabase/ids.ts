/**
 * 앱 id ↔ 데이터베이스 uuid
 * =========================
 *
 * 앱은 지금까지 `c-mf3x9k`, `v-mf40a1` 같은 짧은 id 를 써 왔고,
 * Supabase 표의 기본키는 uuid 다. 둘을 이어야 한다.
 *
 * 새 id 체계로 갈아엎지 않는 이유는 단순하다. 이미 매장 기기에 쌓인
 * 기록이 그 id 로 서로를 가리키고 있어서(방문 → 이용권 → 고객),
 * 하나라도 어긋나면 "이용권은 있는데 어느 고객 것인지 모르는" 줄이 생긴다.
 *
 * 그래서 **같은 입력에 항상 같은 uuid** 를 주는 변환을 쓴다.
 *  - 이미 uuid 면 그대로 둔다 → 몇 번을 오가도 값이 흔들리지 않는다
 *  - 아니면 문자열에서 128비트를 만들어 uuid 모양으로 찍는다
 *
 * 암호용 해시가 아니다. 여기서 필요한 건 "고르게 퍼지고 늘 같을 것" 뿐이고,
 * 매장 하나가 다루는 몇천 줄 규모에서 겹칠 걱정은 없다.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(v: string): boolean {
  return UUID_RE.test(v);
}

/** 32비트 FNV-1a — 씨앗을 바꿔 가며 네 번 돌려 128비트를 만든다 */
function fnv1a(input: string, seed: number): number {
  let h = seed >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  // 마지막에 한 번 섞어 준다 (짧은 문자열이 앞자리에 몰리지 않게)
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

const hex8 = (n: number) => n.toString(16).padStart(8, "0");

/**
 * 앱 id → uuid. 이미 uuid 면 그대로.
 *
 * 버전 자리(4)와 변형 자리(8)를 박아 두어 Postgres 가 받아들이는
 * 정식 uuid 모양을 지킨다.
 */
export function toUuid(appId: string): string {
  const s = String(appId ?? "");
  if (isUuid(s)) return s.toLowerCase();

  const a = hex8(fnv1a(s, 0x811c9dc5));
  const b = hex8(fnv1a(s, 0x1b873593));
  const c = hex8(fnv1a(s, 0xcc9e2d51));
  const d = hex8(fnv1a(s, 0x85ebca6b));

  const raw = a + b + c + d; // 32 hex
  const v4 = "4" + raw.slice(13, 16); // 버전 4
  const va = ((parseInt(raw[16], 16) & 0x3) | 0x8).toString(16) + raw.slice(17, 20);

  return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${v4}-${va}-${raw.slice(20, 32)}`;
}

/** 값이 있을 때만 변환 (선택 항목용) */
export function toUuidOpt(appId?: string | null): string | null {
  if (!appId) return null;
  return toUuid(appId);
}

/** 새 기록용 id — 브라우저가 주는 uuid 를 쓰고, 없으면 직접 만든다 */
export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  const r = () => Math.floor(Math.random() * 0xffffffff);
  return toUuid(`${Date.now()}-${r()}-${r()}`);
}
