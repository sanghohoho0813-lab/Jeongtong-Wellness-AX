"use client";

/**
 * 검색칸의 ✕ — 친 글자를 한 번에 지우기 (D-61)
 * ============================================
 *
 * 찾던 이름을 다 보고 나면, 칸을 비우려고 지우개 키를 글자 수만큼
 * 눌러야 했다(초성 검색이면 서너 번, 이름이면 더). 폰의 다른 앱 검색칸은
 * 다 오른쪽 끝에 ✕ 가 있다. 글자가 있을 때만 나오고, 누르면 비우고
 * 다시 그 칸에서 칠 수 있게 커서를 둔다.
 *
 * 놓는 자리: 검색칸을 감싼 `relative` 상자 안. 검색칸 오른쪽 여백(pr-12)을
 * 함께 늘려 글자와 겹치지 않게 한다.
 */

import { XIcon } from "./icons";

export default function SearchClear({
  value,
  onClear,
}: {
  value: string;
  onClear: () => void;
}) {
  if (!value) return null;
  return (
    <button
      type="button"
      aria-label="검색어 지우기"
      data-search-clear
      onClick={(e) => {
        onClear();
        (e.currentTarget.parentElement?.querySelector("input") as HTMLInputElement | null)?.focus();
      }}
      className="press absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-ink-faint hover:bg-stone-bg hover:text-ink-sub"
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink-faint/25">
        <XIcon className="h-3.5 w-3.5" strokeWidth={2.6} />
      </span>
    </button>
  );
}
