"use client";

/**
 * 고객이 남긴 것 (직원 화면)
 * ==========================
 *
 * MY WELLNESS 에서 고객이 직접 넣은 만족도·방문의향·요청이 여기로 온다.
 * 이번 단계에서 밖에서 안으로 들어오는 유일한 통로다.
 *
 * 판정에 쓰지 않는다
 * ------------------
 * 이 값은 Priority Score 에 들어가지 않는다. 매장의 관리 기준은 하나로
 * 유지하고, 고객이 한 말은 그 옆에 나란히 놓는다. 화면에도 "참고정보"
 * 라고 분명히 적어 둔다 — 그래야 원장님이 "왜 이 사람이 위로 올라왔지"
 * 를 물을 때 답이 하나로 남는다.
 *
 * 연결코드도 여기서 낸다. 고객 한 명을 보고 있을 때가 그 고객에게
 * 코드를 건네는 자리이기 때문이다.
 */

import { useState } from "react";
import { useStaffLink } from "@/lib/supabase/StaffLink";
import { Badge, Button, Card, SectionTitle } from "@/components/ui";
import { CheckIcon, PhoneIcon } from "@/components/ui/icons";
import { formatDateKr, formatRelative } from "@/lib/utils/date";

const INTENT_LABEL: Record<string, string> = {
  yes: "또 방문 예정",
  maybe: "아직 미정",
  no: "당분간 어려움",
};
const INTENT_TONE: Record<string, "positive" | "warn" | "gray"> = {
  yes: "positive",
  maybe: "warn",
  no: "gray",
};
const SLOT_LABEL: Record<string, string> = {
  morning: "오전",
  afternoon: "오후",
  evening: "저녁",
};

export default function CustomerVoiceCard({
  customerId,
  customerName,
}: {
  customerId: string;
  customerName: string;
}) {
  const {
    phase,
    feedback,
    requests,
    makeLinkCode,
    markFeedbackRead,
    setRequestStatus,
  } = useStaffLink();

  const [code, setCode] = useState<{ code: string; expiresAt: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  // 연결 전에는 아예 그리지 않는다. 빈 카드를 두면 "고장 났나" 로 읽힌다
  if (phase !== "linked") return null;

  const mine = feedback.filter((f) => f.customerId === customerId);
  const myRequests = requests.filter((r) => r.customerId === customerId);

  const issue = async () => {
    setBusy(true);
    setMsg("");
    try {
      setCode(await makeLinkCode(customerId));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mb-4 lg:mb-5">
      <SectionTitle icon={<PhoneIcon className="h-4 w-4" />} tone="gold">
        고객이 남긴 것
      </SectionTitle>

      <p className="-mt-2 mb-4 text-[0.8125rem] leading-relaxed text-ink-sub">
        고객이 MY WELLNESS 화면에서 직접 남긴 내용입니다. 참고정보이며 관리
        우선순위 계산에는 쓰지 않습니다.
      </p>

      {/* 요청 — 답을 해야 하는 것이므로 위에 둔다 */}
      {myRequests.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-[0.8125rem] font-extrabold text-ink-sub">
            방문 요청 · 문의
          </p>
          <ul className="space-y-2">
            {myRequests.map((r) => (
              <li
                key={r.id}
                className="rounded-card bg-card-soft px-4 py-3 ring-1 ring-stone-line"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-extrabold text-ink">
                    {r.kind === "booking" ? "방문 희망" : "문의"}
                  </span>
                  <Badge tone={r.status === "open" ? "warn" : "gray"}>
                    {r.status === "open" ? "미처리" : "확인함"}
                  </Badge>
                  <span className="nowrap-num ml-auto text-[0.8125rem] tabular text-ink-faint">
                    {formatRelative(r.createdAt.slice(0, 10))}
                  </span>
                </div>
                {r.preferredDate && (
                  <p className="nowrap-num mt-1 text-[0.9375rem] font-bold tabular text-aqua-800">
                    {formatDateKr(r.preferredDate)}
                    {r.preferredSlot ? ` · ${SLOT_LABEL[r.preferredSlot]}` : ""}
                  </p>
                )}
                {r.note && (
                  <p className="mt-1 text-[0.9375rem] leading-relaxed text-ink-soft">
                    {r.note}
                  </p>
                )}
                {r.status === "open" && (
                  <button
                    type="button"
                    onClick={() => void setRequestStatus(r.id, "handled")}
                    className="tap-line mt-1.5 inline-flex items-center gap-1 text-sm font-bold text-aqua-700"
                  >
                    <CheckIcon className="h-4 w-4" />
                    확인함으로 표시
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 피드백 */}
      <div>
        <p className="mb-2 text-[0.8125rem] font-extrabold text-ink-sub">
          이용 후 남긴 말
        </p>
        {mine.length === 0 ? (
          <p className="rounded-card border border-dashed border-stone-line bg-card-soft py-5 text-center text-sm text-ink-sub">
            아직 남긴 내용이 없습니다.
          </p>
        ) : (
          <ul className="space-y-2">
            {mine.map((f) => (
              <li
                key={f.id}
                className={`rounded-card px-4 py-3 ring-1 ${
                  f.readAt
                    ? "bg-card-soft ring-stone-line"
                    : "bg-aqua-50 ring-aqua-200 dark:bg-aqua-500/10"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  {f.satisfaction && (
                    <Badge tone={f.satisfaction >= 4 ? "positive" : "warn"}>
                      만족도 {f.satisfaction}점
                    </Badge>
                  )}
                  {f.revisitIntent && (
                    <Badge tone={INTENT_TONE[f.revisitIntent]}>
                      {INTENT_LABEL[f.revisitIntent]}
                    </Badge>
                  )}
                  {f.homecareInterest && <Badge tone="gold">홈케어 관심</Badge>}
                  <span className="nowrap-num ml-auto text-[0.8125rem] tabular text-ink-faint">
                    {formatRelative(f.createdAt.slice(0, 10))}
                  </span>
                </div>
                {f.note && (
                  <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-soft">
                    “{f.note}”
                  </p>
                )}
                {!f.readAt && (
                  <button
                    type="button"
                    onClick={() => void markFeedbackRead(f.id)}
                    className="tap-line mt-1.5 inline-flex items-center gap-1 text-sm font-bold text-aqua-700"
                  >
                    <CheckIcon className="h-4 w-4" />
                    읽음으로 표시
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 연결코드 발급 */}
      <div className="mt-4 border-t border-stone-line pt-4">
        <p className="text-[0.8125rem] font-extrabold text-ink-sub">
          고객 화면 연결코드
        </p>
        {code ? (
          <div className="mt-2 rounded-card bg-card-soft px-4 py-4 text-center ring-1 ring-stone-line">
            <p className="text-[2rem] font-extrabold tracking-[0.25em] text-ink">
              {code.code}
            </p>
            <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink-sub">
              {customerName}님께 이 코드를 알려 주세요. 고객이 MY WELLNESS 에서
              한 번 넣으면 연결됩니다.
            </p>
            <p className="nowrap-num mt-1 text-[0.8125rem] tabular text-ink-faint">
              {formatDateKr(code.expiresAt.slice(0, 10))}까지 사용 가능 · 1회용
            </p>
          </div>
        ) : (
          <>
            <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-sub">
              고객이 자기 이용기록과 이용권을 휴대폰으로 볼 수 있게 하는
              여섯 자리 코드입니다.
            </p>
            {msg && (
              <p role="alert" className="mt-2 text-sm font-bold text-danger-text">
                {msg}
              </p>
            )}
            <Button
              variant="secondary"
              className="mt-2"
              disabled={busy}
              onClick={() => void issue()}
            >
              {busy ? "발급 중…" : "연결코드 발급"}
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}
