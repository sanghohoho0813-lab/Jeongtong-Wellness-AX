import { ReactNode } from "react";

/**
 * 칩 한 줄 — 폰에서는 옆으로 넘기고, 넓어지면 줄바꿈으로 편다
 * ==========================================================
 *
 * 거르개 칩이 여섯 개쯤 되면 390px 폰에서 네 줄로 접힌다. 오늘의 실행
 * 브리핑이 그랬다 — 유형 여섯 · 상태 넷이 네 줄을 차지해서, 정작 오늘
 * 챙길 고객 첫 장이 첫 화면 밖(1,012px)에 있었다. 거르개를 보러 들어오는
 * 사람은 없다.
 *
 * 그래서 폰에서는 한 줄로 두고 옆으로 넘긴다. 자리가 생기는 태블릿
 * 이상에서는 넘기는 것보다 다 보이는 편이 나으므로 줄바꿈으로 돌아간다.
 *
 * 오른쪽 끝의 흐림은 장식이 아니다. 칩이 화면 끝에서 뚝 잘려 있으면
 * 60대 눈에는 「여기까지」 로 읽혀서, 옆에 더 있다는 것을 모른다.
 * (고객 목록의 정렬 칩에서 같은 방법을 먼저 썼다)
 */
export default function ChipRow({
  children,
  className = "",
  ariaLabel,
}: {
  children: ReactNode;
  className?: string;
  /** 무엇을 고르는 줄인지 — 화면을 읽어 주는 도구에 전달된다 */
  ariaLabel?: string;
}) {
  return (
    <div className={`relative min-w-0 ${className}`}>
      <div
        role={ariaLabel ? "group" : undefined}
        aria-label={ariaLabel}
        className="no-scrollbar flex gap-2 overflow-x-auto pr-7 sm:flex-wrap sm:overflow-x-visible sm:pr-0"
      >
        {children}
      </div>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-card to-transparent sm:hidden"
      />
    </div>
  );
}
