"use client";

import Link from "next/link";
import { useStore } from "@/lib/data/store";
import { Card, SectionTitle } from "@/components/ui";
import { ChevronRightIcon, SparkIcon } from "@/components/ui/icons";
import TaskCard from "@/components/briefing/TaskCard";

export default function BriefingPreview() {
  const { briefingTasks } = useStore();
  const open = briefingTasks.filter(
    (t) => t.status === "pending" || t.status === "confirmed",
  );
  const top3 = open.slice(0, 3);
  const doneToday = briefingTasks.filter((t) => t.status === "done").length;

  return (
    <Card>
      <SectionTitle
        action={
          <Link
            href="/briefing"
            className="inline-flex items-center gap-0.5 text-sm font-semibold text-aqua-700 hover:text-aqua-800 whitespace-nowrap"
          >
            전체 보기
            <ChevronRightIcon className="h-4 w-4" />
          </Link>
        }
      >
        <span className="inline-flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-aqua-600 text-white">
            <SparkIcon className="h-5 w-5" />
          </span>
          AI 고객관리 · 오늘의 실행 브리핑
        </span>
      </SectionTitle>

      <p className="mb-3 text-sm text-ink-sub">
        오늘 관리 대상{" "}
        <strong className="nowrap-num text-aqua-700">{open.length}명</strong>
        {doneToday > 0 && (
          <>
            {" "}
            · 처리완료{" "}
            <strong className="nowrap-num text-ink-soft">{doneToday}건</strong>
          </>
        )}
      </p>

      {top3.length === 0 ? (
        <p className="rounded-card bg-card-soft py-8 text-center text-sm text-ink-sub">
          오늘 처리할 관리 과제를 모두 완료했습니다.
        </p>
      ) : (
        <div className="space-y-3">
          {top3.map((task, i) => (
            <TaskCard key={task.id} task={task} rank={i + 1} compact />
          ))}
        </div>
      )}
    </Card>
  );
}
