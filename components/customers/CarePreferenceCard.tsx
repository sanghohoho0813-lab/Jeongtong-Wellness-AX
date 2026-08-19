"use client";

/**
 * 케어 선호 · 특이사항 (고객 감동 포인트)
 *
 * 현장에서 직원이 짧게 기록해 두고, 다음 방문 때 확인·반영하는 영역이다.
 * "매번 확인"으로 고정한 항목은 방문 기록 입력 시 체크리스트로 먼저 노출된다.
 */

import { useState } from "react";
import { useStore } from "@/lib/data/store";
import {
  CarePreference,
  PREFERENCE_CATEGORY_LABELS,
  PreferenceCategory,
} from "@/lib/types";
import { PREFERENCE_PRESETS } from "@/lib/data/preference-presets";
import { formatDateKr } from "@/lib/utils/date";
import { Badge, Button, SectionTitle, inputCls } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { PlusIcon, SparkIcon, XIcon } from "@/components/ui/icons";

/** 카테고리별 색 — 목록에서 성격이 바로 구분되도록 */
export const PREF_TONES: Record<
  PreferenceCategory,
  { badge: "aqua" | "sky" | "violet" | "gold" | "warn" | "positive" | "gray"; dot: string }
> = {
  temperature: { badge: "warn", dot: "bg-warn" },
  pressure: { badge: "violet", dot: "bg-violet-500" },
  position: { badge: "sky", dot: "bg-sky-500" },
  environment: { badge: "positive", dot: "bg-positive" },
  beverage: { badge: "gold", dot: "bg-gold" },
  conversation: { badge: "aqua", dot: "bg-aqua-500" },
  caution: { badge: "warn", dot: "bg-danger" },
  etc: { badge: "gray", dot: "bg-ink-faint" },
};

const CATEGORY_ORDER: PreferenceCategory[] = [
  "temperature",
  "pressure",
  "position",
  "environment",
  "beverage",
  "conversation",
  "caution",
  "etc",
];

/** 자유 입력 보조 문구 — 프리셋에 없는 내용을 적을 때만 사용 */
const PLACEHOLDERS: Record<PreferenceCategory, string> = {
  temperature: "예: 쑥뜸 온도는 살짝 낮게 선호",
  pressure: "예: 어깨는 강하게, 허리는 부드럽게",
  position: "예: 엎드린 자세를 오래 힘들어하심",
  environment: "예: 조명 어둡게, 음악 작게 선호",
  beverage: "예: 따뜻한 물 선호 (차가운 음료 사양)",
  conversation: "예: 조용히 쉬는 편을 선호",
  caution: "예: 무릎 부위는 오래 열 적용 피하기",
  etc: "예: 손녀 이야기 자주 하심 — 안부 여쭤보기",
};

export function PreferenceRow({
  pref,
  customerId,
  editable,
}: {
  pref: CarePreference;
  customerId: string;
  editable: boolean;
}) {
  const { togglePreferencePin, removePreference, staff } = useStore();
  const t = PREF_TONES[pref.category];
  const author = staff.find((s) => s.id === pref.createdByStaffId)?.name;

  return (
    <li className="row-accent group flex items-start gap-3 overflow-hidden rounded-card bg-card-soft px-3.5 py-3 pl-4 ring-1 ring-black/[0.04]">
      <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${t.dot}`} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone={t.badge}>
            {PREFERENCE_CATEGORY_LABELS[pref.category]}
          </Badge>
          {pref.pinned && (
            <Badge tone="aqua" dot>
              매번 확인
            </Badge>
          )}
        </div>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">{pref.note}</p>
        <p className="mt-0.5 text-[0.7rem] text-ink-faint">
          {formatDateKr(pref.createdAt)}
          {author ? ` · ${author} 기록` : ""}
        </p>
      </div>
      {editable && (
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => togglePreferencePin(customerId, pref.id)}
            title={pref.pinned ? "매번 확인 해제" : "매번 확인으로 고정"}
            className={`touch-target rounded-full px-2.5 py-1 text-xs font-bold transition-colors ${
              pref.pinned
                ? "bg-aqua-600 text-white"
                : "bg-card text-ink-sub ring-1 ring-stone-line hover:bg-aqua-50"
            }`}
          >
            {pref.pinned ? "고정됨" : "고정"}
          </button>
          <button
            onClick={() => removePreference(customerId, pref.id)}
            aria-label="삭제"
            className="touch-target flex h-8 w-8 items-center justify-center rounded-full text-ink-faint hover:bg-red-50 hover:text-danger dark:hover:bg-red-400/10"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      )}
    </li>
  );
}

export default function CarePreferenceCard({
  customerId,
  preferences,
}: {
  customerId: string;
  preferences: CarePreference[];
}) {
  const { addPreference } = useStore();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<PreferenceCategory>("temperature");
  const [picked, setPicked] = useState<string[]>([]);
  const [note, setNote] = useState("");

  const sorted = [...preferences].sort((a, b) => {
    if (!!b.pinned !== !!a.pinned) return b.pinned ? 1 : -1;
    return b.createdAt.localeCompare(a.createdAt);
  });

  /** 이미 기록된 문구는 다시 담지 않도록 표시 */
  const already = new Set(preferences.map((p) => p.note));
  const presets = PREFERENCE_PRESETS[category];
  const canSave = picked.length > 0 || note.trim().length > 0;

  const togglePick = (text: string) =>
    setPicked((prev) =>
      prev.includes(text) ? prev.filter((t) => t !== text) : [...prev, text],
    );

  const save = () => {
    if (!canSave) return;
    // 선택한 문구는 각각 하나의 기록으로 저장한다
    for (const text of picked) {
      addPreference(customerId, { category, note: text, pinned: false });
    }
    if (note.trim()) {
      addPreference(customerId, { category, note: note.trim(), pinned: false });
    }
    const count = picked.length + (note.trim() ? 1 : 0);
    setPicked([]);
    setNote("");
    setOpen(false);
    toast(`케어 선호 · 특이사항 ${count}건을 기록했습니다`);
  };

  const changeCategory = (c: PreferenceCategory) => {
    setCategory(c);
    setPicked([]);
  };

  return (
    <div className="card-accent card-lift group flex flex-col">
      <SectionTitle
        tone="gold"
        icon={<SparkIcon className="icon-pop h-4 w-4" />}
        action={
          <Button
            variant={open ? "ghost" : "secondary"}
            size="sm"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? (
              "취소"
            ) : (
              <>
                <PlusIcon className="h-4 w-4" />
                기록 추가
              </>
            )}
          </Button>
        }
      >
        케어 선호 · 특이사항
      </SectionTitle>
      <p className="-mt-2 mb-3 text-xs leading-relaxed text-ink-sub">
        고객이 좋아하는 방식과 기억해야 할 점을 남겨두면, 다음 방문 기록 시
        먼저 확인할 수 있습니다.
      </p>

      {open && (
        <div className="mb-3 rounded-card bg-card px-3.5 py-3 ring-1 ring-black/[0.06] dark:ring-white/10">
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_ORDER.map((c) => (
              <button
                key={c}
                onClick={() => changeCategory(c)}
                className={`touch-target rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                  category === c
                    ? "bg-aqua-600 text-white"
                    : "bg-card-soft text-ink-sub ring-1 ring-stone-line hover:bg-aqua-50"
                }`}
              >
                {PREFERENCE_CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>

          {/* 분류별 자주 쓰는 문구 — 클릭만으로 기록 (여러 개 선택 가능) */}
          <div className="mt-2.5 rounded-card bg-card-soft px-3 py-2.5 ring-1 ring-stone-line">
            <p className="text-[0.7rem] font-extrabold uppercase tracking-wider text-ink-faint">
              {PREFERENCE_CATEGORY_LABELS[category]} — 자주 쓰는 문구
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {presets.map((text) => {
                const done = already.has(text);
                const on = picked.includes(text);
                return (
                  <button
                    key={text}
                    onClick={() => !done && togglePick(text)}
                    disabled={done}
                    title={done ? "이미 기록된 문구입니다" : undefined}
                    className={`touch-target max-w-full rounded-full px-3 py-1.5 text-left text-xs font-bold transition-colors ${
                      done
                        ? "cursor-not-allowed bg-stone-bg text-ink-faint line-through"
                        : on
                          ? "bg-gradient-to-r from-aqua-500 to-deep-700 text-white shadow-sm"
                          : "bg-card text-ink-soft ring-1 ring-stone-line hover:bg-aqua-50 hover:text-aqua-800"
                    }`}
                  >
                    {on && <span className="mr-1">✓</span>}
                    {text}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[0.7rem] text-ink-sub">
              여러 개를 선택하면 각각 하나의 기록으로 저장됩니다.
            </p>
          </div>

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={PLACEHOLDERS[category]}
            className={`${inputCls} mt-2.5 min-h-14 text-sm`}
            aria-label="직접 입력 (선택)"
          />
          <div className="mt-2.5 flex items-center justify-end gap-2">
            {picked.length > 0 && (
              <span className="nowrap-num mr-auto text-xs font-bold text-aqua-800">
                {picked.length}개 선택됨
              </span>
            )}
            <Button size="sm" onClick={save} disabled={!canSave}>
              기록 저장
            </Button>
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <p className="rounded-card border border-dashed border-stone-line bg-card-soft py-8 text-center text-sm text-ink-sub">
          아직 기록된 선호 · 특이사항이 없습니다.
        </p>
      ) : (
        <ul className="space-y-2">
          {sorted.map((p) => (
            <PreferenceRow
              key={p.id}
              pref={p}
              customerId={customerId}
              editable
            />
          ))}
        </ul>
      )}
    </div>
  );
}
