/**
 * 차트 계산 (순수 함수)
 * =====================
 * 화면 코드와 떼어 놓아 값이 맞는지 테스트로 못박을 수 있게 한다.
 */

/**
 * 눈금에 쓸 "깔끔한" 최댓값 — 1 / 2 / 5 배수로 올린다.
 *
 * 31 위에 31 이라고 적어 두면 눈금이 아니라 값의 반복이라 읽는 데 도움이 안 된다.
 * 50 처럼 한눈에 잡히는 수여야 직접 적지 않은 막대의 크기를 가늠할 수 있다.
 */
export function niceMax(value: number): number {
  if (value <= 0) return 1;
  const exp = Math.floor(Math.log10(value));
  const base = Math.pow(10, exp);
  const n = value / base;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * base;
}
