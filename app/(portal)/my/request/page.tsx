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

import { useEffect, useState } from "react";
import { usePortal } from "@/lib/portal/store";
import { FieldLabel, inputCls } from "@/components/ui";
import { CheckIcon, PhoneIcon } from "@/components/ui/icons";
import { formatDateKr, formatRelative, todayISO } from "@/lib/utils/date";
import {
  ListGroup,
  ListRow,
  PageHead,
  Panel,
  PillButton,
  Section,
  StatusPill,
  StickyBar,
} from "@/components/portal/kit";

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

const STATUS: Record<string, { label: string; tone: "wait" | "done" | "muted" }> = {
  open: { label: "매장 확인 대기", tone: "wait" },
  handled: { label: "매장에서 확인함", tone: "done" },
  closed: { label: "종료", tone: "muted" },
};

/** 알약 두세 개 중 하나 고르기 (분절 단추) */
const segCls = (on: boolean) =>
  `touch-target rounded-full text-[0.9375rem] font-bold transition-colors ${
    on
      ? "bg-sel text-sel-ink shadow-sm"
      : "text-ink-soft hover:bg-card"
  }`;

export default function MyRequest() {
  const { submitRequest, requests, branch, sample } = usePortal();
  const [kind, setKind] = useState<"booking" | "inquiry">("booking");
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState<"morning" | "afternoon" | "evening" | undefined>();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState(false);

  /* 홈의 「1:1 상담」 칸에서 왔으면 「문의」 를 골라 둔 채로 연다 (?kind=inquiry) */
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("kind") === "inquiry") setKind("inquiry");
  }, []);

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
    <div className="space-y-5">
      <PageHead
        back={{ href: "/my", label: "홈" }}
        title="방문 요청 · 문의"
        sub="남겨 주시면 매장에서 확인 후 연락드립니다. 이 화면에서 예약이 바로 확정되지는 않습니다."
      />

      {done && (
        <Panel className="!bg-aqua-50 !ring-aqua-200 dark:!bg-aqua-500/10">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-card text-aqua-700 ring-1 ring-aqua-200">
              <CheckIcon className="h-4 w-4" />
            </span>
            {/*
              예시로 열려 있을 때 "매장에서 확인한 뒤 연락드립니다" 라고
              적으면 그건 거짓말이다 — 예시에서는 매장에 아무것도 가지
              않는다. 화면 맨 위 띠가 "예시입니다" 라고 말하고 있어도,
              방금 누른 단추 바로 밑에 있는 이 문장이 반대로 말하면
              사람은 가까운 쪽을 믿는다.
            */}
            <p className="text-[0.9375rem] leading-relaxed text-ink-soft">
              {sample
                ? "예시 화면이라 매장으로 전달되지는 않았습니다. 실제로는 이 자리에 남긴 요청이 매장 화면에 바로 뜨고, 확인한 뒤 연락드립니다."
                : "요청을 남겼습니다. 매장에서 확인한 뒤 연락드립니다."}
            </p>
          </div>
        </Panel>
      )}

      <Panel>
        {/* 무엇을 남기는가 — 알약 두 개 중 하나 */}
        <FieldLabel>요청 종류</FieldLabel>
        <div className="mb-5 grid grid-cols-2 gap-1 rounded-full bg-stone-bg-deep p-1">
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
              className={segCls(kind === k.key)}
            >
              {k.label}
            </button>
          ))}
        </div>

        {kind === "booking" && (
          <>
            <div className="mb-5">
              <FieldLabel>희망 날짜</FieldLabel>
              <input
                type="date"
                className={`${inputCls} !rounded-2xl`}
                aria-label="희망 날짜"
                min={todayISO()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="mb-5">
              <FieldLabel>희망 시간대 (선택)</FieldLabel>
              <div className="grid grid-cols-3 gap-1 rounded-full bg-stone-bg-deep p-1">
                {SLOTS.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    aria-pressed={slot === s.key}
                    onClick={() => setSlot(slot === s.key ? undefined : s.key)}
                    className={segCls(slot === s.key)}
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
            className={`${inputCls} min-h-[6rem] resize-y !rounded-2xl`}
            aria-label={kind === "booking" ? "남기실 말씀" : "문의 내용"}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="편하게 적어 주세요."
          />
        </div>

        {branch?.phone && (
          /* 글자 속 링크라 손가락 과녁이 너무 작았다 — 누르는 것으로 보이게 둔다 */
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-stone-line pt-4">
            <p className="text-[0.875rem] text-ink-sub">급하시면 매장으로 바로 전화 주세요</p>
            <a
              href={`tel:${branch.phone.replace(/[^0-9+]/g, "")}`}
              aria-label={`매장에 전화 걸기 ${branch.phone}`}
              className="touch-target inline-flex items-center gap-1.5 rounded-full bg-aqua-50 px-4 text-[0.9375rem] font-extrabold text-aqua-800 ring-1 ring-aqua-100 transition-colors hover:bg-aqua-100"
            >
              <PhoneIcon className="h-4 w-4 shrink-0" />
              {branch.phone}
            </a>
          </div>
        )}
      </Panel>

      {/* 지금까지 남긴 요청 — 주문 목록처럼 상태 알약 */}
      {requests.length > 0 && (
        <Section title="남긴 요청">
          <ListGroup>
            {requests.map((r) => {
              const st = STATUS[r.status] ?? STATUS.open;
              return (
                <ListRow
                  key={r.id}
                  chevron={false}
                  title={r.kind === "booking" ? "방문 희망" : "문의"}
                  sub={
                    <>
                      {r.preferredDate && (
                        <span className="nowrap-num tabular block">
                          {formatDateKr(r.preferredDate)}
                          {r.preferredSlot ? ` · ${SLOT_LABEL[r.preferredSlot]}` : ""}
                        </span>
                      )}
                      {r.note && <span className="block text-ink-soft">{r.note}</span>}
                      <span className="block text-ink-faint">{formatRelative(r.createdAt)} 남김</span>
                    </>
                  }
                  right={<StatusPill tone={st.tone}>{st.label}</StatusPill>}
                />
              );
            })}
          </ListGroup>
        </Section>
      )}

      {/* 보내는 단추 — 하단 탭 바로 위에 늘 붙어 있다 */}
      <StickyBar>
        {msg && (
          <p role="alert" className="mb-2 text-center text-sm font-bold text-danger-text">
            {msg}
          </p>
        )}
        <PillButton full disabled={busy} onClick={() => void submit()}>
          {busy ? "보내는 중…" : "요청 남기기"}
        </PillButton>
      </StickyBar>
    </div>
  );
}
