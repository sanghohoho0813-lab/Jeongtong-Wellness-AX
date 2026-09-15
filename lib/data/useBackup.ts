"use client";

/**
 * 전체 백업 — 한 곳에서만 만든다
 * ==============================
 *
 * 같은 코드가 설정 화면과 명령 팔레트에 두 벌 있었다. 세 번째 자리(화면
 * 위 띠)를 만들면서 셋이 되는 대신, 하나로 모은다. 백업은 한 번이라도
 * 어긋나면 "받은 줄 알았는데 안 받아진" 상태가 되는 기능이라 특히 그렇다.
 *
 * 왜 이게 이 제품에서 중요한가
 * ----------------------------
 * 지금 매장의 모든 기록은 **이 기기 브라우저 안에만** 있다 (D-02).
 * 서버를 연결하면 이중 저장이 되지만, 연결 전까지는 브라우저 저장소를
 * 비우거나 기기가 망가지면 그날로 끝이다. 그래서 "받아 두셨나요" 를
 * 묻는 자리가 설정 화면 안쪽이면 안 된다 — 설정을 여는 날은 드물다.
 */

import { useCallback, useMemo } from "react";
import { useStore } from "@/lib/data/store";
import { buildBackupFile, downloadFile } from "@/lib/utils/export";
import { daysAgo } from "@/lib/utils/date";

/** 이 날이 지나면 밀린 것으로 본다 — 주 1회 */
export const BACKUP_STALE_DAYS = 7;

export interface BackupState {
  /** 한 번도 안 받았거나 7일이 지났는가 */
  stale: boolean;
  /** 한 번도 안 받았는가 (문구가 달라진다) */
  never: boolean;
  /** 마지막 백업 이후 며칠 (한 번도 안 받았으면 undefined) */
  daysSince?: number;
  /** 받을 것이 있는가 — 빈 상태에서는 권하지 않는다 */
  hasData: boolean;
  exportBackup: () => void;
}

export function useBackup(): BackupState {
  const {
    customers,
    visits,
    memberships,
    staff,
    branches,
    settings,
    updateSettings,
  } = useStore();

  const exportBackup = useCallback(() => {
    const file = buildBackupFile({
      customers,
      visits,
      memberships,
      staff,
      branches,
      settings,
    });
    downloadFile(file.name, file.content, file.mime);
    updateSettings({ lastBackupAt: new Date().toISOString() });
  }, [customers, visits, memberships, staff, branches, settings, updateSettings]);

  return useMemo(() => {
    const never = !settings.lastBackupAt;
    const daysSince = settings.lastBackupAt
      ? daysAgo(settings.lastBackupAt)
      : undefined;
    return {
      never,
      daysSince,
      stale: never || (daysSince ?? 0) >= BACKUP_STALE_DAYS,
      // 아직 아무것도 없는 매장에 백업을 권하면 첫날부터 잔소리가 된다
      hasData: customers.length > 0 || visits.length > 0,
      exportBackup,
    };
  }, [settings.lastBackupAt, customers.length, visits.length, exportBackup]);
}
