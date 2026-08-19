/**
 * 브라우저 저장 공간 점검
 * ======================
 * 지금 모든 기록은 이 기기의 localStorage 한 곳에 들어간다.
 * localStorage 는 대략 5MB 에서 막히는데, 막히는 순간 저장이 통째로 실패한다.
 * 그래서 "다 찼습니다"가 아니라 "차 가고 있습니다"를 미리 알려야 한다.
 *
 * (Supabase 연동 후에는 이 제한이 사라진다 — docs/supabase-migration.md)
 */

/** 브라우저가 흔히 주는 한도 (5MB). 실제 값은 브라우저마다 조금씩 다르다. */
export const STORAGE_LIMIT_BYTES = 5 * 1024 * 1024;

/** 이 비율을 넘으면 미리 알린다 */
const WARN_RATIO = 0.7;

export interface StorageUsage {
  /** 저장된 데이터 크기 (바이트) */
  bytes: number;
  /** 한도 대비 사용 비율 (0~1, 1을 넘을 수도 있다) */
  ratio: number;
  /** 곧 한도에 닿을 것 같은 상태 */
  nearLimit: boolean;
}

/**
 * 저장된 데이터가 차지하는 크기를 잰다.
 *
 * localStorage 는 문자열을 UTF-16 으로 담으므로 한 글자가 2바이트다.
 * 한글이 많은 이 데이터에서는 글자 수만 세면 절반으로 과소평가된다.
 */
export function measureStorage(key: string): StorageUsage {
  let bytes = 0;
  try {
    const raw = window.localStorage.getItem(key);
    bytes = raw ? raw.length * 2 : 0;
  } catch {
    bytes = 0;
  }
  const ratio = bytes / STORAGE_LIMIT_BYTES;
  return { bytes, ratio, nearLimit: ratio >= WARN_RATIO };
}

/** "1.6 MB" 처럼 읽기 쉬운 크기로 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
