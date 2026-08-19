import { defineConfig } from "vitest/config";

/**
 * 판정 규칙(순수 함수) 단위 테스트 설정.
 * 화면 테스트는 Playwright QA 스크립트가 담당하고,
 * 여기서는 Priority Score / 매출기회 / 가져오기·검색 유틸의 규칙만 검증한다.
 */
/**
 * 테스트는 매장 시간대(한국)에서 돌린다.
 * 시각 비교 문제는 UTC 환경에서는 드러나지 않기 때문이다.
 * (환경변수로 지정하면 Windows 에서도 동일하게 동작한다)
 */
process.env.TZ = "Asia/Seoul";

export default defineConfig({
  resolve: {
    alias: { "@": import.meta.dirname },
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
