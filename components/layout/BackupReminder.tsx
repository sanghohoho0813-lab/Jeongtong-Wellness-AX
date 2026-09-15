"use client";

/**
 * 백업이 밀렸습니다 — 보이는 자리에서 한 번
 * =========================================
 *
 * 리마인더는 원래 설정 화면 안에 있었다. 그런데 설정을 여는 날은 한 달에
 * 몇 번이다. "백업하세요" 가 백업하러 들어간 사람에게만 보이면 그건
 * 안내가 아니다.
 *
 * 그렇다고 매일 빨간 띠를 띄우면 사흘 만에 안 보이게 된다. 그래서
 *   · 받을 것이 있을 때만 (빈 매장에 잔소리하지 않는다)
 *   · 7일이 지났을 때만
 *   · 이 기기에만 저장되는 동안만 (서버에 연결돼 있으면 뜨지 않는다)
 *   · 오늘 닫으면 오늘은 다시 안 뜬다
 * 넷을 다 만족할 때만 뜬다.
 *
 * 단추는 하나 — 그 자리에서 바로 내려받는다. 설정 화면으로 보내면
 * 거기서 또 찾아야 하고, 찾다가 안 한다.
 */

import { useEffect, useState } from "react";
import { useStore } from "@/lib/data/store";
import { useBackup } from "@/lib/data/useBackup";
import { useDeliveryStage } from "@/lib/stage";
import { useToast } from "@/components/ui/toast";
import { DownloadIcon } from "@/components/ui/icons";
import { todayISO } from "@/lib/utils/date";

/** 오늘 닫았다는 표시 — 기기마다, 하루짜리 */
const SNOOZE_KEY = "jt-backup-snooze";

export default function BackupReminder() {
  const { ready, isManager } = useStore();
  const { stale, never, daysSince, hasData, exportBackup } = useBackup();
  const stage = useDeliveryStage();
  const toast = useToast();
  const [snoozed, setSnoozed] = useState(true); // 판단 전에는 띄우지 않는다

  useEffect(() => {
    try {
      setSnoozed(localStorage.getItem(SNOOZE_KEY) === todayISO());
    } catch {
      setSnoozed(false);
    }
  }, []);

  const snooze = () => {
    try {
      localStorage.setItem(SNOOZE_KEY, todayISO());
    } catch {
      /* 못 적어도 이번 화면은 닫는다 */
    }
    setSnoozed(true);
  };

  /*
    서버에 연결돼 있으면 기록이 두 곳에 있다. 그때까지 띠를 띄우면
    "이미 안전한데 왜 자꾸" 가 되고, 정작 위험한 PILOT 에서 무뎌진다.
  */
  if (!ready || !isManager || snoozed || !stale || !hasData) return null;
  if (stage.stage === "PRODUCTION") return null;

  const when = never
    ? "아직 한 번도 백업 파일을 받지 않으셨습니다"
    : `마지막 백업 후 ${daysSince}일 지났습니다`;

  return (
    <div
      data-backup-reminder
      className="no-print sticky top-0 z-40 border-b border-gold/30 bg-gold-soft px-4 py-2.5 sm:px-6 lg:ml-64 lg:px-8"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-[0.9375rem] font-extrabold text-gold-deep">
          {when}
        </span>
        <span className="text-[0.9375rem] text-gold-deep">
          {stage.stage === "DEMO"
            ? "지금은 시연 자료지만, 실제 운영에서는 기록이 이 기기에만 저장됩니다."
            : "기록이 이 기기에만 저장됩니다 — 파일로 받아 두시면 안전합니다."}
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => {
              exportBackup();
              toast("전체 백업 파일을 내려받았습니다");
            }}
            className="touch-target inline-flex items-center gap-1.5 rounded-btn bg-gold-deep px-4 text-[0.9375rem] font-extrabold text-white transition-opacity hover:opacity-90"
          >
            <DownloadIcon className="h-4 w-4" />
            지금 받기
          </button>
          <button
            type="button"
            onClick={snooze}
            className="touch-target rounded-btn px-3 text-[0.9375rem] font-bold text-gold-deep transition-colors hover:bg-gold/15"
          >
            오늘은 나중에
          </button>
        </span>
      </div>
    </div>
  );
}
