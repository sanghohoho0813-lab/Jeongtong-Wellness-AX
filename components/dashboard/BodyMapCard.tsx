"use client";

/**
 * 대시보드 — 고객 맞춤 케어 · 부위 선택 카드 (시안 반영)
 * 고객을 선택하고 Body Map에서 집중 케어 부위를 바로 기록한다.
 */

import { useMemo, useState } from "react";
import { useStore } from "@/lib/data/store";
import { BodyPartRecord } from "@/lib/types";
import { Button, Card, SectionTitle, inputCls } from "@/components/ui";
import BodyMap from "@/components/body-map/BodyMap";

export default function BodyMapCard() {
  const { customers, updateCustomer } = useStore();
  const [customerId, setCustomerId] = useState("");
  const [parts, setParts] = useState<BodyPartRecord[]>([]);
  const [savedMsg, setSavedMsg] = useState("");

  const sorted = useMemo(
    () => [...customers].sort((a, b) => a.name.localeCompare(b.name, "ko")),
    [customers],
  );

  const selectCustomer = (id: string) => {
    setCustomerId(id);
    setSavedMsg("");
    const c = customers.find((x) => x.id === id);
    setParts(c?.focusBodyParts ?? []);
  };

  const save = () => {
    if (!customerId) return;
    updateCustomer(customerId, { focusBodyParts: parts });
    const c = customers.find((x) => x.id === customerId);
    setSavedMsg(`${c?.name} 고객의 집중 케어 부위를 저장했습니다.`);
  };

  return (
    <Card>
      <SectionTitle>고객 맞춤 케어 · 부위 선택</SectionTitle>
      <p className="mb-3 text-sm text-ink-sub">
        고객이 집중 케어를 원하는 부위를 터치하여 기록하세요.
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
            {c.name}
          </option>
        ))}
      </select>

      <BodyMap
        value={parts}
        onChange={(next) => {
          setParts(next);
          setSavedMsg("");
        }}
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
      {savedMsg && (
        <p className="mt-2 text-center text-sm font-semibold text-aqua-700">
          {savedMsg}
        </p>
      )}
    </Card>
  );
}
