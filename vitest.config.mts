import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * 판정 규칙(순수 함수) 단위 테스트 설정.
 * 화면 테스트는 Playwright QA 스크립트가 담당하고,
 * 여기서는 Priority Score / 매출기회 / 날짜 유틸의 규칙만 검증한다.
 */
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
