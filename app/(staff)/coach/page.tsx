"use client";

/**
 * AX 코치 — 실증 운영 화면
 * =========================
 *
 * 「오늘의 실행 브리핑」과 역할이 다르다.
 *
 *   실행 브리핑 : 오늘 **누구에게** 연락하지?
 *   AX 코치     : 이 시스템이 실제로 쓰이고 있고 그 변화가 증거로
 *                 쌓이고 있나? 아니라면 오늘 **어느 쪽** 일을 하지?
 *
 * 그래서 이 화면은 고객을 다시 줄 세우지 않는다 (그건 브리핑의 몫이다).
 * 방향만 알려 주고, 실제 업무 화면으로 보낸다.
 */

import { useMemo, useState } from "react";
import StaffBand, { BandProgress, bandGhost } from "@/components/layout/StaffBand";
import CoachSummary from "@/components/ax-coach/CoachSummary";
import MissionCard from "@/components/ax-coach/MissionCard";
import CoachReport from "@/components/ax-coach/CoachReport";
import EvidenceSheet from "@/components/ax-coach/EvidenceSheet";
import { Card, EmptyState, Modal, SectionTitle } from "@/components/ui";
import { BookIcon, PrinterIcon, SparkIcon } from "@/components/ui/icons";
import { useCoach } from "@/lib/ax-coach/useCoach";
import { useStore } from "@/lib/data/store";
import { buildReport, trendVsDaysAgo } from "@/lib/ax-coach/report";
import { Fold } from "@/components/ui/Fold";
import { Hint } from "@/components/ui/Hint";

export default function CoachPage() {
  const {
    ready,
    coverage,
    coverageInput,
    missions,
    todayIssued,
    todayVerified,
    allMissions,
    isDemo,
    stageLabel,
  } = useCoach();
  const { settings } = useStore();
  const [sheetOpen, setSheetOpen] = useState(false);

  const report7 = useMemo(
    () => buildReport(coverageInput, allMissions, 7),
    [coverageInput, allMissions],
  );
  const report14 = useMemo(
    () => buildReport(coverageInput, allMissions, 14),
    [coverageInput, allMissions],
  );
  /* 7일 전 시점을 지금 기록으로 다시 계산 — 되살릴 수 없으면 비교하지 않는다 */
  const trend7 = useMemo(() => trendVsDaysAgo(coverageInput, 7), [coverageInput]);

  if (!ready) return null;

  return (
    <div>
      {/*
        머리 띠 (D-57) — 대시보드 · 챙길 고객과 같은 띠. 오늘 할 일이 몇 개고
        몇 개를 마쳤는지가 결론이다. 준비도 점수는 아래 칸(CoachSummary)에
        목표치 · 검산 숫자와 함께 그대로 있다 (D-18) — 띠에 또 쓰지 않는다.
      */}
      <StaffBand
        title="AX 코치"
        description="오늘 할 일을 먼저 알려 드리고, 실제 기록이 얼마나 쌓였는지 보여 드립니다."
        /*
          심사장에서 필요한 것은 엑셀 700줄이 아니라 A4 한 장이다.
          단추는 띠 맨 윗줄 오른쪽 — 화면을 열자마자 보이는 자리.
        */
        badge={
          <span data-tour="coach-sheet" className="no-print inline-flex">
            <Hint
              title="한 장으로 뽑아 가기"
              text="지금까지 쌓인 것을 A4 한 장으로 — 무엇을 재기로 했는지 · 어디까지 왔는지 · 어느 기록에서 나왔는지. 줄 단위 원본은 AX 도입성과의 증적 내보내기로."
            >
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                className={`${bandGhost} !min-h-[40px] !px-3.5 !text-[0.875rem]`}
              >
                <PrinterIcon className="h-4 w-4" />
                실증 리포트 보기
              </button>
            </Hint>
          </span>
        }
        headline={
          todayIssued.length === 0 ? (
            <>오늘 따로 챙길 것이 없습니다</>
          ) : todayVerified === todayIssued.length ? (
            <>오늘 할 일을 모두 마치셨습니다</>
          ) : (
            <>
              오늘은 <span className="nowrap-num text-aqua-300">{todayIssued.length - todayVerified}가지</span>만
              해 보세요
            </>
          )
        }
      >
        {todayIssued.length > 0 && (
          <BandProgress label="오늘 할 일" done={todayVerified} total={todayIssued.length} unit="개" />
        )}
      </StaffBand>

      <div className="flex flex-col card-gap">
        {/*
          오늘 할 일이 먼저다.

          준비도를 위에 두었더니 폰에서 첫 Mission 이 1,482px — 화면 밖
          둘째 장에 있었다. 이 화면을 아침에 여는 이유는 「오늘 뭐 하면
          되나」 이지 「우리가 몇 퍼센트인가」 가 아니다. 점수는 그 일을
          하고 나서 보는 것이다.

          준비도를 접거나 줄이지는 않았다 — 목표치와 검산 숫자가 이
          화면의 정직성 장치다(D-18). 자리만 바꿨다.
        */}
        <Card dataTour="coach-missions">
          <SectionTitle
            icon={<SparkIcon className="h-4 w-4" />}
            tone="aqua"
            hint="평소 업무를 하시면 실증자료도 같이 쌓입니다. 누르는 것으로 완료되지 않고, 실제 기록이 남아야 완료됩니다."
            action={
              todayIssued.length > 0 ? (
                <span className="nowrap-num text-[0.9375rem] font-bold text-ink-sub">
                  오늘 {todayIssued.length}개 중 {todayVerified}개 완료
                </span>
              ) : undefined
            }
          >
            오늘 이것만 해보세요
          </SectionTitle>

          {missions.length === 0 ? (
            <EmptyState
              title="오늘 따로 챙길 것이 없습니다"
              description="지금은 기록이 필요한 곳도, 처리를 기다리는 고객도 없습니다. 방문이 있으시면 그때 기록만 남겨 주세요."
            />
          ) : (
            <ul className="space-y-3">
              {missions.map((m, i) => (
                <MissionCard key={m.candidate.type} index={i + 1} view={m} />
              ))}
            </ul>
          )}
        </Card>

        <CoachSummary
          coverage={coverage}
          isDemo={isDemo}
          stageLabel={stageLabel}
          before={trend7?.before ?? null}
          beforeDays={7}
        />


        <CoachReport report7={report7} report14={report14} />

        <Modal
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title="AX 실증 리포트"
          wide
        >
          <EvidenceSheet
            settings={settings}
            coverage={coverage}
            report={report7}
            missions={allMissions}
            isDemo={isDemo}
            stageLabel={stageLabel}
          />
        </Modal>

        {/*
          이 화면이 무엇을 하지 않는지 — 브리핑과 헷갈리지 않게 한 번 적는다.
        */}
        <Fold
          id="coach-vs-briefing"
          icon={<BookIcon className="h-[1.1rem] w-[1.1rem]" />}
          title="AX 코치와 오늘의 실행 브리핑은 무엇이 다른가요"
          hint="브리핑은 누구에게 연락할지, 코치는 그 관리가 기록으로 쌓이는지를 봅니다"
        >
          <p className="text-[1rem] leading-relaxed text-ink-soft">
            <b className="text-ink">오늘의 실행 브리핑</b>은 <b>누구에게</b>{" "}
            연락할지를 순서대로 알려 드립니다.{" "}
            <b className="text-ink">AX 코치</b>는 그 관리가 실제 기록으로
            쌓이고 있는지를 보고 <b>어느 쪽</b> 일이 비었는지 알려 드립니다.
            고객 명단은 브리핑에서 정합니다.
          </p>
        </Fold>
      </div>
    </div>
  );
}
