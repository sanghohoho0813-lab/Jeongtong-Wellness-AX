"use client";

/**
 * 이용 후 한마디
 * ==============
 *
 * 이번 단계에서 고객이 하는 유일한 "쓰기" 동작이고, 밖에서 안으로 들어오는
 * 데이터의 전부다. 그래서 홈 화면 안에 그대로 펼쳐 둔다 — 따로 들어가야
 * 하는 화면에 두면 아무도 남기지 않는다.
 *
 * 묻는 것은 셋뿐이다. 만족도, 다음에 또 오실 생각인지, 하고 싶은 말.
 * 몸이 어떤지는 묻지 않는다. 물어서 받아 두면 그 글이 곧 진료기록처럼
 * 쌓이고, 시스템이 그걸 읽어 무언가를 판단하고 싶어진다.
 */

import { useState } from "react";
import { usePortal } from "@/lib/portal/store";
import { Badge, Button, Card, inputCls } from "@/components/ui";
import { CheckIcon } from "@/components/ui/icons";
import { formatDateKr } from "@/lib/utils/date";

const SCORES = [1, 2, 3, 4, 5];
const SCORE_LABEL: Record<number, string> = {
  1: "아쉬움",
  2: "보통 이하",
  3: "보통",
  4: "좋음",
  5: "아주 좋음",
};

const INTENTS = [
  { key: "yes", label: "또 방문할게요" },
  { key: "maybe", label: "아직 미정" },
  { key: "no", label: "당분간 어려워요" },
] as const;

export default function FeedbackCard({
  lastVisitId,
  lastVisitAt,
}: {
  lastVisitId?: string;
  lastVisitAt?: string;
}) {
  const { submitFeedback, feedback, sample } = usePortal();
  const [score, setScore] = useState<number | null>(null);
  const [intent, setIntent] = useState<"yes" | "maybe" | "no" | null>(null);
  const [note, setNote] = useState("");
  const [homecare, setHomecare] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState(false);

  /**
   * 마지막 방문에 대해 이미 남겼는지.
   * 같은 방문에 두 번 묻지 않는다 — 같은 질문이 계속 떠 있으면
   * 남긴 말이 전달되지 않은 것처럼 느껴진다.
   */
  const already = lastVisitId
    ? feedback.some((f) => f.visitId === lastVisitId)
    : feedback.length > 0;

  if (done || already) {
    const latest = feedback[0];
    return (
      <Card>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-aqua-50 text-aqua-700 ring-1 ring-aqua-200">
            <CheckIcon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[1.0625rem] font-extrabold text-ink">
              남겨 주셔서 감사합니다
            </p>
            {/* 예시에서는 매장에 가지 않는다 — 간다고 적으면 거짓말이다 */}
            <p className="mt-1 text-[0.9375rem] leading-relaxed text-ink-sub">
              {sample
                ? "예시 화면이라 매장으로 전달되지는 않았습니다. 실제로는 남겨 주신 내용이 매장 화면에 그대로 도착합니다."
                : "보내 주신 내용은 매장에서 확인합니다."}
            </p>
            {latest?.satisfaction && (
              <p className="mt-2 flex flex-wrap items-center gap-2">
                <Badge tone="aqua">만족도 {latest.satisfaction}점</Badge>
                {latest.revisitIntent && (
                  <Badge tone="gray">
                    {INTENTS.find((i) => i.key === latest.revisitIntent)?.label}
                  </Badge>
                )}
              </p>
            )}
          </div>
        </div>
      </Card>
    );
  }

  const submit = async () => {
    if (score === null) return setMsg("만족도를 골라 주세요.");
    if (intent === null) return setMsg("다음 방문 의향을 골라 주세요.");
    setBusy(true);
    setMsg("");
    try {
      await submitFeedback({
        visitId: lastVisitId,
        satisfaction: score,
        revisitIntent: intent,
        note: note.trim() || undefined,
        homecareInterest: homecare || undefined,
      });
      setDone(true);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "다시 시도해 주세요.");
      setBusy(false);
    }
  };

  /*
    처음에는 점수 줄만 보인다.

    묻는 것이 셋(만족도 · 재방문 의향 · 하고 싶은 말)이라 전부 펼쳐 두면
    입력칸 · 라디오 · 글상자 · 체크박스 · 보내기까지 열두 개가 홈 화면
    한가운데를 차지한다. 고객이 홈에 오는 이유는 "언제 가지 · 몇 번 남았지 ·
    뭘 해 줬더라" 셋인데, 그 셋보다 설문이 크면 화면이 목적을 잃는다.

    그래서 첫 물음(점수)만 남기고 나머지는 접는다. 점수를 누르는 순간
    나머지가 펼쳐진다 — 이미 한 번 답한 사람은 끝까지 갈 확률이 높고,
    아무 관심 없는 사람은 두 줄만 지나치면 된다.
  */
  const started = score !== null;

  return (
    <Card>
      <h2 className="text-[1.0625rem] font-extrabold text-ink">
        이번 이용은 어떠셨나요
      </h2>
      <p className="mt-1 text-[0.9375rem] text-ink-sub">
        {lastVisitAt
          ? `${formatDateKr(lastVisitAt.slice(0, 10))} 이용에 대해 남겨 주세요.`
          : "이용 경험을 남겨 주세요."}
      </p>

      {/* 만족도 */}
      <div className="mt-4">
        <p className="mb-2 text-[0.8125rem] font-bold text-ink-sub">만족도</p>
        <div className="grid grid-cols-5 gap-1.5">
          {SCORES.map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={score === n}
              aria-label={`${n}점 ${SCORE_LABEL[n]}`}
              onClick={() => setScore(n)}
              className={`flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-card ring-1 transition-colors ${
                score === n
                  ? "bg-sel text-sel-ink ring-transparent"
                  : "bg-card-soft text-ink-soft ring-stone-line hover:bg-aqua-50/60"
              }`}
            >
              <span className="nowrap-num text-[1.0625rem] font-extrabold tabular">
                {n}
              </span>
              {/* 실측 11px 이었다. 뜻풀이가 안 읽히면 숫자만 남는다 → 12.1px */}
              <span className="text-[0.6875rem] font-bold leading-none">
                {SCORE_LABEL[n]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 아래는 점수를 고른 뒤에만 — 첫 물음에 답한 사람에게만 마저 묻는다 */}
      {started && (
      <>
      {/* 다음 방문 의향 */}
      <div className="mt-4">
        <p className="mb-2 text-[0.8125rem] font-bold text-ink-sub">
          다음 방문 의향
        </p>
        <div className="grid grid-cols-1 gap-1.5 xs:grid-cols-3">
          {INTENTS.map((it) => (
            <button
              key={it.key}
              type="button"
              aria-pressed={intent === it.key}
              onClick={() => setIntent(it.key)}
              className={`touch-target rounded-card px-3 text-[0.9375rem] font-bold ring-1 transition-colors ${
                intent === it.key
                  ? "bg-sel text-sel-ink ring-transparent"
                  : "bg-card-soft text-ink-soft ring-stone-line hover:bg-aqua-50/60"
              }`}
            >
              {it.label}
            </button>
          ))}
        </div>
      </div>

      {/* 한마디 */}
      <div className="mt-4">
        <p className="mb-2 text-[0.8125rem] font-bold text-ink-sub">
          하고 싶은 말 <span className="font-normal text-ink-faint">(선택)</span>
        </p>
        <textarea
          className={`${inputCls} min-h-[5rem] resize-y`}
          aria-label="하고 싶은 말"
          value={note}
          maxLength={500}
          onChange={(e) => setNote(e.target.value)}
          placeholder="편하게 적어 주세요."
        />
      </div>

      {/* 홈케어 관심 */}
      <button
        type="button"
        aria-pressed={homecare}
        onClick={() => setHomecare((v) => !v)}
        className={`mt-3 flex w-full items-center gap-2.5 rounded-card px-3.5 py-3 text-left ring-1 transition-colors ${
          homecare
            ? "bg-aqua-50 ring-aqua-200 dark:bg-aqua-500/10"
            : "bg-card-soft ring-stone-line hover:bg-aqua-50/60"
        }`}
      >
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ring-1 ${
            homecare ? "bg-sel text-sel-ink ring-transparent" : "bg-card ring-stone-line"
          }`}
        >
          {homecare && <CheckIcon className="h-4 w-4" />}
        </span>
        <span className="text-[0.9375rem] font-bold text-ink-soft">
          집에서 할 수 있는 생활관리 정보도 받아볼래요
        </span>
      </button>

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
        {busy ? "보내는 중…" : "보내기"}
      </Button>
      </>
      )}
    </Card>
  );
}
