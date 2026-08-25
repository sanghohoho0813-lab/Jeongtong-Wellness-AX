/**
 * 공개 화면에 내거는 가격표
 * ==========================
 *
 * 여기 적힌 숫자는 매장 가격표에서 그대로 옮긴 것이다. 지어낸 값은 없다.
 *
 * 운영상의 기준은 어디까지나 설정 → 상품(service_products)이다. 그쪽은
 * 원장님이 고칠 수 있고, 이용권 등록·매출 계산도 그 값을 쓴다.
 * 이 파일은 **로그인하지 않은 사람에게 보여 줄 안내용 사본**이다 —
 * 공개 화면은 데이터베이스를 읽지 않기 때문이다(읽으면 공개가 아니게 된다).
 *
 * 그래서 화면에도 "방문 전 확인" 을 함께 적는다. 사본은 언젠가 어긋난다.
 */

export interface PublicPrice {
  name: string;
  sessions: number;
  price: number;
  /** 한 번당 값 — 회차권이 왜 유리한지 스스로 보이게 */
  perSession: number;
  highlight?: boolean;
}

const sheet = [
  { name: "대왕쑥뜸 1회", sessions: 1, price: 45_000 },
  { name: "대왕쑥뜸 10회권", sessions: 10, price: 400_000 },
  { name: "대왕쑥뜸 30회권", sessions: 30, price: 1_100_000 },
];

export const PUBLIC_PRICES: PublicPrice[] = sheet.map((p) => ({
  ...p,
  perSession: Math.round(p.price / p.sessions),
  // 10회권이 가장 많이 나가는 구성이라 눈에 먼저 들어오게 둔다
  highlight: p.sessions === 10,
}));
