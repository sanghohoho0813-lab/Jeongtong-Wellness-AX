import type { Metadata, Viewport } from "next";
import "./globals.css";
import RootBoundary from "@/components/layout/RootBoundary";

export const metadata: Metadata = {
  title: "정통대왕쑥뜸원 AX Platform",
  description: "정통대왕쑥뜸원 웰니스 운영 AX 플랫폼",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  /* 브라우저 주소창 색 — 배경(--c-bg)과 맞춘다. 하나로 고정해 두면
     다크로 쓸 때 화면 위쪽에 흰 띠가 남는다. */
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4F3EF" },
    { media: "(prefers-color-scheme: dark)", color: "#101817" },
  ],
};

/**
 * 첫 페인트 전에 테마·글자 크기를 붙인다.
 *
 * 저장된 설정은 리액트가 붙은 뒤에야 읽히는데, 그때까지는 라이트·기본 크기로
 * 한 번 그려진다. 느린 폰에서는 그 시간이 눈에 보여서, 다크로 쓰는 사람은
 * 앱을 열 때마다 흰 화면이 번쩍이고 글자 크기도 한 번 튄다.
 * 그래서 화면을 그리기 전에 localStorage 를 직접 읽어 먼저 붙여 둔다.
 * (읽기 실패는 그냥 넘긴다 — 원래 하던 대로 리액트가 다시 붙인다.)
 *
 * 고객이 보는 화면(/my · /welcome)은 저장된 매장 설정을 따르지 않는다.
 * 그 설정은 이 기기를 쓰는 **직원**이 고른 값이고, 고객 휴대폰에는 아예
 * 없다. 고객에게는 그 폰이 쓰는 밝기를 그대로 따라가는 편이 맞다.
 * (원장님이 자기 폰으로 고객 화면을 열어 볼 때도 같은 규칙으로 움직인다)
 *
 * /welcome 은 뒤늦게 이 규칙에 넣었다. 그전에는 매장 설정을 따랐는데,
 * 고객 폰에는 그 설정이 없으니 언제나 기본값 '밝게' 로 떨어졌다. 그래서
 * 어두운 화면을 쓰는 고객이 /welcome 에서는 눈부신 흰 화면을, /my 에서는
 * 어두운 화면을 보게 됐다 — 같은 매장의 같은 고객 화면인데 둘이 달랐다.
 */
const PREPAINT = `(function(){try{
var r=document.documentElement,s=JSON.parse(localStorage.getItem("jeongtong-ax-v1")||"{}").settings||{};
var p=location.pathname;
var portal=p==="/my"||p.indexOf("/my/")===0||p==="/welcome";
var t=portal?"system":(s.theme||"light");
r.dataset.theme=t==="system"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):t;
r.dataset.fontScale=portal?"default":(s.fontScale||"default");
r.dataset.density=portal?"default":(s.density||"default");
/* 색 조합은 브랜드라서 고객 화면에서도 매장이 고른 것을 따른다 —
   밝기와 달리 "고객 폰의 취향" 이 개입할 자리가 아니다 */
r.dataset.palette=s.palette||"teal";
}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREPAINT }} />
      </head>
      <body>
        {/*
          여기는 화면 껍데기를 두지 않는다.
          직원 화면은 app/(staff)/layout.tsx 가, 고객 포털은
          app/(portal)/my/layout.tsx 가 각자의 껍데기를 붙인다.
          두 쪽은 네비게이션도 데이터 출처도 다르다.
        */}
        <RootBoundary>{children}</RootBoundary>
      </body>
    </html>
  );
}
