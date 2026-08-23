"use client";

/**
 * 데이터 가져오기 — 고객 명부(CSV) / 전체 백업(JSON)
 * ==================================================
 * 두 기능 모두 "파일 선택 → 무엇이 들어오는지 확인 → 반영" 3단계를 지킨다.
 * 파일을 고르는 것만으로는 기존 기록이 절대 바뀌지 않는다.
 */

import { useRef, useState } from "react";
import { useStore } from "@/lib/data/store";
import {
  BackupCheck,
  CustomerImportPreview,
  checkBackup,
  customerImportTemplate,
  parseCustomerCsv,
  readFileText,
} from "@/lib/utils/import";
import { downloadFile } from "@/lib/utils/export";
import { formatDateKr } from "@/lib/utils/date";
import { formatPhone } from "@/lib/utils/format";
import { Button, Modal, SegmentedControl } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { AlertIcon, DownloadIcon, UploadIcon } from "@/components/ui/icons";

/** 미리보기 안의 작은 숫자 타일 */
function CountTile({
  label,
  value,
  tone = "gray",
}: {
  label: string;
  value: number | string;
  tone?: "aqua" | "gray" | "warn";
}) {
  const cls =
    tone === "aqua"
      ? "bg-aqua-50 text-aqua-800 ring-aqua-100"
      : tone === "warn"
        ? "bg-amber-50 text-amber-700 ring-amber-200/60 dark:bg-amber-400/10 dark:text-amber-300"
        : "bg-card-soft text-ink-soft ring-black/[0.04]";
  return (
    <div className={`rounded-card px-3 py-2.5 text-center ring-1 ${cls}`}>
      <p className="nowrap-num text-lg font-extrabold tabular">{value}</p>
      <p className="mt-0.5 text-xs font-bold opacity-80">{label}</p>
    </div>
  );
}

export default function DataImport() {
  const { customers, importCustomers, restoreBackup } = useStore();
  const toast = useToast();

  const csvInput = useRef<HTMLInputElement>(null);
  const jsonInput = useRef<HTMLInputElement>(null);

  const [csvPreview, setCsvPreview] = useState<CustomerImportPreview | null>(null);
  const [csvFileName, setCsvFileName] = useState("");
  const [dupMode, setDupMode] = useState<"skip" | "update">("skip");

  const [backup, setBackup] = useState<BackupCheck | null>(null);
  const [backupFileName, setBackupFileName] = useState("");

  // ---------- 고객 명부 CSV ----------

  const pickCsv = async (file: File) => {
    try {
      const text = await readFileText(file);
      setCsvFileName(file.name);
      setCsvPreview(parseCustomerCsv(text, customers));
    } catch {
      toast("파일을 읽지 못했습니다", "info");
    }
  };

  const applyCsv = () => {
    if (!csvPreview) return;
    const rows =
      dupMode === "update"
        ? [...csvPreview.fresh, ...csvPreview.duplicated]
        : csvPreview.fresh;
    const { added, updated } = importCustomers(rows, dupMode);
    setCsvPreview(null);
    const parts = [];
    if (added) parts.push(`${added}명 등록`);
    if (updated) parts.push(`${updated}명 정보 보완`);
    toast(parts.length ? parts.join(" · ") : "반영할 내용이 없습니다");
  };

  // ---------- 전체 백업 JSON ----------

  const pickBackup = async (file: File) => {
    try {
      const text = await readFileText(file);
      setBackupFileName(file.name);
      setBackup(checkBackup(text));
    } catch {
      toast("파일을 읽지 못했습니다", "info");
    }
  };

  const applyBackup = () => {
    if (!backup?.ok || !backup.payload) return;
    restoreBackup(backup.payload);
    setBackup(null);
    toast("백업 시점의 기록으로 되돌렸습니다");
  };

  const csvTotal = csvPreview
    ? csvPreview.fresh.length +
      (dupMode === "update" ? csvPreview.duplicated.length : 0)
    : 0;

  return (
    <div className="mt-4 border-t border-stone-line pt-4">
      <p className="mb-3 text-sm leading-relaxed text-ink-sub">
        쓰던 고객 명부를 파일로 한 번에 올리거나, 받아 둔 백업으로 되돌립니다.
        어느 쪽이든 <b>내용을 먼저 보여드리고</b>, 확인하신 뒤에 반영합니다.
      </p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          onClick={() => csvInput.current?.click()}
          className="row-accent flex items-center gap-3 rounded-card bg-card-soft px-3.5 py-3 text-left ring-1 ring-black/[0.04] transition-colors hover:bg-aqua-50"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-aqua-50 text-aqua-700 ring-1 ring-aqua-100">
            <UploadIcon className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold leading-snug text-ink">
              고객 명부 가져오기
            </span>
            <span className="block text-xs leading-snug text-ink-sub">
              엑셀에서 저장한 CSV
            </span>
          </span>
        </button>

        <button
          onClick={() => jsonInput.current?.click()}
          className="row-accent flex items-center gap-3 rounded-card bg-card-soft px-3.5 py-3 text-left ring-1 ring-black/[0.04] transition-colors hover:bg-aqua-50"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold-soft text-gold-deep ring-1 ring-gold/20">
            <UploadIcon className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold leading-snug text-ink">
              백업으로 되돌리기
            </span>
            <span className="block text-xs leading-snug text-ink-sub">
              전체 백업 JSON
            </span>
          </span>
        </button>
      </div>

      <button
        onClick={() =>
          downloadFile("고객명부_양식.csv", customerImportTemplate())
        }
        className="touch-target mt-1 inline-flex items-center gap-1.5 text-sm font-bold text-aqua-700 underline-offset-4 hover:underline"
      >
        <DownloadIcon className="h-4 w-4" />
        가져오기 양식 내려받기
      </button>

      {/* 파일 선택 input — 화면에는 보이지 않는다 */}
      <input
        ref={csvInput}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        aria-label="고객 명부 CSV 파일"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void pickCsv(f);
          e.target.value = "";
        }}
      />
      <input
        ref={jsonInput}
        type="file"
        accept=".json,application/json"
        className="hidden"
        aria-label="전체 백업 JSON 파일"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void pickBackup(f);
          e.target.value = "";
        }}
      />

      {/* ---------- 고객 명부 미리보기 ---------- */}
      <Modal
        open={!!csvPreview}
        onClose={() => setCsvPreview(null)}
        title="고객 명부 가져오기 확인"
        wide
      >
        {csvPreview && (
          <div className="space-y-4">
            <p className="truncate text-sm text-ink-sub">
              파일: <b className="text-ink-soft">{csvFileName}</b>
            </p>

            {csvPreview.fresh.length === 0 &&
            csvPreview.duplicated.length === 0 ? (
              <div className="rounded-card border-l-4 border-warn bg-amber-50 px-3.5 py-3 text-sm leading-relaxed text-ink-soft dark:bg-amber-400/10">
                <p className="font-bold text-ink">가져올 수 있는 행이 없습니다.</p>
                <p className="mt-1">
                  첫 줄에 <b>고객명</b>, <b>연락처</b> 같은 머리글이 있는지
                  확인해 주세요. 위의 <b>가져오기 양식</b>을 받아 그대로 채우시면
                  가장 확실합니다.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <CountTile
                  label="새로 등록"
                  value={csvPreview.fresh.length}
                  tone="aqua"
                />
                <CountTile
                  label="이미 있는 고객"
                  value={csvPreview.duplicated.length}
                />
                <CountTile
                  label="읽지 못한 행"
                  value={csvPreview.errors.length}
                  tone={csvPreview.errors.length ? "warn" : "gray"}
                />
              </div>
            )}

            {/* 인식한 열 */}
            {csvPreview.mapped.length > 0 && (
              <div>
                <p className="mb-1.5 text-sm font-bold text-ink">인식한 항목</p>
                <div className="flex flex-wrap gap-1.5">
                  {csvPreview.mapped.map((m) => (
                    <span
                      key={m.header}
                      className="rounded-full bg-aqua-50 px-2.5 py-1 text-xs font-bold text-aqua-800 ring-1 ring-aqua-100"
                    >
                      {m.header}
                    </span>
                  ))}
                  {csvPreview.ignored.map((h) => (
                    <span
                      key={h}
                      className="rounded-full bg-card-soft px-2.5 py-1 text-xs font-bold text-ink-faint ring-1 ring-black/[0.04]"
                    >
                      {h} (사용 안 함)
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 새로 등록될 고객 미리보기 */}
            {csvPreview.fresh.length > 0 && (
              <div>
                <p className="mb-1.5 text-sm font-bold text-ink">
                  새로 등록될 고객{" "}
                  <span className="font-normal text-ink-sub">
                    (앞 5명 미리보기)
                  </span>
                </p>
                <ul className="divide-y divide-stone-line overflow-hidden rounded-card ring-1 ring-black/[0.04]">
                  {csvPreview.fresh.slice(0, 5).map((r) => (
                    <li
                      key={r.line}
                      className="flex items-center gap-3 bg-card-soft px-3 py-2 text-sm"
                    >
                      <span className="min-w-0 flex-1 truncate font-bold text-ink">
                        {r.name}
                      </span>
                      <span className="nowrap-num shrink-0 text-xs text-ink-sub">
                        {r.phone ? formatPhone(r.phone) : "연락처 없음"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 중복 처리 방식 */}
            {csvPreview.duplicated.length > 0 && (
              <div>
                <p className="mb-1.5 text-sm font-bold text-ink">
                  이미 등록된 연락처 {csvPreview.duplicated.length}명은
                  어떻게 할까요?
                </p>
                <SegmentedControl<"skip" | "update">
                  label="중복 처리"
                  value={dupMode}
                  options={[
                    { key: "skip", label: "건너뛰기" },
                    { key: "update", label: "빈 항목만 채우기" },
                  ]}
                  onChange={setDupMode}
                />
                <p className="mt-1.5 text-xs leading-relaxed text-ink-sub">
                  {dupMode === "skip"
                    ? "기존 고객 정보를 전혀 건드리지 않습니다."
                    : "기존에 비어 있던 항목만 파일 값으로 채웁니다. 이미 입력된 값은 그대로 둡니다."}
                </p>
              </div>
            )}

            {/* 오류 행 */}
            {csvPreview.errors.length > 0 && (
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-ink">
                  <AlertIcon className="h-4 w-4 text-warn-text" />
                  읽지 못한 행 {csvPreview.errors.length}건
                </p>
                <ul className="max-h-40 space-y-1 overflow-y-auto rounded-card bg-card-soft p-2.5 ring-1 ring-black/[0.04]">
                  {csvPreview.errors.slice(0, 20).map((e) => (
                    <li key={e.line} className="text-xs leading-relaxed text-ink-sub">
                      <b className="nowrap-num text-ink-soft">{e.line}번째 줄</b>{" "}
                      — {e.reason}
                    </li>
                  ))}
                  {csvPreview.errors.length > 20 && (
                    <li className="text-xs text-ink-faint">
                      … 외 {csvPreview.errors.length - 20}건
                    </li>
                  )}
                </ul>
                <p className="mt-1.5 text-xs text-ink-sub">
                  이 행들은 가져오지 않습니다. 파일에서 고친 뒤 다시 올리면 됩니다.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 border-t border-stone-line pt-3">
              <Button variant="ghost" onClick={() => setCsvPreview(null)}>
                취소
              </Button>
              <Button onClick={applyCsv} disabled={csvTotal === 0}>
                {csvTotal > 0 ? `${csvTotal}명 가져오기` : "가져올 내용 없음"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ---------- 백업 복원 확인 ---------- */}
      <Modal
        open={!!backup}
        onClose={() => setBackup(null)}
        title="백업으로 되돌리기"
      >
        {backup && (
          <div className="space-y-4">
            <p className="truncate text-sm text-ink-sub">
              파일: <b className="text-ink-soft">{backupFileName}</b>
            </p>

            {!backup.ok ? (
              <div className="rounded-card border-l-4 border-danger bg-red-50 px-3.5 py-3 text-sm leading-relaxed text-ink-soft dark:bg-red-500/10">
                <p className="font-bold text-ink">이 파일은 사용할 수 없습니다.</p>
                <p className="mt-1">{backup.reason}</p>
              </div>
            ) : (
              <>
                {backup.summary?.exportedAt && (
                  <p className="text-sm text-ink-soft">
                    백업 시점:{" "}
                    <b>{formatDateKr(backup.summary.exportedAt)}</b>
                  </p>
                )}
                <div className="grid grid-cols-3 gap-2">
                  <CountTile
                    label="고객"
                    value={backup.summary!.customers}
                    tone="aqua"
                  />
                  <CountTile label="방문 기록" value={backup.summary!.visits} />
                  <CountTile
                    label="이용권"
                    value={backup.summary!.memberships}
                  />
                </div>
                <div className="rounded-card border-l-4 border-warn bg-amber-50 px-3.5 py-3 text-sm leading-relaxed text-ink-soft dark:bg-amber-400/10">
                  <p className="font-bold text-ink">
                    지금 이 기기의 기록은 위 내용으로 교체됩니다.
                  </p>
                  <p className="mt-1">
                    현재 고객 {customers.length}명의 기록이 사라집니다. 되돌릴 수
                    없으니, 필요하시면 <b>먼저 지금 상태를 백업</b>해 두세요.
                  </p>
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 border-t border-stone-line pt-3">
              <Button variant="ghost" onClick={() => setBackup(null)}>
                취소
              </Button>
              {backup.ok && (
                <Button variant="danger" onClick={applyBackup}>
                  되돌리기
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
