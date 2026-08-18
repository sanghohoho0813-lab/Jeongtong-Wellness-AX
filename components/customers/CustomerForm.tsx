"use client";

/** 신규 고객 등록 폼 (모달 내부) */

import { useState } from "react";
import { useStore } from "@/lib/data/store";
import { BodyPartRecord } from "@/lib/types";
import { daysFromToday } from "@/lib/utils/date";
import { Button, FieldLabel, inputCls } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import BodyMap from "@/components/body-map/BodyMap";

export default function CustomerForm({
  onSaved,
  onCancel,
}: {
  onSaved: (customerId: string) => void;
  onCancel: () => void;
}) {
  const { staff, settings, addCustomer } = useStore();
  const toast = useToast();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<"female" | "male" | "">("");
  const [birthYear, setBirthYear] = useState("");
  const [staffId, setStaffId] = useState("");
  const [memo, setMemo] = useState("");
  const [parts, setParts] = useState<BodyPartRecord[]>([]);
  const [nextManage, setNextManage] = useState(
    daysFromToday(settings.careRules.defaultCycleDays),
  );
  const [error, setError] = useState("");

  const submit = () => {
    if (!name.trim()) return setError("고객명을 입력하세요.");
    if (!phone.trim()) return setError("연락처를 입력하세요.");
    const c = addCustomer({
      name,
      phone,
      gender: gender || undefined,
      birthYear: birthYear ? Number(birthYear) : undefined,
      memo: memo || undefined,
      focusBodyParts: parts,
      assignedStaffId: staffId || undefined,
      nextManageDate: nextManage || undefined,
    });
    toast(`${c.name} 고객을 등록했습니다`);
    onSaved(c.id);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel>고객명 *</FieldLabel>
          <input
            className={inputCls}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 김영희"
          />
        </div>
        <div>
          <FieldLabel>연락처 *</FieldLabel>
          <input
            className={inputCls}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="010-0000-0000"
            inputMode="tel"
          />
        </div>
        <div>
          <FieldLabel>성별</FieldLabel>
          <select
            className={inputCls}
            value={gender}
            onChange={(e) => setGender(e.target.value as typeof gender)}
          >
            <option value="">선택 안 함</option>
            <option value="female">여성</option>
            <option value="male">남성</option>
          </select>
        </div>
        <div>
          <FieldLabel>출생연도</FieldLabel>
          <input
            className={inputCls}
            value={birthYear}
            onChange={(e) => setBirthYear(e.target.value.replace(/\D/g, ""))}
            placeholder="예: 1965"
            inputMode="numeric"
            maxLength={4}
          />
        </div>
        <div>
          <FieldLabel>담당 직원</FieldLabel>
          <select
            className={inputCls}
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
          >
            <option value="">미지정</option>
            {staff
              .filter((s) => s.active)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
        </div>
        <div>
          <FieldLabel>다음 관리 예정일</FieldLabel>
          <input
            type="date"
            className={inputCls}
            value={nextManage}
            onChange={(e) => setNextManage(e.target.value)}
          />
        </div>
      </div>

      <div>
        <FieldLabel>집중 케어 희망 부위</FieldLabel>
        <BodyMap value={parts} onChange={setParts} compactChips />
      </div>

      <div>
        <FieldLabel>상담 메모</FieldLabel>
        <textarea
          className={`${inputCls} min-h-20`}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="고객 특이사항, 상담 내용 등"
        />
      </div>

      {error && <p className="text-sm font-semibold text-danger">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" onClick={onCancel}>
          취소
        </Button>
        <Button onClick={submit}>고객 등록</Button>
      </div>
    </div>
  );
}
