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
import { DownloadIcon, XIcon } from "@/components/ui/icons";
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

  /*
    폰에서는 한 줄짜리다.

    처음엔 PC 와 같은 모양으로 그렸다 — 제목 한 줄, 설명 한 줄, 단추 둘.
    폰에서 그게 약 180px 였고, 이 띠는 **직원 화면 열두 장 전부**의 맨
    위에 붙는다. 그래서 대시보드를 열면 「오늘 챙길 고객」 이 첫 화면
    밖으로 밀려나 있었다. 사진을 찍어 보고 알았다.

    안내 하나가 그날 할 일을 가린다면 그건 안내가 아니다. 폰에서는
    설명 문장을 접고, 「오늘은 나중에」 는 ✕ 한 개로 줄인다. 넓은
    화면에서는 자리가 있으니 그대로 다 보여 준다.

    단추는 **하나짜리 요소**로 두고 안쪽 글자만 바꾼다. 폰용·PC용을
    따로 만들면 같은 이름의 단추가 화면에 둘이 되어, 눌러야 할 것이
    어느 쪽인지 사람도 검사기도 알 수 없다.
  */
  return (
    <div
      data-backup-reminder
      className="no-print sticky top-0 z-40 border-b border-gold/30 bg-gold-soft px-4 py-2 sm:px-6 sm:py-2.5 lg:ml-64 lg:px-8"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-2 sm:flex-wrap sm:gap-x-3 sm:gap-y-2">
        <span className="min-w-0 flex-1 sm:flex-none">
          <span className="block text-[0.875rem] font-extrabold leading-snug text-gold-deep sm:text-[0.9375rem]">
            {when}
          </span>
          <span className="hidden text-[0.9375rem] text-gold-deep sm:inline">
            {stage.stage === "DEMO"
              ? "지금은 시연 자료지만, 실제 운영에서는 기록이 이 기기에만 저장됩니다."
              : "기록이 이 기기에만 저장됩니다 — 파일로 받아 두시면 안전합니다."}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1 sm:ml-auto sm:gap-2">
          <button
            type="button"
            aria-label="지금 받기"
            onClick={() => {
              exportBackup();
              toast("전체 백업 파일을 내려받았습니다");
            }}
            /*
              어두운 화면에서는 글자를 뒤집는다.

              `gold-deep` 은 테마 변수라 어두운 화면에서 **밝은 금색**이
              된다. 그 위의 흰 글자는 1.83:1 — 단추에 뭐라고 적혔는지
              읽을 수가 없었다. 처음부터 그랬는데, 글자가 단추의 직계
              자식이라 대비 검사기가 건너뛰고 있었다. 이번에 폰용 글자를
              <span> 으로 감싸면서 비로소 걸렸다.
            */
            className="touch-target inline-flex items-center gap-1.5 rounded-btn bg-gold-deep px-3 text-[0.9375rem] font-extrabold text-white transition-opacity hover:opacity-90 dark:text-deep-950 sm:px-4"
          >
            <DownloadIcon className="h-4 w-4 shrink-0" />
            <span className="sm:hidden">받기</span>
            <span className="hidden sm:inline">지금 받기</span>
          </button>
          <button
            type="button"
            aria-label="오늘은 나중에"
            onClick={snooze}
            className="touch-target inline-flex items-center justify-center rounded-btn px-2 text-[0.9375rem] font-bold text-gold-deep transition-colors hover:bg-gold/15 sm:px-3"
          >
            <XIcon className="h-5 w-5 sm:hidden" />
            <span className="hidden sm:inline">오늘은 나중에</span>
          </button>
        </span>
      </div>
    </div>
  );
}
