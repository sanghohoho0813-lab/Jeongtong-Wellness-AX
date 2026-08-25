/** 인라인 SVG 아이콘 세트 (외부 의존성 없이 경량 유지) */

interface IconProps {
  className?: string;
  strokeWidth?: number;
}

function base(props: IconProps) {
  return {
    className: props.className ?? "w-5 h-5",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: props.strokeWidth ?? 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    viewBox: "0 0 24 24",
  };
}

export const HomeIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h14V9.5" />
    <path d="M10 21v-6h4v6" />
  </svg>
);

export const SparkIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
    <circle cx="12" cy="12" r="3.2" />
  </svg>
);

export const UsersIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="9" cy="8" r="3.4" />
    <path d="M2.8 20c.7-3.3 3.2-5 6.2-5s5.5 1.7 6.2 5" />
    <path d="M15.5 5.2a3.4 3.4 0 0 1 0 5.7" />
    <path d="M17.8 15.4c1.8.6 3 1.9 3.4 4.1" />
  </svg>
);

export const CalendarIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
    <path d="M3.5 9.5h17M8 3v4M16 3v4" />
  </svg>
);

export const ClipboardIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="5" y="4.5" width="14" height="17" rx="2.5" />
    <path d="M9 4.5V3h6v1.5" />
    <path d="M8.5 10h7M8.5 13.5h7M8.5 17h4.5" />
  </svg>
);

export const BookIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 5.5A2 2 0 0 1 6 3.5h5v17H6a2 2 0 0 0-2 2z" />
    <path d="M20 5.5a2 2 0 0 0-2-2h-5v17h5a2 2 0 0 1 2 2z" />
  </svg>
);

export const DownloadIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3.5v11" />
    <path d="M7.5 10.5 12 15l4.5-4.5" />
    <path d="M4.5 17.5v1a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-1" />
  </svg>
);

export const UploadIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 15.5v-11" />
    <path d="M7.5 8.5 12 4l4.5 4.5" />
    <path d="M4.5 17.5v1a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-1" />
  </svg>
);

export const AlertIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 4.5 21 19.5H3z" />
    <path d="M12 10v4" />
    <path d="M12 16.8h.01" />
  </svg>
);

export const PrinterIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M7 9V3.5h10V9" />
    <rect x="4" y="9" width="16" height="7.5" rx="2" />
    <path d="M7 14.5h10v6H7z" />
  </svg>
);

export const RefreshIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M20 12a8 8 0 1 1-2.3-5.6" />
    <path d="M20 3v4h-4" />
  </svg>
);

export const ChartIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 20V10M10 20V4M16 20v-7M21 20H3" />
  </svg>
);

export const BuildingIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="4" y="3.5" width="12" height="17.5" rx="1.5" />
    <path d="M16 9h3a1 1 0 0 1 1 1v11" />
    <path d="M8 8h2M8 12h2M8 16h2M12.5 8h1M12.5 12h1M12.5 16h1M3 21h18" />
  </svg>
);

export const SettingsIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M19.4 13.5a7.8 7.8 0 0 0 0-3l2-1.5-2-3.4-2.3 1a7.8 7.8 0 0 0-2.6-1.5L14 2.5h-4l-.5 2.6a7.8 7.8 0 0 0-2.6 1.5l-2.3-1-2 3.4 2 1.5a7.8 7.8 0 0 0 0 3l-2 1.5 2 3.4 2.3-1a7.8 7.8 0 0 0 2.6 1.5l.5 2.6h4l.5-2.6a7.8 7.8 0 0 0 2.6-1.5l2.3 1 2-3.4Z" />
  </svg>
);

export const ChevronRightIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m9 5 7 7-7 7" />
  </svg>
);

export const ChevronLeftIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m15 5-7 7 7 7" />
  </svg>
);

export const PlusIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const SearchIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20.5 20.5-4.3-4.3" />
  </svg>
);

export const CheckIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m4.5 12.5 5 5 10-11" />
  </svg>
);

export const PauseIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M9 5v14M15 5v14" />
  </svg>
);

export const PhoneIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 4h4l1.5 4.5-2.2 1.6a13.5 13.5 0 0 0 5.6 5.6l1.6-2.2L20 15v4a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2Z" />
  </svg>
);

export const MoreIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="5" cy="12" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="19" cy="12" r="1.3" fill="currentColor" stroke="none" />
  </svg>
);

export const BellIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6" />
    <path d="M10 19a2.2 2.2 0 0 0 4 0" />
  </svg>
);

export const LeafIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 19C5 9 11 4 20 4c0 9-5 15-15 15Z" />
    <path d="M5 19c3-5 7-9 11-11" />
  </svg>
);

/** 이용권 — 가운데가 잘록한 표 모양 */
export const TicketIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 8.5V6.5h18v2a2.2 2.2 0 0 0 0 4.4v2A2.2 2.2 0 0 0 21 17.5v2H3v-2a2.2 2.2 0 0 0 0-4.4v-2a2.2 2.2 0 0 0 0-4.4Z" />
    <path d="M9.5 9.5v5M14.5 9.5v5" />
  </svg>
);

/** 상담 — 말풍선 */
export const ChatIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M20.5 12.2c0 3.9-3.8 7-8.5 7-1 0-2-.15-2.9-.42L4 20.5l1.5-3.6A6.6 6.6 0 0 1 3.5 12.2c0-3.9 3.8-7 8.5-7s8.5 3.1 8.5 7Z" />
    <path d="M8.6 12h.01M12 12h.01M15.4 12h.01" strokeWidth={2.4} />
  </svg>
);

/** 친구 추천 — 선물 상자 */
export const GiftIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3.5 11.5h17v8.5a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-8.5Z" />
    <path d="M2.8 7.8h18.4v3.7H2.8z" />
    <path d="M12 7.8v13.2" />
    <path d="M12 7.8S10.8 3 8.4 3a2.4 2.4 0 0 0 0 4.8H12Zm0 0s1.2-4.8 3.6-4.8a2.4 2.4 0 0 1 0 4.8H12Z" />
  </svg>
);

export const BodyIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="4.6" r="2.1" />
    <path d="M12 7.5v6M8 9.2h8M12 13.5l-2.6 6.8M12 13.5l2.6 6.8" />
  </svg>
);

export const XIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const TrendUpIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 17l6-6 4 4 8-8" />
    <path d="M15 7h6v6" />
  </svg>
);
