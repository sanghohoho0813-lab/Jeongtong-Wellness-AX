"use client";

/**
 * 화면 오류 방어막
 * ================
 * 기록 하나가 예상 못 한 모양이면 그 화면을 그리다 오류가 나고,
 * 아무 방어막이 없으면 앱 전체가 하얗게 비어 버린다.
 * 그 상태에서는 무엇이 잘못됐는지도, 지금까지 쌓인 기록이 무사한지도 알 수 없다.
 *
 * 그래서 오류를 이 화면 안에서 잡아 두고,
 *  - 기록은 그대로 남아 있다는 것을 알리고
 *  - 다시 시도 / 다른 화면으로 이동 / 백업받기 경로를 함께 준다.
 */

import { Component, ReactNode } from "react";
import Link from "next/link";
import { AlertIcon, DownloadIcon, RefreshIcon } from "@/components/ui/icons";

const STORAGE_KEY = "jeongtong-ax-v1";

interface Props {
  children: ReactNode;
  /** 경로가 바뀌면 오류 상태를 푼다 (다른 화면은 멀쩡할 수 있으므로) */
  resetKey?: string;
}

interface State {
  error: Error | null;
  /** 저장된 기록을 파일로 꺼냈는지 — 꺼낸 뒤에만 초기화를 권한다 */
  rescued: boolean;
}

/**
 * 저장된 원본을 그대로 파일로 꺼낸다.
 *
 * 화면이 못 그려지는 상황이라 앱의 내보내기 기능을 쓸 수 없다.
 * 그래서 localStorage 를 직접 읽어 내려받는다 — 어떤 화면도 필요하지 않다.
 */
function rescueRawBackup(): boolean {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const d = new Date();
    const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    const blob = new Blob([raw], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `정통대왕쑥뜸원_긴급백업_${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  } catch {
    return false;
  }
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, rescued: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="card mx-auto max-w-2xl">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-warn ring-1 ring-warn/20 dark:bg-amber-400/10">
          <AlertIcon className="h-6 w-6" />
        </span>
        <h2 className="mt-3 text-xl font-extrabold text-ink">
          이 화면을 표시하지 못했습니다
        </h2>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-soft">
          <b>지금까지 저장한 기록은 그대로 있습니다.</b> 화면을 그리는 중에만
          생긴 문제이므로, 아래에서 다시 시도하시거나 다른 화면으로 이동하시면
          됩니다.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => this.setState({ error: null })}
            className="touch-target inline-flex items-center gap-1.5 rounded-btn bg-gradient-to-b from-aqua-500 to-aqua-700 px-4 py-2.5 text-[0.9375rem] font-bold text-white shadow-[0_2px_8px_rgba(14,127,125,0.35)]"
          >
            <RefreshIcon className="h-4 w-4" />
            다시 시도
          </button>
          <Link
            href="/customers"
            className="touch-target inline-flex items-center rounded-btn bg-aqua-50 px-4 py-2.5 text-[0.9375rem] font-bold text-aqua-800 ring-1 ring-aqua-200"
          >
            고객 화면으로
          </Link>
          <button
            onClick={() => this.setState({ rescued: rescueRawBackup() })}
            className="touch-target inline-flex items-center gap-1.5 rounded-btn bg-card-soft px-4 py-2.5 text-[0.9375rem] font-bold text-ink-soft ring-1 ring-black/[0.05]"
          >
            <DownloadIcon className="h-4 w-4" />
            지금 기록 파일로 꺼내기
          </button>
        </div>

        {/*
          모든 화면이 같은 이유로 안 열릴 수도 있다.
          그때는 설정 화면으로 갈 수도 없으므로, 여기서 바로 꺼내고 비울 수 있게 한다.
        */}
        {this.state.rescued && (
          <div className="mt-4 rounded-card border-l-4 border-warn bg-amber-50 px-4 py-3 dark:bg-amber-400/10">
            <p className="text-sm leading-relaxed text-ink-soft">
              기록을 파일로 내려받았습니다. 화면이 계속 열리지 않는다면 아래에서
              이 기기의 저장 내용을 비우고 처음부터 열 수 있습니다.{" "}
              <b>방금 받은 파일로 다시 되돌릴 수 있습니다</b>
              (설정 → 데이터 → 백업으로 되돌리기).
            </p>
            <button
              onClick={() => {
                window.localStorage.removeItem(STORAGE_KEY);
                window.location.href = "/";
              }}
              className="touch-target mt-2.5 inline-flex items-center rounded-btn bg-danger px-4 py-2.5 text-[0.9375rem] font-bold text-white"
            >
              저장 내용 비우고 다시 열기
            </button>
          </div>
        )}

        {/* 개발자에게 전달할 때 쓰는 정보 — 접어 둔다 */}
        <details className="mt-4 border-t border-stone-line pt-3">
          <summary className="cursor-pointer text-sm font-bold text-ink-sub">
            기술 정보 (문의할 때 첨부)
          </summary>
          <pre className="mt-2 max-h-48 overflow-auto rounded-card bg-card-soft p-3 text-xs leading-relaxed text-ink-sub ring-1 ring-black/[0.04]">
            {error.message}
            {error.stack ? `\n\n${error.stack}` : ""}
          </pre>
        </details>
      </div>
    );
  }
}
