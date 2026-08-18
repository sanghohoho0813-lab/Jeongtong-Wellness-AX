"use client";

/**
 * 경량 토스트 시스템 — 저장/처리 액션의 완료 피드백 전용.
 * 모바일 하단 네비 위로 뜨며 자동 소멸한다.
 */

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { CheckIcon } from "./icons";

interface ToastItem {
  id: number;
  message: string;
  tone: "success" | "info";
}

const ToastContext = createContext<{
  toast: (message: string, tone?: "success" | "info") => void;
} | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const toast = useCallback(
    (message: string, tone: "success" | "info" = "success") => {
      const id = ++seq.current;
      setItems((prev) => [...prev.slice(-2), { id, message, tone }]);
      window.setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id));
      }, 2600);
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-8"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className="flex max-w-md items-center gap-2.5 rounded-full bg-deep-900/95 px-4 py-2.5 text-sm font-bold text-white shadow-float ring-1 ring-white/10 backdrop-blur"
            style={{ animation: "toast-in 0.22s ease-out" }}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                t.tone === "success" ? "bg-aqua-400 text-deep-900" : "bg-white/20 text-white"
              }`}
            >
              <CheckIcon className="h-3 w-3" strokeWidth={2.6} />
            </span>
            <span className="min-w-0">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx.toast;
}
