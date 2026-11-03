"use client";

/**
 * 알림 — 머리글 종을 누르면 (D-62)
 * ==============================
 *
 * 종에는 빨간 숫자(오늘 챙길 분)가 떠 있는데, 누르면 곧장 실행 브리핑
 * 화면으로 넘어갔다. 「무엇이 와 있나」 를 보려던 사람은 화면을 통째로
 * 옮겨 갔다가 돌아와야 했고, 고객이 남긴 요청 · 이용권 챙길 분 · 오늘
 * 오실 분은 종이 알려 주지 않았다 — 첫 화면을 내려 봐야 알았다.
 *
 * 폰 앱의 알림 창처럼, 종을 누르면 아래에서 올라오는 창에 **지금 손댈
 * 일**을 한 줄씩 모은다. 줄을 누르면 그 일을 하는 화면으로.
 *
 *   오늘 챙길 분       실행 브리핑의 미처리 과제
 *   고객이 남긴 것     MY WELLNESS 의 방문 요청 · 만족도 (매장 계정 연결 시)
 *   오늘 오실 분       다음 관리 예정일이 오늘 · 지난 예정
 *   이용권 챙길 분     기한 임박 · 소진
 *   백업               기록이 이 기기에만 있고 백업이 밀렸을 때
 *
 * 세기만 한다 — 우선순위 계산에는 손대지 않는다. 없는 줄은 그리지 않고,
 * 다 없으면 「지금 손댈 일이 없습니다」 한 줄.
 */

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { Modal } from "@/components/ui";
import { useStore } from "@/lib/data/store";
import { useStaffLink } from "@/lib/supabase/StaffLink";
import { useBackup } from "@/lib/data/useBackup";
import { findPassFollowUps } from "@/lib/scoring/pass-followup";
import { displayName } from "@/lib/utils/format";
import { todayISO } from "@/lib/utils/date";
import {
  CalendarIcon,
  ChatIcon,
  ChevronRightIcon,
  DownloadIcon,
  SparkIcon,
  TicketIcon,
} from "@/components/ui/icons";

interface Row {
  key: string;
  icon: React.ReactNode;
  tone: string;
  title: string;
  count: number;
  sub: string;
  href: string;
}

export default function InboxSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { briefingTasks, customers, memberships, visits, derivedById, settings, privacyMode } = useStore();
  const { phase, requests, feedback } = useStaffLink();
  const { stale, never, daysSince, hasData } = useBackup();

  const rows = useMemo<Row[]>(() => {
    const name = (id: string) => {
      const c = customers.find((x) => x.id === id);
      return c ? displayName(c.name, privacyMode) : "";
    };
    const names = (ids: string[]) => {
      const list = ids.map(name).filter(Boolean);
      return list.slice(0, 3).join(" · ") + (list.length > 3 ? ` 외 ${list.length - 3}명` : "");
    };
    const today = todayISO();
    const out: Row[] = [];

    const open = briefingTasks
      .filter((t) => t.status === "pending" || t.status === "confirmed")
      .sort((a, b) => b.priorityScore - a.priorityScore);
    if (open.length)
      out.push({
        key: "tasks",
        icon: <SparkIcon className="h-5 w-5" />,
        tone: "bg-aqua-50 text-aqua-800 ring-aqua-100 dark:bg-aqua-500/10 dark:text-aqua-300 dark:ring-aqua-500/20",
        title: "오늘 챙길 분",
        count: open.length,
        sub: names(open.map((t) => t.customerId)),
        href: "/briefing",
      });

    if (phase === "linked") {
      const reqs = requests.filter((r) => r.status === "open");
      const fb = feedback.filter((f) => !f.readAt);
      if (reqs.length + fb.length)
        out.push({
          key: "voice",
          icon: <ChatIcon className="h-5 w-5" />,
          tone: "bg-gold-soft text-gold-deep ring-gold/20",
          title: "고객이 남긴 것",
          count: reqs.length + fb.length,
          sub: [reqs.length ? `방문 요청 ${reqs.length}건` : "", fb.length ? `만족도 ${fb.length}건` : ""]
            .filter(Boolean)
            .join(" · "),
          href: "/#inbox",
        });
    }

    const dueToday = customers.filter((c) => c.nextManageDate?.slice(0, 10) === today);
    const overdue = customers.filter((c) => {
      const d = c.nextManageDate?.slice(0, 10);
      if (!d || d >= today) return false;
      return (derivedById.get(c.id)?.lastVisitDate?.slice(0, 10) ?? "") < d;
    });
    /*
      오늘 오실 분이 없고 지난 예정만 있으면 제목도 그 말로 (D-67) — 「오늘
      오실 분」 이라는 줄에 숫자 없이 「지난 예정 2명」 만 적혀 있었다.
    */
    if (dueToday.length)
      out.push({
        key: "schedule",
        icon: <CalendarIcon className="h-5 w-5" />,
        tone: "bg-sky-50 text-sky-800 ring-sky-100 dark:bg-sky-400/10 dark:text-sky-300 dark:ring-sky-400/20",
        title: "오늘 오실 분",
        count: dueToday.length,
        sub: [names(dueToday.map((c) => c.id)), overdue.length ? `지난 예정 ${overdue.length}명` : ""]
          .filter(Boolean)
          .join(" · "),
        href: "/#schedule",
      });
    else if (overdue.length)
      out.push({
        key: "schedule",
        icon: <CalendarIcon className="h-5 w-5" />,
        tone: "bg-sky-50 text-sky-800 ring-sky-100 dark:bg-sky-400/10 dark:text-sky-300 dark:ring-sky-400/20",
        title: "예정일이 지난 분",
        count: overdue.length,
        sub: `${names(overdue.map((c) => c.id))} — 아직 다녀가지 않으셨습니다`,
        href: "/#schedule",
      });

    const passes = findPassFollowUps(customers, memberships, visits, settings.careRules.membershipLowCount);
    if (passes.length)
      out.push({
        key: "passes",
        icon: <TicketIcon className="h-5 w-5" />,
        tone: "bg-violet-50 text-violet-800 ring-violet-100 dark:bg-violet-400/10 dark:text-violet-300 dark:ring-violet-400/20",
        title: "이용권 챙길 분",
        count: passes.length,
        sub: names(passes.map((p) => p.customerId)),
        href: "/#passes",
      });

    if (hasData && stale)
      out.push({
        key: "backup",
        icon: <DownloadIcon className="h-5 w-5" />,
        tone: "bg-stone-bg-deep text-ink-soft ring-black/[0.04] dark:ring-white/10",
        title: "백업 받아 두기",
        count: 0,
        sub: never ? "아직 한 번도 백업 파일을 받지 않으셨습니다" : `마지막 백업 후 ${daysSince}일`,
        href: "/settings#set-data",
      });
    return out;
  }, [briefingTasks, customers, memberships, visits, derivedById, settings.careRules.membershipLowCount, privacyMode, phase, requests, feedback, hasData, stale, never, daysSince]);

  return (
    <Modal open={open} onClose={onClose} title="알림">
      <div data-inbox-sheet>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-[0.9375rem] text-ink-sub">지금 손댈 일이 없습니다.</p>
        ) : (
          <ul className="-mx-1 divide-y divide-stone-line">
            {rows.map((r) => (
              <li key={r.key}>
                <button
                  type="button"
                  data-inbox-row={r.key}
                  onClick={() => {
                    onClose();
                    router.push(r.href);
                  }}
                  className="flex min-h-[4rem] w-full items-center gap-3.5 rounded-2xl px-1 py-3 text-left transition-colors hover:bg-card-soft active:bg-card-soft"
                >
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ${r.tone}`}>
                    {r.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-[1rem] font-extrabold text-ink">{r.title}</span>
                      {r.count > 0 && (
                        <span className="nowrap-num rounded-full bg-danger px-2 py-0.5 text-[0.75rem] font-extrabold leading-tight text-white">
                          {r.count}
                        </span>
                      )}
                    </span>
                    {r.sub && (
                      <span className="mt-0.5 block truncate text-[0.8125rem] text-ink-sub">{r.sub}</span>
                    )}
                  </span>
                  <ChevronRightIcon className="h-5 w-5 shrink-0 text-ink-faint" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
