"use client";

/** 고객 등록 · 정보 수정 폼 (모달 내부) */

import { useState } from "react";
import { useStore } from "@/lib/data/store";
import { BodyPartRecord, Customer } from "@/lib/types";
import { daysFromToday } from "@/lib/utils/date";
import {
  formatPhoneInput,
  isValidPhone,
  phoneDigits,
} from "@/lib/utils/format";
import { Button, FieldLabel, inputCls } from "@/components/ui";
import { DateTimeField } from "@/components/ui/DateTimeField";
import { useToast } from "@/components/ui/toast";
import BodyMap from "@/components/body-map/BodyMap";

export default function CustomerForm({
  customer,
  initialName,
  onSaved,
  onCancel,
}: {
  /** 있으면 수정 모드 */
  customer?: Customer;
  /** 등록 모드에서 이름 칸을 미리 채워 둔다 (기록 화면에서 찾다가 넘어온 경우) */
  initialName?: string;
  onSaved: (customerId: string) => void;
  onCancel: () => void;
}) {
  const { staff, settings, customers, addCustomer, updateCustomer } = useStore();
  const toast = useToast();
  const editing = !!customer;
  const [name, setName] = useState(customer?.name ?? initialName ?? "");
  const [phone, setPhone] = useState(
    customer ? formatPhoneInput(customer.phone) : "",
  );
  const [gender, setGender] = useState<"female" | "male" | "">(
    customer?.gender === "female" || customer?.gender === "male"
      ? customer.gender
      : "",
  );
  const [birthYear, setBirthYear] = useState(
    customer?.birthYear ? String(customer.birthYear) : "",
  );
  const [staffId, setStaffId] = useState(customer?.assignedStaffId ?? "");
  const [memo, setMemo] = useState(customer?.memo ?? "");
  const [parts, setParts] = useState<BodyPartRecord[]>(
    customer?.focusBodyParts ?? [],
  );
  const [nextManage, setNextManage] = useState(
    customer
      ? (customer.nextManageDate ?? "")
      : daysFromToday(settings.careRules.defaultCycleDays),
  );
  const [nextManageTime, setNextManageTime] = useState<string | undefined>(
    customer?.nextManageTime,
  );
  const [error, setError] = useState("");

  /** 같은 연락처가 이미 등록되어 있으면 미리 알려 준다 (저장은 막지 않음) */
  const duplicate = (() => {
    const d = phoneDigits(phone);
    if (d.length < 10) return undefined;
    return customers.find(
      (c) => c.id !== customer?.id && phoneDigits(c.phone) === d,
    );
  })();

  const submit = () => {
    if (!name.trim()) return setError("고객명을 입력하세요.");
    if (!phone.trim()) return setError("연락처를 입력하세요.");
    if (!isValidPhone(phone))
      return setError("연락처를 확인해 주세요. 예: 010-1234-5678");

    if (customer) {
      updateCustomer(customer.id, {
        name: name.trim(),
        phone: phone.trim(),
        gender: gender || undefined,
        birthYear: birthYear ? Number(birthYear) : undefined,
        memo: memo || undefined,
        focusBodyParts: parts,
        assignedStaffId: staffId || undefined,
        nextManageDate: nextManage || undefined,
        nextManageTime: nextManage ? nextManageTime : undefined,
      });
      toast(`${name.trim()} 고객 정보를 수정했습니다`);
      onSaved(customer.id);
      return;
    }

    const c = addCustomer({
      name,
      phone,
      gender: gender || undefined,
      birthYear: birthYear ? Number(birthYear) : undefined,
      memo: memo || undefined,
      focusBodyParts: parts,
      assignedStaffId: staffId || undefined,
      nextManageDate: nextManage || undefined,
      nextManageTime: nextManage ? nextManageTime : undefined,
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
            onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
            placeholder="010-0000-0000"
            inputMode="tel"
            maxLength={13}
          />
          {duplicate && (
            <p className="mt-1.5 text-[0.8125rem] font-bold text-warn">
              같은 연락처의 <b>{duplicate.name}</b> 고객이 이미 있습니다. 중복
              등록이 아닌지 확인해 주세요.
            </p>
          )}
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
          <DateTimeField
            date={nextManage}
            time={nextManageTime}
            onChange={(d, t) => {
              setNextManage(d);
              setNextManageTime(t);
            }}
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
        <Button onClick={submit}>{editing ? "수정 저장" : "고객 등록"}</Button>
      </div>
    </div>
  );
}
