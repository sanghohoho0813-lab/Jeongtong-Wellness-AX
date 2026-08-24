"use client";

/**
 * 대시보드 — 고객 맞춤 케어 · 부위 선택 카드 (시안 반영)
 * 고객을 선택하고 Body Map에서 집중 케어 부위를 바로 기록한다.
 */

import { useMemo, useState } from "react";
import { useStore } from "@/lib/data/store";
import { displayName } from "@/lib/utils/format";
import { BodyPartRecord } from "@/lib/types";
import { Button, SectionTitle, inputCls } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import BodyMap from "@/components/body-map/BodyMap";

export default function BodyMapCard() {
  const { customers, updateCustomer, privacyMode } = useStore();
  const toast = useToast();
  const [customerId, setCustomerId] = useState("");
  const [parts, setParts] = useState<BodyPartRecord[]>([]);

  const sorted = useMemo(
    () => [...customers].sort((a, b) => a.name.localeCompare(b.name, "ko")),
    [customers],
  );

  const selectCustomer = (id: string) => {
    setCustomerId(id);
    const c = customers.find((x) => x.id === id);
    setParts(c?.focusBodyParts ?? []);
  };

  const save = () => {
    if (!customerId) return;
    updateCustomer(customerId, { focusBodyParts: parts });
    const c = customers.find((x) => x.id === customerId);
    toast(`${c?.name} 고객의 집중 케어 부위를 저장했습니다`);
  };

  return (
    <div className="card-accent card-lift group flex flex-col">
      <SectionTitle
        tone="teal"
        icon={
          <svg viewBox="0 0 24 24" className="icon-pop h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="12" cy="4.6" r="2.1" />
            <path d="M12 7.5v6M8 9.2h8M12 13.5l-2.6 6.8M12 13.5l2.6 6.8" />
          </svg>
        }
      >
        고객 맞춤 케어 · 부위 선택
      </SectionTitle>
      <p className="mb-3 text-sm text-ink-sub">
        고객이 평소 집중 케어를 원하는 부위를 터치하여 기록하세요. 고객
        프로필의 <strong className="font-bold">주요 케어 부위</strong>로
        저장됩니다.
      </p>

      <select
        value={customerId}
        onChange={(e) => selectCustomer(e.target.value)}
        className={`${inputCls} mb-4`}
        aria-label="고객 선택"
      >
        <option value="">고객을 선택하세요</option>
        {sorted.map((c) => (
          <option key={c.id} value={c.id}>
            {displayName(c.name, privacyMode)}
          </option>
        ))}
      </select>

      <BodyMap
        value={parts}
        onChange={setParts}
        readOnly={!customerId}
        compactChips
      />

      <Button
        onClick={save}
        disabled={!customerId}
        className="mt-4 w-full"
        size="lg"
      >
        부위 선택 기록하기
      </Button>
    </div>
  );
}
