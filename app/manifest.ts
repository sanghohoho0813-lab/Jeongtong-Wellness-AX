import type { MetadataRoute } from "next";

/**
 * 직원 앱 — 「홈 화면에 추가」 했을 때의 이름 · 아이콘 · 첫 화면 (D-58)
 *
 * 매장 태블릿 · 대표님 폰에서 주소창 없이 앱처럼 열리게 한다. 고객 앱
 * (MY WELLNESS)은 따로 public/my.webmanifest 가 있다 — 같은 기기에 둘 다
 * 두어도 서로 다른 앱으로 보이도록 id 를 나눈다.
 *
 * 오프라인 저장(서비스 워커)은 넣지 않았다. 옛 화면이 캐시에 남아 새
 * 배포가 늦게 보이는 일이 생기면, 그것이 「앱처럼 열리는 것」 보다 더 큰
 * 불편이다. 기록은 이미 이 기기(브라우저 저장소)에 남는다.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "정통대왕쑥뜸원 AX",
    short_name: "정통 AX",
    description: "정통대왕쑥뜸원 직원용 운영 화면 — 오늘 챙길 고객 · 방문 기록 · 재방문",
    lang: "ko",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#F4F3EF",
    theme_color: "#0A2E2C",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
