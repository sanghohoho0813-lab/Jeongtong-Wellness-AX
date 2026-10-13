/**
 * 안내 영상 두 편 — 사용법 · 기술 소개
 * ====================================
 *
 * 두 편이 각자 자기 화면을 갖는다 (/videos/guide · /videos/tech).
 * 왼쪽 목차의 '사용법' 을 누르면 사용법만, '기술 소개' 를 누르면 기술
 * 소개만 보인다 — 한 화면에 둘을 나란히 두면 어느 것을 틀어야 하는지부터
 * 고르게 된다.
 *
 * 한 편마다 파일이 둘이다.
 *   세로 9:16  폰 · 카카오톡 · 릴스.         1080 × 1920
 *   가로 16:9  PC · 회의실 화면 · 노트북.    1920 × 1080
 * 둘은 같은 음성 · 같은 자막 · 같은 시각이고 장면 배치만 다르다. 그래서
 * 보다가 비율을 바꿔도 그 자리에서 이어서 나온다.
 *
 * 영상을 다시 만들면 같은 이름으로 덮어쓰고 length · mb · chapters 만
 * 고친다. 화면에 적힌 길이 · 용량이 실제 파일과 맞는지는 qa/videos.mjs 가
 * 파일을 직접 읽어 비교한다 (숫자를 검사에 박지 않는다).
 *
 * 영상 흐름(chapters)의 시각은 장면이 바뀌는 순간 — 그 장면의 첫 말이
 * 시작하기 조금 전이다. 누르면 그 말부터 들린다.
 */

export type VideoId = "guide" | "tech";
export type Ratio = "9x16" | "16x9";

export interface VideoFile {
  src: string;
  poster: string;
  /** 내려받기 단추에 적는 용량 (MB, 10⁶ 바이트 반올림) */
  mb: number;
}

export interface VideoInfo {
  id: VideoId;
  href: string;
  /** 제목 위 작은 줄 — 누구를 위한 영상인가 */
  eyebrow: string;
  title: string;
  /** 제목 아래 한 줄 — 무엇에 대한 영상인가 */
  summary: string;
  length: string;
  files: Record<Ratio, VideoFile>;
  chapters: { at: number; label: string }[];
  /** 「보시기 전에」 · 「보여드리기 전에」 */
  notesTitle: string;
  notes: string[];
  tone: "aqua" | "gold";
}

export const RATIO_LABEL: Record<Ratio, { short: string; long: string }> = {
  "9x16": { short: "세로 9:16", long: "세로(9:16)" },
  "16x9": { short: "가로 16:9", long: "가로(16:9)" },
};

export const VIDEOS: Record<VideoId, VideoInfo> = {
  guide: {
    id: "guide",
    href: "/videos/guide",
    eyebrow: "처음 쓰시는 분 · 대표님 내외",
    title: "사용법 영상",
    summary: "고객관리 프로그램 사용 안내",
    length: "3분 40초",
    files: {
      "9x16": { src: "/videos/guide.mp4", poster: "/videos/guide-poster.jpg", mb: 29 },
      "16x9": { src: "/videos/guide-wide.mp4", poster: "/videos/guide-wide-poster.jpg", mb: 0 },
    },
    chapters: [
      { at: 0, label: "인사 · 이 영상은" },
      { at: 7.7, label: "기억하실 것은 세 가지" },
      { at: 18.9, label: "지금까지 — 수첩 · 엑셀 · 기억" },
      { at: 34.7, label: "대신 챙겨 주는 프로그램" },
      { at: 60.1, label: "아래 단추 다섯 개" },
      { at: 70.8, label: "① 아침 — 오늘 챙길 고객" },
      { at: 106.4, label: "② 손님이 오시면 — 가운데 '기록'" },
      { at: 129, label: "③ 글씨가 작으면 — 더보기 → '크게'" },
      { at: 144.9, label: "무엇이 좋아지나" },
      { at: 169.6, label: "고객용 MY WELLNESS · 앞으로" },
      { at: 191.8, label: "정리 — 하루에 세 가지" },
    ],
    notesTitle: "보시기 전에",
    notes: [
      "소리를 켜 주세요 — 자막도 영상 안에 들어 있어 소리 없이도 읽힙니다.",
      "폰으로 보실 때는 세로, PC · TV 로 보실 때는 가로가 화면에 꽉 찹니다.",
      "다시 보실 때는 1.25배 · 1.5배로 빠르게 보실 수 있습니다.",
      "영상 속 고객 이름 · 숫자는 예시 데이터입니다.",
    ],
    tone: "aqua",
  },
  tech: {
    id: "tech",
    href: "/videos/tech",
    eyebrow: "심사 · 투자 · 외부 발표용",
    title: "기술 소개 영상",
    summary: "특허 출원 두 건 · 온열 구조체와 운영 AX",
    length: "4분 27초",
    files: {
      "9x16": { src: "/videos/tech.mp4", poster: "/videos/tech-poster.jpg", mb: 26 },
      "16x9": { src: "/videos/tech-wide.mp4", poster: "/videos/tech-wide-poster.jpg", mb: 0 },
    },
    chapters: [
      { at: 0, label: "소개 — 두 가지 기술 · 특허 두 건" },
      { at: 17.7, label: "대표의 15년 현장 경험" },
      { at: 34.2, label: "제품에서 발견한 문제" },
      { at: 48.9, label: "특허 ① 온열 구조체" },
      { at: 66.2, label: "핵심 — 열전달 조절층" },
      { at: 78.3, label: "목표 중량 · 두께 — 제품 표준화" },
      { at: 104.7, label: "운영의 문제 — 담당자의 기억" },
      { at: 128.3, label: "특허 ② 운영 AX" },
      { at: 147.5, label: "같은 20일, 다르게 판단" },
      { at: 180.2, label: "현재 단계 — 구현 · 본점 실증" },
      { at: 192.4, label: "단계적 성장 계획" },
      { at: 224.1, label: "자금 사용 계획" },
      { at: 235.9, label: "맺음말" },
    ],
    notesTitle: "보여드리기 전에",
    notes: [
      "소리를 켜 주세요 — 자막도 영상 안에 들어 있어 소리 없이도 읽힙니다.",
      "회의실 화면 · 노트북은 가로 16:9, 폰으로 보낼 때는 세로 9:16 을 고르세요.",
      "특허 두 건은 「출원 완료」로만 나옵니다 — 등록된 특허처럼 말하지 않습니다.",
      "운영 AX 는 「주요 화면 · 기능 구현 완료, 본점에서 검증은 이제부터」로 나옵니다 — 성과처럼 말하지 않습니다.",
      "마지막 말은 「감사합니다」입니다. 영상 속 앱 화면의 이름 · 숫자는 예시 데이터입니다.",
    ],
    tone: "gold",
  },
};

export const VIDEO_LIST: VideoInfo[] = [VIDEOS.guide, VIDEOS.tech];

/** 0:08 · 3:12 — 영상 흐름 시각 표기 (장면이 바뀌는 초에 맞춰 반올림) */
export function clock(sec: number): string {
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
