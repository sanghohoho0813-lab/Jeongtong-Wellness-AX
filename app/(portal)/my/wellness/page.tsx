"use client";

/**
 * 나의 웰니스
 *
 * 세 덩어리다.
 *   1) Wellness Type — 이용 행동으로 나눈 유형과 그 근거
 *   2) 이번 달 리포트 — 저장된 숫자를 문장으로 옮긴 것
 *   3) Wellness Profile — 고객이 직접 적는 자기 정보
 *
 * 1)과 2)는 전부 "사실의 서술" 이다. 무엇이 좋아졌다거나 어떻게 하라는
 * 말은 한 줄도 없다. 그 선을 넘는 순간 이 화면은 운영 도구가 아니라
 * 상담 소견이 된다.
 */

import { useState } from "react";
import { usePortal } from "@/lib/portal/store";
import {
  buildReportFacts,
  buildReportLines,
  classifyWellnessType,
  nextReference,
  summarizePasses,
  summarizeUsage,
} from "@/lib/portal/wellness";
import { Badge, Button, Card, FieldLabel, inputCls } from "@/components/ui";
import { CheckIcon } from "@/components/ui/icons";
import { BODY_PART_LABELS, type BodyPart } from "@/lib/types";
import { formatDateKr } from "@/lib/utils/date";

const PURPOSES = ["생활관리", "컨디션 관리", "휴식", "정기 관리"];
const TIMES = [
  { key: "morning", label: "오전" },
  { key: "afternoon", label: "오후" },
  { key: "evening", label: "저녁" },
] as const;

/** 고객이 고를 수 있는 관심 부위 — 직원 화면과 같은 어휘를 쓴다 */
const PARTS: BodyPart[] = [
  "neck_shoulder",
  "back",
  "waist",
  "abdomen",
  "pelvis_hip",
  "leg",
  "arm",
  "knee",
  "foot_ankle",
];

export default function MyWellness() {
  const {
    customer,
    visits,
    memberships,
    profile,
    feedback,
    contentOpens,
    saveProfile,
  } = usePortal();

  const usage = summarizeUsage(visits);
  const pass = summarizePasses(memberships);
  const next = nextReference(usage, customer?.nextManageDate);
  const type = classifyWellnessType({
    usage,
    pass,
    homecareInterest: profile.homecareInterest,
    contentOpens,
  });

  const facts = buildReportFacts(
    visits,
    memberships,
    feedback.map((f) => f.satisfaction).filter((n): n is number => typeof n === "number"),
  );
  const reportLines = buildReportLines(facts);

  // 프로필 편집
  const [editing, setEditing] = useState(false);
  const [purpose, setPurpose] = useState(profile.purpose ?? "");
  const [areas, setAreas] = useState<BodyPart[]>(profile.interestAreas ?? []);
  const [time, setTime] = useState(profile.preferredTime);
  const [homecare, setHomecare] = useState(profile.homecareInterest === true);
  const [note, setNote] = useState(profile.note ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const toggleArea = (p: BodyPart) =>
    setAreas((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  const save = async () => {
    setBusy(true);
    setMsg("");
    try {
      await saveProfile({
        purpose: purpose || undefined,
        interestAreas: areas,
        preferredTime: time,
        homecareInterest: homecare,
        note: note.trim() || undefined,
      });
      setEditing(false);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="px-1">
        <h1 className="text-[1.375rem] font-extrabold text-ink">나의 웰니스</h1>
        <p className="mt-1 text-[0.9375rem] text-ink-sub">
          이용 기록을 바탕으로 정리한 내용입니다.
        </p>
      </div>

      {/* Wellness Type */}
      <Card>
        <p className="text-[0.8125rem] font-bold text-ink-sub">Wellness Type</p>
        <p className="mt-1.5 flex flex-wrap items-center gap-2">
          <span className="text-[1.5rem] font-extrabold text-ink">{type.label}</span>
          {type.key === "accumulating" && <Badge tone="gray">기록 쌓는 중</Badge>}
        </p>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-soft">
          {type.description}
        </p>
        {type.reasons.length > 0 && (
          <ul className="mt-3 space-y-1.5 rounded-card bg-card-soft px-4 py-3 ring-1 ring-stone-line">
            {type.reasons.map((r, i) => (
              <li key={i} className="text-[0.8125rem] leading-relaxed text-ink-sub">
                · {r}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-[0.75rem] leading-relaxed text-ink-faint">
          이용 방식에 따른 구분입니다. 몸 상태에 대한 분류가 아닙니다.
        </p>
      </Card>

      {/* 이번 달 리포트 */}
      <Card>
        <h2 className="text-[1.0625rem] font-extrabold text-ink">
          이번 달 나의 웰니스 리포트
        </h2>
        <ul className="mt-3 space-y-2">
          {reportLines.map((l, i) => (
            <li
              key={i}
              className="flex gap-2.5 text-[0.9375rem] leading-relaxed text-ink-soft"
            >
              <span className="mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full bg-aqua-500" />
              <span className="min-w-0">{l}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[0.75rem] leading-relaxed text-ink-faint">
          저장된 이용 기록을 그대로 정리한 문장입니다. 앞으로의 예측이나 몸
          상태에 대한 판단은 하지 않습니다.
        </p>
      </Card>

      {/* 다음 관리 참고일 */}
      <Card>
        <p className="text-[0.8125rem] font-bold text-ink-sub">다음 관리 참고일</p>
        <p className="nowrap-num mt-1.5 text-[1.75rem] font-extrabold tabular text-aqua-700">
          {next.date ? formatDateKr(next.date) : "—"}
        </p>
        <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink-sub">
          {next.basis}
        </p>
      </Card>

      {/* Wellness Profile */}
      <Card>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-[1.0625rem] font-extrabold text-ink">
            나의 Wellness Profile
          </h2>
          {!editing && (
            <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
              {profile.updatedAt ? "수정" : "작성"}
            </Button>
          )}
        </div>

        {!editing ? (
          <dl className="divide-y divide-stone-line">
            {[
              { k: "이용 목적", v: profile.purpose },
              {
                k: "관심 관리부위",
                v: (profile.interestAreas ?? [])
                  .map((p) => BODY_PART_LABELS[p] ?? p)
                  .join(" · "),
              },
              {
                k: "선호 시간대",
                v: TIMES.find((t) => t.key === profile.preferredTime)?.label,
              },
              {
                k: "홈케어 정보",
                v:
                  profile.homecareInterest === undefined
                    ? undefined
                    : profile.homecareInterest
                      ? "받아볼래요"
                      : "괜찮아요",
              },
              { k: "한마디", v: profile.note },
            ].map((row) => (
              <div
                key={row.k}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2.5"
              >
                <dt className="w-24 shrink-0 text-[0.8125rem] font-bold text-ink-sub">
                  {row.k}
                </dt>
                <dd className="min-w-0 flex-1 text-[0.9375rem] text-ink-soft">
                  {row.v || <span className="text-ink-faint">—</span>}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <div className="space-y-4">
            <div>
              <FieldLabel>이용 목적</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                {PURPOSES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    aria-pressed={purpose === p}
                    onClick={() => setPurpose(purpose === p ? "" : p)}
                    className={`touch-target rounded-full px-4 text-sm font-bold ring-1 transition-colors ${
                      purpose === p
                        ? "bg-sel text-sel-ink ring-transparent"
                        : "bg-card-soft text-ink-soft ring-stone-line hover:bg-aqua-50/60"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel>관심 관리부위</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                {PARTS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    aria-pressed={areas.includes(p)}
                    onClick={() => toggleArea(p)}
                    className={`touch-target rounded-full px-4 text-sm font-bold ring-1 transition-colors ${
                      areas.includes(p)
                        ? "bg-sel text-sel-ink ring-transparent"
                        : "bg-card-soft text-ink-soft ring-stone-line hover:bg-aqua-50/60"
                    }`}
                  >
                    {BODY_PART_LABELS[p]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel>선호 시간대</FieldLabel>
              <div className="grid grid-cols-3 gap-1.5">
                {TIMES.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    aria-pressed={time === t.key}
                    onClick={() => setTime(time === t.key ? undefined : t.key)}
                    className={`touch-target rounded-card text-[0.9375rem] font-bold ring-1 transition-colors ${
                      time === t.key
                        ? "bg-sel text-sel-ink ring-transparent"
                        : "bg-card-soft text-ink-soft ring-stone-line hover:bg-aqua-50/60"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              aria-pressed={homecare}
              onClick={() => setHomecare((v) => !v)}
              className={`flex w-full items-center gap-2.5 rounded-card px-3.5 py-3 text-left ring-1 transition-colors ${
                homecare
                  ? "bg-aqua-50 ring-aqua-200 dark:bg-aqua-500/10"
                  : "bg-card-soft ring-stone-line hover:bg-aqua-50/60"
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ring-1 ${
                  homecare
                    ? "bg-sel text-sel-ink ring-transparent"
                    : "bg-card ring-stone-line"
                }`}
              >
                {homecare && <CheckIcon className="h-4 w-4" />}
              </span>
              <span className="text-[0.9375rem] font-bold text-ink-soft">
                홈케어 정보를 받아볼래요
              </span>
            </button>

            <div>
              <FieldLabel>한마디 (선택)</FieldLabel>
              <textarea
                className={`${inputCls} min-h-[4.5rem] resize-y`}
                aria-label="한마디"
                maxLength={300}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="매장에 알려 두고 싶은 내용을 적어 주세요."
              />
            </div>

            {msg && (
              <p role="alert" className="text-sm font-bold text-danger-text">
                {msg}
              </p>
            )}

            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => setEditing(false)}
              >
                취소
              </Button>
              <Button className="flex-1" disabled={busy} onClick={() => void save()}>
                {busy ? "저장 중…" : "저장"}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
