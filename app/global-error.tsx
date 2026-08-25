"use client";

/**
 * 마지막의 마지막 안내 화면.
 *
 * 화면 안쪽 오류는 AppShell 의 방어막이, 자료를 읽다 난 오류는 RootBoundary
 * 가 받는다. 그래도 드물게 리액트가 스스로 다시 그려 보다 포기하는 경우가
 * 있는데, 그때는 앱의 방어막이 손을 쓸 수 없다. 예전에는 그 자리에
 * 영어 한 줄("Application error…")만 남았다 — 무슨 일인지도, 내 기록이
 * 무사한지도 알 수 없는 화면이다.
 *
 * 여기서는 최소한
 *  - 저장된 기록은 그대로라는 사실을 알리고
 *  - 기록을 파일로 꺼낼 길과
 *  - 다시 열어 볼 단추를 준다.
 *
 * 이 화면은 앱의 어떤 것도 쓸 수 없다(스토어·레이아웃 모두 이미 무너진
 * 상태다). 그래서 글자색·배경까지 직접 적어 둔다.
 */

import { useState } from "react";

const STORAGE_KEY = "jeongtong-ax-v1";

function rescue(): boolean {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const d = new Date();
    const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    const blob = new Blob([raw], { type: "application/json;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `정통대왕쑥뜸원_긴급백업_${stamp}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    return true;
  } catch {
    /* 꺼내기까지 막히면 더 할 수 있는 일이 없다 */
    return false;
  }
}

export default function GlobalError({ reset }: { reset: () => void }) {
  /** 기록을 파일로 꺼낸 뒤에만 '비우기'를 권한다 — 순서를 바꾸면 되돌릴 길이 없다 */
  const [rescued, setRescued] = useState(false);
  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          background: "#F4F3EF",
          color: "#1A2226",
          fontFamily:
            '"Pretendard Variable", Pretendard, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif',
          wordBreak: "keep-all",
        }}
      >
        <div style={{ maxWidth: 620, margin: "0 auto", padding: "2.5rem 1.25rem" }}>
          <h1 style={{ fontSize: "1.375rem", fontWeight: 800, margin: 0 }}>
            이 화면을 표시하지 못했습니다
          </h1>
          <p style={{ marginTop: "0.75rem", lineHeight: 1.7, fontSize: "1rem" }}>
            <b>지금까지 저장한 기록은 그대로 있습니다.</b> 화면을 그리는 중에만
            생긴 문제입니다. 아래에서 다시 열어 보시고, 그래도 열리지 않으면
            기록을 파일로 꺼내 두신 뒤 알려 주세요.
          </p>
          <div
            style={{
              marginTop: "1.25rem",
              display: "flex",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <button
              type="button"
              onClick={reset}
              style={{
                minHeight: 44,
                padding: "0 1.25rem",
                borderRadius: 12,
                border: "none",
                background: "#0F8280",
                color: "#fff",
                fontWeight: 700,
                fontSize: "0.9375rem",
              }}
            >
              다시 열기
            </button>
            <button
              type="button"
              onClick={() => setRescued(rescue())}
              style={{
                minHeight: 44,
                padding: "0 1.25rem",
                borderRadius: 12,
                border: "1px solid #D9D8D2",
                background: "#fff",
                color: "#2E373C",
                fontWeight: 700,
                fontSize: "0.9375rem",
              }}
            >
              지금 기록 파일로 꺼내기
            </button>
          </div>

          {rescued && (
            <div
              style={{
                marginTop: "1.25rem",
                borderLeft: "4px solid #C9873A",
                background: "#FBF3E6",
                padding: "0.875rem 1rem",
                borderRadius: 12,
              }}
            >
              <p style={{ margin: 0, lineHeight: 1.7, fontSize: "0.9375rem" }}>
                기록을 파일로 내려받았습니다. 화면이 계속 열리지 않는다면 아래에서
                이 기기의 <b>저장 내용을 비우고</b> 처음부터 열 수 있습니다.{" "}
                <b>방금 받은 파일로 다시 되돌릴 수 있습니다</b> (설정 → 데이터 →
                백업으로 되돌리기).
              </p>
              <button
                type="button"
                onClick={() => {
                  window.localStorage.removeItem(STORAGE_KEY);
                  window.location.href = "/dashboard";
                }}
                style={{
                  minHeight: 44,
                  marginTop: "0.75rem",
                  padding: "0 1.25rem",
                  borderRadius: 12,
                  border: "none",
                  background: "#C0392B",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "0.9375rem",
                }}
              >
                저장 내용 비우고 다시 열기
              </button>
            </div>
          )}
        </div>
      </body>
    </html>
  );
}
