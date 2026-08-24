"use client";

/**
 * 방문 요청 · 문의
 *
 * 예약 시스템이 아니다. 지금 전화로 하던 일 — "이때쯤 갈게요" 를 남기고
 * 매장이 보고 연락하는 것 — 을 그대로 옮겼을 뿐이다.
 *
 * 그래서 화면 어디에도 "예약 완료" 라고 쓰지 않는다. 확정된 것처럼 보이면
 * 고객은 그날 그냥 오시고, 자리가 없으면 그건 시스템이 만든 사고다.
 */

import { useState } from "react";
import Link from "next/link";
import { usePortal } from "@/lib/portal/store";
import { Badge, Button, Card, FieldLabel, inputCls } from "@/components/ui";
import { CheckIcon, ChevronLeftIcon } from "@/components/ui/icons";
import { formatDateKr, todayISO } from "@/lib/utils/date";

const SLOTS = [
  { key: "morning", label: "오전" },
  { key: "afternoon", label: "오후" },
  { key: "evening", label: "저녁" },
] as const;

const SLOT_LABEL: Record<string, string> = {
  morning: "오전",
  afternoon: "오후",
  evening: "저녁",
};

const STATUS_LABEL: Record<string, string> = {
  open: "매장 확인 대기",
  handled: "매장에서 확인함",
  closed: "종료",
};

export default function MyRequest() {
  const { submitRequest, requests, branch } = usePortal();
  const [kind, setKind] = useState<"booking" | "inquiry">("booking");
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState<"morning" | "afternoon" | "evening" | undefined>();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (kind === "booking" && !date) return setMsg("희망하시는 날짜를 골라 주세요.");
    if (kind === "inquiry" && !note.trim()) return setMsg("문의 내용을 적어 주세요.");
    setBusy(true);
    setMsg("");
    try {
      await submitRequest({
        kind,
        preferredDate: kind === "booking" ? date : undefined,
        preferredSlot: kind === "booking" ? slot : undefined,
        note: note.trim() || undefined,
      });
      setDone(true);
      setDate("");
      setSlot(undefined);
      setNote("");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Link
        href="/my"
        className="tap-line inline-flex items-center gap-1 text-sm font-bold text-ink-sub"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        홈으로
      </Link>

      <div className="px-1">
        <h1 className="text-[1.375rem] font-extrabold text-ink">방문 요청 · 문의</h1>
        <p className="mt-1 text-[0.9375rem] leading-relaxed text-ink-sub">
          남겨 주시면 매장에서 확인 후 연락드립니다. 이 화면에서 예약이 바로
          확정되지는 않습니다.
        </p>
      </div>

      {done && (
        <Card lift={false} className="bg-aqua-50 ring-1 ring-aqua-200 dark:bg-aqua-500/10">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-card text-aqua-700 ring-1 ring-aqua-200">
              <CheckIcon className="h-4 w-4" />
            </span>
            <p className="text-[0.9375rem] leading-relaxed text-ink-soft">
              요청을 남겼습니다. 매장에서 확인한 뒤 연락드립니다.
            </p>
          </div>
        </Card>
      )}

      <Card>
        {/* 무엇을 남기는가 */}
        <FieldLabel>요청 종류</FieldLabel>
        <div className="mb-4 grid grid-cols-2 gap-1.5">
          {(
            [
              { key: "booking", label: "방문 희망" },
              { key: "inquiry", label: "문의" },
            ] as const
          ).map((k) => (
            <button
              key={k.key}
              type="button"
              aria-pressed={kind === k.key}
              onClick={() => setKind(k.key)}
              className={`touch-target rounded-card text-[0.9375rem] font-bold ring-1 transition-colors ${
                kind === k.key
                  ? "bg-sel text-sel-ink ring-transparent"
                  : "bg-card-soft text-ink-soft ring-stone-line hover:bg-aqua-50/60"
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>

        {kind === "booking" && (
          <>
            <div className="mb-4">
              <FieldLabel>희망 날짜</FieldLabel>
              <input
                type="date"
                className={inputCls}
                aria-label="희망 날짜"
                min={todayISO()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="mb-4">
              <FieldLabel>희망 시간대 (선택)</FieldLabel>
              <div className="grid grid-cols-3 gap-1.5">
                {SLOTS.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    aria-pressed={slot === s.key}
                    onClick={() => setSlot(slot === s.key ? undefined : s.key)}
                    className={`touch-target rounded-card text-[0.9375rem] font-bold ring-1 transition-colors ${
                      slot === s.key
                        ? "bg-sel text-sel-ink ring-transparent"
                        : "bg-card-soft text-ink-soft ring-stone-line hover:bg-aqua-50/60"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <div>
          <FieldLabel>
            {kind === "booking" ? "남기실 말씀 (선택)" : "문의 내용"}
          </FieldLabel>
          <textarea
            className={`${inputCls} min-h-[5rem] resize-y`}
            aria-label={kind === "booking" ? "남기실 말씀" : "문의 내용"}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="편하게 적어 주세요."
          />
        </div>

        {msg && (
          <p role="alert" className="mt-3 text-sm font-bold text-danger-text">
            {msg}
          </p>
        )}

        <Button
          size="lg"
          className="mt-4 w-full"
          disabled={busy}
          onClick={() => void submit()}
        >
          {busy ? "보내는 중…" : "요청 남기기"}
        </Button>

        {branch?.phone && (
          <p className="mt-3 text-center text-[0.8125rem] text-ink-sub">
            급하시면 매장으로 바로 전화 주세요 —{" "}
            <a
              href={`tel:${branch.phone.replace(/[^0-9+]/g, "")}`}
              className="font-bold text-aqua-700"
            >
              {branch.phone}
            </a>
          </p>
        )}
      </Card>

      {/* 지금까지 남긴 요청 */}
      {requests.length > 0 && (
        <Card>
          <h2 className="mb-3 text-[1.0625rem] font-extrabold text-ink">
            남긴 요청
          </h2>
          <ul className="space-y-2.5">
            {requests.map((r) => (
              <li
                key={r.id}
                className="rounded-card bg-card-soft px-4 py-3 ring-1 ring-stone-line"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[0.9375rem] font-extrabold text-ink">
                    {r.kind === "booking" ? "방문 희망" : "문의"}
                  </span>
                  <Badge tone={r.status === "open" ? "warn" : "positive"}>
                    {STATUS_LABEL[r.status]}
                  </Badge>
                </div>
                {r.preferredDate && (
                  <p className="nowrap-num mt-1 text-[0.8125rem] tabular text-ink-sub">
                    {formatDateKr(r.preferredDate)}
                    {r.preferredSlot ? ` · ${SLOT_LABEL[r.preferredSlot]}` : ""}
                  </p>
                )}
                {r.note && (
                  <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-soft">
                    {r.note}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
