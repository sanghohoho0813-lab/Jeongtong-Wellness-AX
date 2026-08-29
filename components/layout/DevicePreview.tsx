"use client";

/**
 * 다른 기기에서 어떻게 보이는지 — 지금 이 화면 그대로
 * ==================================================
 *
 * 원장님은 PC 로 쓰고, 직원은 폰으로 쓴다. 그런데 PC 에서 화면을 고쳐 놓고
 * "폰에서도 괜찮겠지" 하고 넘어가면 대개 안 괜찮다. 창을 좁게 줄여 보는
 * 것으로는 모자란다 — 창 폭만 줄면 브라우저 주소창·하단 여백·터치 크기가
 * 다 다르고, 무엇보다 그렇게 확인해 볼 생각을 안 한다.
 *
 * 왜 iframe 인가
 * --------------
 * 겉껍데기에 `transform: scale()` 을 걸어 축소하는 방식이 흔하지만, 그러면
 * 안쪽의 `position: fixed` 가 전부 어긋난다(변형된 조상은 fixed 의 기준이
 * 된다). 하단 네비와 저장 버튼이 화면 한가운데에 떠 버린다.
 *
 * iframe 은 **자기 뷰포트를 가진 별개의 문서**다. 390px 짜리 iframe 안에서
 * 미디어 쿼리도, sticky 도, fixed 도, `100dvh` 도 실제 390px 폰과 똑같이
 * 계산된다. 같은 출처라 저장소(localStorage)도 그대로 공유해서 **같은
 * 자료·같은 상태**를 본다. 겉을 축소해도 iframe 내부 배치는 흔들리지 않는다.
 *
 * 재귀 금지
 * ---------
 * 미리보기 안에서 또 미리보기를 열면 끝이 없다. 두 겹으로 막는다.
 *   1) iframe 주소에 `?preview=` 를 달고, 그 값이 있으면 여는 단추를 감춘다.
 *   2) 주소를 지웠더라도 `window.self !== window.top` 이면 역시 감춘다.
 *
 * 나가는 길
 * ---------
 * X · 바깥 누르기 · ESC 셋 다 연다. 닫을 때 배경 스크롤 잠금과 초점을
 * 되돌려 놓는다 — 이걸 빠뜨리면 닫은 뒤에 화면이 안 움직인다.
 */

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { MonitorIcon, PhoneFrameIcon, XIcon } from "@/components/ui/icons";

export type PreviewKind = "mobile" | "desktop";

/** 미리보기 창 안쪽의 크기 — 실제 기기 기준값 */
const SIZE: Record<PreviewKind, { w: number; h: number; label: string }> = {
  mobile: { w: 390, h: 844, label: "폰 (390 × 844)" },
  desktop: { w: 1280, h: 800, label: "PC (1280 × 800)" },
};

interface Ctx {
  /** 지금 기기에서 열어 볼 수 있는 미리보기 (없으면 미리보기 안이라는 뜻) */
  available: PreviewKind | null;
  open: () => void;
}

const PreviewContext = createContext<Ctx>({ available: null, open: () => {} });

export function useDevicePreview() {
  return useContext(PreviewContext);
}

/**
 * 지금 화면이 미리보기 안인가.
 *
 * 마운트 뒤에만 판단한다 — 서버에서 그린 것과 달라지면 리액트가 화면을
 * 통째로 다시 그리기 때문에, 첫 렌더에서는 무조건 "아직 모른다"로 둔다.
 */
function useFrameState() {
  const [state, setState] = useState<{ inFrame: boolean; wide: boolean } | null>(
    null,
  );

  useEffect(() => {
    const compute = () => {
      let framed = false;
      try {
        framed = window.self !== window.top;
      } catch {
        // 다른 출처에 끼워져 있으면 접근 자체가 막힌다 — 그것도 미리보기다
        framed = true;
      }
      const q = new URLSearchParams(window.location.search).get("preview");
      setState({
        inFrame: framed || q === "mobile" || q === "desktop",
        wide: window.matchMedia("(min-width: 1024px)").matches,
      });
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  return state;
}

export function DevicePreviewProvider({ children }: { children: ReactNode }) {
  const frame = useFrameState();
  const [open, setOpen] = useState(false);

  /*
    PC 에서는 '폰 보기'만, 폰에서는 'PC 보기'만 준다.
    지금 쓰고 있는 기기와 같은 미리보기는 볼 이유가 없다 — 바로 앞에 있다.
    미리보기 안에서는 아무것도 주지 않는다(재귀 차단).
  */
  const available: PreviewKind | null =
    frame === null || frame.inFrame ? null : frame.wide ? "mobile" : "desktop";

  return (
    <PreviewContext.Provider
      value={{ available, open: () => available && setOpen(true) }}
    >
      {children}
      {available && (
        <PreviewOverlay
          kind={available}
          open={open}
          onClose={() => setOpen(false)}
        />
      )}
    </PreviewContext.Provider>
  );
}

function PreviewOverlay({
  kind,
  open,
  onClose,
}: {
  kind: PreviewKind;
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  /** 바깥 화면에 들어갈 만큼만 줄인다 — 안쪽 배치는 그대로다 */
  const [scale, setScale] = useState(1);
  const measure = useCallback(() => {
    const { w, h } = SIZE[kind];
    // 위아래로 머리글(약 64px)과 여백을 뺀 나머지에 맞춘다
    const availW = window.innerWidth - 32;
    const availH = window.innerHeight - 132;
    setScale(Math.min(1, availW / w, availH / h));
  }, [kind]);

  useEffect(() => {
    if (!open) return;
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open, measure]);

  useEffect(() => {
    if (!open) return;

    restoreRef.current = document.activeElement as HTMLElement | null;

    const body = document.body;
    const prevOverflow = body.style.overflow;
    const prevPadding = body.style.paddingRight;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (gap > 0) body.style.paddingRight = `${gap}px`;

    panelRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeRef.current();
      }
    };
    document.addEventListener("keydown", onKey, true);

    return () => {
      document.removeEventListener("keydown", onKey, true);
      // 잠근 것을 정확히 되돌린다 — 여기서 빠뜨리면 닫은 뒤 화면이 굳는다
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPadding;
      restoreRef.current?.focus?.();
    };
  }, [open]);

  if (!mounted || !open) return null;

  const { w, h, label } = SIZE[kind];
  /*
    미리보기 안에서 다시 미리보기를 열 수 없게 하는 표식.
    현재 주소의 나머지 쿼리는 지운다 — 미리보기가 필터 상태까지
    물고 들어가면 "지금 이 화면"이 아니게 된다.
  */
  const src = `${pathname}?preview=${kind}`;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex flex-col bg-black/70 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`${kind === "mobile" ? "폰" : "PC"} 화면 미리보기`}
        className="flex h-full flex-col outline-none"
      >
        {/* 머리글 — 무엇을 어떤 크기로 보고 있는지, 그리고 나가는 문 */}
        <div className="flex shrink-0 items-center gap-3 px-4 py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-white/20">
            {kind === "mobile" ? (
              <PhoneFrameIcon className="h-5 w-5" />
            ) : (
              <MonitorIcon className="h-5 w-5" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[0.9375rem] font-extrabold text-white">
              {kind === "mobile" ? "폰에서 보면" : "PC 에서 보면"}
            </span>
            <span className="nowrap-num block truncate text-[0.75rem] text-white/70">
              {label} · {pathname}
              {scale < 1 && ` · ${Math.round(scale * 100)}% 로 줄여 표시`}
            </span>
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="미리보기 닫기"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/20 transition-colors hover:bg-white/25"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* 기기 화면 — 바깥을 눌러도 닫힌다 */}
        <div
          className="flex min-h-0 flex-1 items-start justify-center overflow-hidden px-4 pb-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <div
            style={{ width: w * scale, height: h * scale }}
            className="shrink-0 overflow-hidden rounded-[1.75rem] bg-stone-bg shadow-[0_20px_60px_rgba(0,0,0,0.5)] ring-1 ring-white/25"
          >
            <iframe
              key={src}
              src={src}
              title={`${label} 미리보기`}
              width={w}
              height={h}
              style={{
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                border: 0,
                display: "block",
              }}
            />
          </div>
        </div>

        {/*
          재현되지 않는 것을 적어 둔다. 노치·홈 인디케이터 여백은 실제
          기기의 브라우저가 알려 주는 값이라, 어떤 미리보기로도 만들 수 없다.
          "폰에서 확인한 것과 같다" 고 말하지 않기 위한 줄이다.
        */}
        <p className="shrink-0 px-4 pb-3 text-center text-[0.75rem] leading-relaxed text-white/60">
          같은 화면 · 같은 자료를 {kind === "mobile" ? "폰" : "PC"} 폭으로 다시
          그린 것입니다. 실제 기기의 노치 · 홈 인디케이터 여백과 주소창 높이는
          재현되지 않습니다.
        </p>
      </div>
    </div>,
    document.body,
  );
}

/**
 * 여는 단추. 볼 수 있을 때만 나타난다 —
 * 지금 기기와 같은 미리보기나 미리보기 안에서는 아예 그리지 않는다.
 */
export function DevicePreviewButton({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { available, open } = useDevicePreview();
  if (!available) return null;

  const Icon = available === "mobile" ? PhoneFrameIcon : MonitorIcon;
  const label = available === "mobile" ? "폰에서 보기" : "PC 에서 보기";

  if (compact) {
    return (
      <button
        type="button"
        onClick={open}
        aria-label={label}
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/[0.05] bg-card text-ink-sub shadow-card transition-colors hover:text-aqua-700 dark:border-white/10 ${className}`}
      >
        <Icon className="h-5 w-5" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={open}
      className={`flex w-full items-center gap-2.5 rounded-btn border border-stone-line bg-card-soft px-3 py-2.5 text-left text-sm font-bold text-ink-sub transition-colors hover:border-aqua-500 hover:bg-card hover:text-aqua-800 ${className}`}
    >
      <Icon className="h-[1.1rem] w-[1.1rem] shrink-0" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </button>
  );
}
