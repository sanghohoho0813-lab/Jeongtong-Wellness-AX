"use client";

/**
 * Why AX — 정통대왕쑥뜸원에 무엇이 달라지는가
 * ==========================================
 *
 * 「기획의도」(/intro)와 무엇이 다른가
 * -----------------------------------
 * /intro 는 **AX 라는 개념과 정책 흐름**을 설명하는 글이다. AX 가 무엇이고
 * 왜 지금 이런 변화가 오고 있는지, 정책자금과는 어떻게 닿는지를 다룬다.
 * 그 화면은 그대로 둔다 — 처음 이 말을 듣는 분께는 그 설명이 먼저 필요하다.
 *
 * 이 화면은 그 다음이다. **우리 매장 이야기**만 한다.
 * 지금 이 매장이 무엇을 어떻게 하고 있고, 어디서 새고 있으며, 이 시스템의
 * 어느 화면이 그것을 받아 내는지를 순서대로 잇는다. 일반론은 한 줄로 끝내고
 * 곧바로 "우리 매장이라면" 으로 넘어간다.
 *
 * 지어내지 않은 것
 * ----------------
 * 여기 적힌 숫자는 전부 이 저장소에 실제로 있는 것만 쓴다 —
 * 상품 3종의 실제 가격(45,000 / 400,000 / 1,100,000), 우선순위 계산이
 * 실제로 보는 항목, 실제 화면 이름. 예상 매출·도입 효과·만족도 같은
 * 만들어 낸 수치는 한 줄도 쓰지 않는다. 대표님이 심사 자리에서 이 화면을
 * 띄웠을 때 "그 숫자 근거가 무엇입니까" 를 받아 낼 수 있어야 하기 때문이다.
 */

import Link from "next/link";
import {
  DocChain,
  DocCompare,
  DocFlow,
  DocHero,
  DocLinks,
  DocList,
  DocNote,
  DocPage,
  DocPillars,
  DocQuote,
  DocSection,
  DocToc,
  Ui,
} from "@/components/docs/DocParts";
import { DocFigure, DocLayers, DocLoop } from "@/components/docs/DocDiagram";
import { Button } from "@/components/ui";
import { ChevronRightIcon, SparkIcon } from "@/components/ui/icons";
import { useDocumentTitle } from "@/lib/utils/title";
import { PUBLIC_PRICES } from "@/lib/public/price-sheet";
import { formatKrw } from "@/lib/utils/format";

const TOC = [
  { no: "01", label: "지금 이 매장", href: "#w1" },
  { no: "02", label: "고객이 걷는 길", href: "#w2" },
  { no: "03", label: "매장 안에서 벌어지는 일", href: "#w3" },
  { no: "04", label: "어디서 새고 있는가", href: "#w4" },
  { no: "05", label: "왜 AX + 플랫폼인가", href: "#w5" },
  { no: "06", label: "고객 화면이 바꾸는 것", href: "#w6" },
  { no: "07", label: "내부 AX 가 바꾸는 것", href: "#w7" },
  { no: "08", label: "둘을 잇는 다리", href: "#w8" },
  { no: "09", label: "판단을 돕는 층", href: "#w9" },
  { no: "10", label: "이전과 이후", href: "#w10" },
  { no: "11", label: "재방문이 도는 고리", href: "#w11" },
  { no: "12", label: "손이 덜 가는 만큼", href: "#w12" },
  { no: "13", label: "기록이 자산이 되는 구조", href: "#w13" },
  { no: "14", label: "여기서 더 갈 수 있는 곳", href: "#w14" },
];

export default function WhyAxPage() {
  useDocumentTitle("Why AX");

  const single = PUBLIC_PRICES.find((p) => p.sessions === 1);
  const ten = PUBLIC_PRICES.find((p) => p.sessions === 10);
  const thirty = PUBLIC_PRICES.find((p) => p.sessions === 30);

  return (
    <DocPage>
      <DocHero
        eyebrow="WHY AX"
        title="정통대왕쑥뜸원에 무엇이 달라지는가"
        subtitle="기술 이야기가 아니라, 이 매장에서 실제로 벌어지던 일을 어떻게 받아 내는지에 대한 이야기입니다."
        lead="AX 가 무엇인지에 대한 설명은 「기획의도」 화면에 따로 있습니다. 여기서는 그 개념을 우리 매장에 대 보았을 때 어느 자리에서 무엇이 달라지는지만 순서대로 적었습니다."
        meta="14개 절 · 읽는 데 8~10분"
      />

      <div className="mt-4 space-y-4">
        <DocToc
          items={TOC}
          flow="지금 이 매장 → 어디서 새는가 → 두 화면이 그것을 어떻게 받는가 → 무엇이 남는가"
          phoneHint="폰에서는 각 절이 접혀 있습니다. 제목을 누르면 펼쳐집니다."
        />

        {/* 01 ─────────────────────────────────────────── */}
        <DocSection
          id="w1"
          no="01"
          kicker="현재"
          title="지금 이 매장은 이렇게 돌아갑니다"
          tone="teal"
          collapsible
        >
          <p>
            정통대왕쑥뜸원은 대왕쑥뜸을 중심으로 한 온열 웰니스 매장입니다.
            고객이 오시면 상담을 하고, 그날 어느 부위를 봐 드릴지 정하고,
            케어를 해 드리고, 다음에 언제 오실지를 이야기하고 보내 드립니다.
            이용권을 끊으신 분은 남은 횟수에서 한 번을 차감합니다.
          </p>
          <p>
            판매하는 것은 세 가지입니다.
          </p>
          {/*
            글머리표 세 줄로 적어 두었더니 "45,000원" 과 "400,000원" 의
            차이가 눈에 안 들어왔다. 가격표는 읽는 것이 아니라 견주는
            것이라, 숫자를 크게 세워 나란히 둔다.
          */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <DocFigure
              label={single?.name ?? "1회"}
              value={formatKrw(single?.price ?? 0)}
              note="한 번 받으실 때"
            />
            <DocFigure
              label={ten?.name ?? "10회권"}
              value={formatKrw(ten?.price ?? 0)}
              note={`1회당 ${formatKrw(ten?.perSession ?? 0)}`}
            />
            <DocFigure
              label={thirty?.name ?? "30회권"}
              value={formatKrw(thirty?.price ?? 0)}
              note={`1회당 ${formatKrw(thirty?.perSession ?? 0)}`}
            />
          </div>
          <DocNote>
            이 세 가지가 이 시스템 전체의 기준입니다. 설정 →{" "}
            <Ui>서비스 · 이용권 상품</Ui>에 그대로 들어 있고, 매출·잔여회차·
            재등록 판단이 모두 이 값을 봅니다. 가격을 바꾸시면 화면 전체가 같이
            바뀝니다.
          </DocNote>
        </DocSection>

        {/* 02 ─────────────────────────────────────────── */}
        <DocSection
          id="w2"
          no="02"
          kicker="고객 쪽"
          title="고객은 이런 길을 걷습니다"
          tone="aqua"
          collapsible
        >
          <DocFlow
            tone="aqua"
            steps={[
              { title: "알게 된다 (소개 · 지나가다 · 검색)" },
              { title: "물어본다 (전화 · 방문)" },
              { title: "처음 온다" },
              { title: "이용권을 끊는다" },
              { title: "몇 번 다닌다" },
              { title: "뜸해진다" },
              { title: "다시 오거나, 오지 않는다" },
            ]}
          />
          <p>
            이 일곱 걸음에서 매장이 실제로 손을 댈 수 있는 자리는 두 군데입니다.
            <b> 처음 물어볼 때</b>와 <b>뜸해질 때</b>입니다. 나머지는 대체로
            고객이 알아서 오시는 구간입니다.
          </p>
          <DocQuote tone="aqua">
            그런데 이 두 자리가 정확히, 지금까지 기록이 가장 얇았던 자리였습니다.
          </DocQuote>
        </DocSection>

        {/* 03 ─────────────────────────────────────────── */}
        <DocSection
          id="w3"
          no="03"
          kicker="내부"
          title="매장 안에서는 이런 일이 벌어집니다"
          tone="violet"
          collapsible
        >
          <p>
            고객이 나가시고 나면 원장님 머릿속에 이런 것들이 남습니다.
          </p>
          <DocList
            tone="violet"
            items={[
              "이분 어깨가 계속 안 좋다고 하셨지",
              "10회권 두 번쯤 남았을 텐데",
              "3주 됐나, 한 달 됐나",
              "지난번에 다음 주에 온다고 하셨는데 안 오셨네",
              "저분은 소개해 주신 분인데 요즘 안 보이시네",
            ]}
          />
          <p>
            이것들은 전부 <b>사실</b>입니다. 어딘가에 적혀 있으면 언제든 다시
            꺼낼 수 있는 것들입니다. 그런데 지금까지 이것들이 살던 곳은 종이
            차트와 기억이었습니다.
          </p>
          <DocNote>
            종이 차트가 나쁘다는 뜻이 아닙니다. 종이는 그날의 기록을 남기는
            데는 아주 좋습니다. 다만 <b>&ldquo;오늘 누구를 챙겨야 하나&rdquo;</b>를
            물어보면 대답을 못 합니다. 그러려면 서른 장을 한꺼번에 놓고
            비교해야 하는데, 그건 사람이 매일 할 수 있는 일이 아닙니다.
          </DocNote>
        </DocSection>

        {/* 04 ─────────────────────────────────────────── */}
        <DocSection
          id="w4"
          no="04"
          kicker="손실"
          title="그래서 어디서 새고 있었는가"
          tone="amber"
          collapsible
        >
          <p>
            새는 자리는 크게 넷입니다. 전부 <b>몰라서</b>가 아니라{" "}
            <b>그 순간에 떠오르지 않아서</b> 생깁니다.
          </p>
          <DocChain
            items={[
              {
                title: "뜸해진 분을 놓친다",
                desc: "평소 2주 간격으로 오시던 분이 5주째 안 오신다. 이건 신호인데, 안 오시는 분은 화면에도 안 뜨니 그냥 잊힌다.",
              },
              {
                title: "이용권이 조용히 끝난다",
                desc: "10회권이 한 번 남았을 때가 다시 말씀드릴 자리다. 다 쓰고 두 달이 지난 뒤에는 이미 늦다.",
              },
              {
                title: "상담만 하고 끝난다",
                desc: "전화로 한참 물어보시고 '생각해 볼게요' 하고 끊으신다. 그 통화는 아무 데도 남지 않는다.",
              },
              {
                title: "해 드린 것이 남지 않는다",
                desc: "어느 부위를 몇 번 봐 드렸는지가 남아 있으면 다음 상담이 완전히 달라진다. 남아 있지 않으면 매번 처음부터 여쭤야 한다.",
              },
            ]}
          />
          <DocQuote tone="amber">
            네 가지 모두 새 고객을 데려오는 문제가 아닙니다. <b>이미 오셨던
            분</b>을 다시 만나는 문제입니다. 그래서 광고를 늘려도 메워지지
            않습니다.
          </DocQuote>
        </DocSection>

        {/* 05 ─────────────────────────────────────────── */}
        <DocSection
          id="w5"
          no="05"
          kicker="선택"
          title="왜 AX 이고, 왜 고객 화면까지인가"
          tone="teal"
          collapsible
        >
          <p>
            앞의 네 가지를 다시 보면 공통점이 하나 있습니다. 전부{" "}
            <b>&ldquo;기록은 있는데 그것을 제때 꺼내 주는 사람이 없다&rdquo;</b>는
            문제입니다. 사람을 한 명 더 쓰면 풀립니다. 그게 어려우니 기록이
            스스로 손을 들게 만드는 것이 이 시스템입니다.
          </p>
          <DocPillars
            items={[
              {
                no: "01",
                title: "쌓는다",
                desc: "방문 · 부위 · 이용권 · 상담 원문을 한 자리에 남깁니다. 이게 없으면 아래 두 가지가 성립하지 않습니다.",
                tone: "teal",
              },
              {
                no: "02",
                title: "꺼낸다",
                desc: "매장이 정한 기준으로 오늘 챙길 분을 골라 위로 올립니다. 원장님이 찾지 않아도 눈에 들어옵니다.",
                tone: "aqua",
              },
              {
                no: "03",
                title: "잇는다",
                desc: "고객도 자기 기록을 봅니다. 남은 횟수와 다음 방문일을 물어보지 않고 확인합니다.",
                tone: "gold",
              },
            ]}
          />
          <p>
            셋째가 「플랫폼」에 해당하는 부분입니다. 내부만 정리하면 매장 일은
            편해지지만 고객이 느끼는 것은 그대로입니다. 고객 쪽에 창을 하나
            내야 <b>고객이 남긴 것이 다시 매장으로 돌아오는</b> 고리가 생깁니다.
          </p>
        </DocSection>

        {/* 06 ─────────────────────────────────────────── */}
        <DocSection
          id="w6"
          no="06"
          kicker="고객 화면"
          title="고객 화면이 바꾸는 것"
          tone="emerald"
          collapsible
        >
          <p>
            고객이 여는 화면(MY WELLNESS)은 매장 화면을 작게 줄인 것이
            아닙니다. 고객이 궁금해하는 세 가지에만 답합니다.
          </p>
          <DocFlow
            tone="emerald"
            steps={[
              { title: "다음에 언제 가지", desc: "다음 방문 예정" },
              { title: "몇 번 남았지", desc: "이용권 잔여" },
              { title: "저번에 어디 봐 주셨더라", desc: "케어 기록" },
            ]}
          />
          <p>
            이 세 가지를 확인하려고 지금까지 고객은 매장에 전화를 하셨습니다.
            영업시간에만 가능하고, 받는 쪽도 일을 멈춰야 합니다. 그 통화 중
            상당수가 이 화면으로 옮겨 갑니다.
          </p>
          <p>
            그리고 반대 방향이 열립니다. 고객이 이 화면에서{" "}
            <Ui>방문 요청</Ui>이나 <Ui>상담 문의</Ui>를 남기면, 그것이 곧바로
            내부 대시보드의 <Ui>고객 수신함</Ui>에 뜹니다. 전화를 못 받은
            시간에 들어온 문의가 사라지지 않습니다.
          </p>
          <DocNote>
            고객 화면에는 매장이 고객을 나누려고 쓰는 내부 분류(우선순위 ·
            매출기회 같은 것)를 내보이지 않습니다. 그건 일하는 사람의 말이지
            고객에게 할 말이 아닙니다.
          </DocNote>
        </DocSection>

        {/* 07 ─────────────────────────────────────────── */}
        <DocSection
          id="w7"
          no="07"
          kicker="내부 AX"
          title="내부 AX 가 바꾸는 것"
          tone="aqua"
          collapsible
        >
          <p>
            내부 화면의 핵심은 목록이 아니라 <b>순서</b>입니다. 고객이 200명이면
            200줄을 다 볼 수는 없습니다. 오늘 실제로 손이 가야 할 대여섯 명이
            맨 위에 있어야 합니다.
          </p>
          <DocCompare
            before={{
              title: "지금까지",
              items: [
                "이름순 · 가나다순으로 늘어놓는다",
                "누가 급한지는 열어 봐야 안다",
                "안 오시는 분은 목록에서도 조용하다",
                "이용권 잔여는 따로 세어 본다",
              ],
            }}
            after={{
              title: "이 시스템에서",
              items: [
                "관리가 필요한 분이 맨 위로 올라온다",
                "왜 위에 있는지가 이유로 함께 나온다",
                "오래 안 오신 분일수록 위로 올라온다",
                "잔여 회차가 줄에 같이 보인다",
              ],
            }}
          />
          <p>
            그 순서를 만드는 기준은 <b>매장이 정합니다.</b> 설정 →{" "}
            <Ui>고객관리 기준</Ui>에서 관리주기, 장기 미방문 기준, 잔여 회차
            기준을 직접 바꿀 수 있고, 바꾸기 전에 몇 명이 어떻게 움직이는지
            미리 볼 수 있습니다. 시스템이 정해 준 기준을 따르는 것이 아니라
            원장님의 기준을 시스템이 대신 지켜 보는 구조입니다.
          </p>
        </DocSection>

        {/* 08 ─────────────────────────────────────────── */}
        <DocSection
          id="w8"
          no="08"
          kicker="다리"
          title="두 화면을 잇는 다리"
          tone="gold"
          collapsible
        >
          <p>
            고객 화면과 내부 화면은 같은 기록 위에 서 있습니다. 한쪽에서 생긴
            일이 다른 쪽에 그대로 나타납니다. 실제로 도는 고리가 둘 있습니다.
          </p>

          <p className="mt-4 text-[0.8125rem] font-extrabold uppercase tracking-wider text-gold-deep">
            고객 → 매장
          </p>
          <DocFlow
            tone="gold"
            steps={[
              { title: "고객이 방문 요청 · 상담 문의를 남긴다" },
              { title: "대시보드 「고객 수신함」에 뜬다" },
              { title: "직원이 확인하고 처리한다" },
              { title: "고객 화면의 '내가 남긴 요청'이 처리됨으로 바뀐다" },
            ]}
          />

          <p className="mt-5 text-[0.8125rem] font-extrabold uppercase tracking-wider text-aqua-800">
            매장 → 고객
          </p>
          <DocFlow
            tone="aqua"
            steps={[
              { title: "직원이 고객 상세에서 다음 관리 예정일을 정한다" },
              { title: "그 값이 고객 화면 '다음 방문 예정'에 그대로 뜬다" },
              { title: "방문을 기록하면 이용권이 차감된다" },
              { title: "고객 화면의 남은 횟수가 같이 줄어든다" },
            ]}
          />

          <DocNote>
            같은 사실을 두 군데에 따로 저장하지 않습니다. 다음 방문 예정일은
            내부의 <Ui>다음 관리 예정일</Ui> 하나뿐이고, 고객 화면은 그것을
            읽어 보여 줄 뿐입니다. 두 벌로 저장하면 반드시 어긋납니다.
          </DocNote>
        </DocSection>

        {/* 09 ─────────────────────────────────────────── */}
        <DocSection
          id="w9"
          no="09"
          kicker="판단"
          title="판단을 돕는 층 — 지금 어디까지 와 있는가"
          tone="violet"
          collapsible
        >
          <p>
            화면 곳곳에 <Ui>AI 추천</Ui>, <Ui>AX Insight</Ui> 라고 적혀
            있습니다. 지금 그 값을 만드는 것이 무엇인지 정확히 적어 둡니다.
          </p>
          <DocCompare
            before={{
              title: "지금 — 규칙으로 계산",
              items: [
                "마지막 방문 이후 경과일",
                "이 고객의 평균 이용 간격",
                "이용권 잔여 회차와 만료일",
                "매장이 설정에서 정한 기준값",
              ],
            }}
            after={{
              title: "다음 — 같은 자리에 모델 연결",
              items: [
                "상담 메모의 문장까지 함께 읽는다",
                "여러 신호를 견주어 우선순위를 조정한다",
                "왜 그렇게 봤는지를 말로 설명한다",
                "붙이는 자리는 이미 만들어져 있다",
              ],
            }}
          />
          <p>
            지금 붙어 있는 것은 규칙입니다. 언어모델은 연결되어 있지 않습니다.
            화면에서 <Ui>AI READY</Ui> 를 누르시면 그 자리마다 무엇으로
            계산했는지 그대로 나옵니다.
          </p>
          <DocQuote tone="violet">
            이걸 굳이 적어 두는 이유는 하나입니다. 나중에 진짜 모델을 붙였을 때{" "}
            <b>무엇이 달라졌는지 말할 수 있어야</b> 하기 때문입니다.
          </DocQuote>
        </DocSection>

        {/* 10 ─────────────────────────────────────────── */}
        <DocSection
          id="w10"
          no="10"
          kicker="이전 / 이후"
          title="하루가 어떻게 달라지는가"
          tone="sky"
          collapsible
        >
          <DocCompare
            before={{
              title: "이전 — 아침에 문을 열면",
              items: [
                "예약 노트를 펴 본다",
                "오늘 올 분만 확인한다",
                "안 오는 분에 대해서는 할 일이 없다",
                "저녁에 차트를 정리한다",
              ],
            }}
            after={{
              title: "이후 — 아침에 문을 열면",
              items: [
                "오늘의 실행 브리핑을 연다",
                "오늘 챙길 분이 이유와 함께 나와 있다",
                "연락하고 나면 처리로 표시한다",
                "기록은 응대하면서 그 자리에서 남긴다",
              ],
            }}
          />
          <p>
            달라지는 것은 <b>일의 양</b>이 아니라 <b>일의 순서</b>입니다. 지금도
            원장님은 이 판단을 하고 계십니다. 다만 그 판단이 기억에 의존하고
            있어서, 바쁜 날에는 통째로 건너뛰어집니다. 화면에 적혀 있으면
            바쁜 날에도 건너뛰지 않습니다.
          </p>
        </DocSection>

        {/* 11 ─────────────────────────────────────────── */}
        <DocSection
          id="w11"
          no="11"
          kicker="매출"
          title="재방문이 도는 고리"
          tone="emerald"
          collapsible
        >
          <p>
            이 매장의 매출은 새 고객 수보다 <b>한 분이 몇 번 오시는가</b>에 더
            크게 걸려 있습니다. 10회권을 끊으신 분이 열 번을 다 채우고 다시
            끊으시는 것과, 여섯 번에서 멈추시는 것의 차이가 그대로 매출
            차이입니다.
          </p>
          {/*
            줄줄이 늘어놓은 목록이었다. 그런데 이 여섯은 줄이 아니라
            **고리**다 — 여섯 번째에서 첫 번째로 돌아간다. 돌아가는
            화살표가 없으면 그냥 절차서이고, 있으면 "돌수록 쌓인다" 가
            된다. 이 문서에서 가장 중요한 그림이라 그림으로 그린다.
          */}
          <DocLoop
            steps={[
              {
                title: "기록이 쌓인다",
                desc: "방문 · 부위 · 잔여 회차가 남는다",
              },
              {
                title: "기준에 걸린다",
                desc: "관리주기가 지났거나 잔여가 적으면 위로 올라온다",
              },
              {
                title: "연락한다",
                desc: "그날 할 일로 나오고, 처리하면 표시된다",
              },
              {
                title: "다시 오신다",
                desc: "방문이 기록되고 다음 예정일이 다시 잡힌다",
              },
              {
                title: "재등록으로 이어진다",
                desc: "이용권이 끝날 때가 말씀드릴 자리다",
              },
              {
                title: "성과로 확인한다",
                desc: "실제 재등록 매출로 이어졌는지 센다",
              },
            ]}
            closing="그리고 그 방문이 다시 ① 기록으로 쌓여 다음 바퀴가 돌아갑니다 — 한 바퀴 돌 때마다 판단할 근거가 늘어납니다."
          />
          <DocNote>
            마지막 한 걸음이 중요합니다. 이 시스템은 <b>예상 매출을 만들어
            보여 주지 않습니다.</b> 실제로 일어난 재등록만 셉니다. 그래야 그
            숫자를 심사 자리에 그대로 가져갈 수 있습니다.
          </DocNote>
        </DocSection>

        {/* 12 ─────────────────────────────────────────── */}
        <DocSection
          id="w12"
          no="12"
          kicker="효율"
          title="손이 덜 가는 만큼"
          tone="amber"
          collapsible
        >
          <p>
            업무효율화는 이 시스템의 목적이 아니라 부수적으로 따라오는
            것입니다. 그래도 실제로 줄어드는 자리는 적어 둡니다.
          </p>
          <DocList
            tone="amber"
            items={[
              "잔여 회차 문의 전화 — 고객이 직접 확인",
              "다음 예약일 확인 전화 — 고객 화면에 표시",
              "저녁 차트 정리 — 응대 중에 그 자리에서 기록",
              "누가 언제 왔는지 되짚기 — 방문 기록에 남음",
              "월 정산용 집계 — 성과 화면에서 바로",
            ]}
          />
          <p>
            줄어든 시간이 다른 일로 채워질지, 고객 한 분께 더 쓰일지는 매장이
            정할 일입니다. 이 시스템이 대신 정하지 않습니다.
          </p>
        </DocSection>

        {/* 13 ─────────────────────────────────────────── */}
        <DocSection
          id="w13"
          no="13"
          kicker="자산"
          title="기록이 매장의 자산이 되는 구조"
          tone="teal"
          collapsible
        >
          <p>
            3년 치 방문 기록은 그 자체로 이 매장에만 있는 자산입니다. 어느
            계절에 어떤 부위 상담이 많았는지, 어떤 이용권이 끝까지 쓰였는지는
            다른 어디서도 살 수 없습니다.
          </p>
          <p>
            그 자산이 자산으로 남으려면 두 가지가 필요합니다.
          </p>
          <DocFlow
            tone="teal"
            steps={[
              { title: "한 가지 모양으로 쌓일 것 — 사람마다 다르게 적으면 나중에 합칠 수 없다" },
              { title: "언제든 꺼낼 수 있을 것 — 설정", desc: "데이터에서 전부 파일로 내려받는다" },
            ]}
          />
          <DocNote>
            내려받은 파일로 다시 되돌릴 수도 있고, 나중에 다른 시스템으로 옮길
            수도 있습니다. 기록이 이 화면 안에 갇히지 않게 해 두는 것이,
            이 시스템을 계속 쓸지 말지를 매장이 정할 수 있게 하는 조건입니다.
          </DocNote>
        </DocSection>

        {/* 14 ─────────────────────────────────────────── */}
        <DocSection
          id="w14"
          no="14"
          kicker="다음"
          title="여기서 더 갈 수 있는 곳"
          tone="gold"
          collapsible
        >
          <p>
            지금 만들어 둔 자리 위에 얹을 수 있는 것들입니다. <b>지금 되는
            것이 아니라 자리가 있다는 뜻</b>으로 읽어 주십시오.
          </p>
          <DocList
            tone="gold"
            items={[
              "판단 층에 언어모델 연결 — 상담 원문까지 읽는 우선순위",
              "고객 알림 — 지금은 화면에서 확인, 다음은 알림으로",
              "예약 확정까지 — 지금은 요청 접수, 다음은 시간 확정",
            ]}
          />

          {/*
            매장이 늘어날 때의 구조.

            지금 있는 것과 아직 없는 것을 한 그림에 넣되, 없는 것은
            점선과 '아직 없음' 으로 분명히 갈라 둔다. 이 화면은 심사
            자리에서도 띄우는 화면이라, 계획을 이미 된 일처럼 그려 두면
            그 자리에서 바로 문제가 된다.
          */}
          <p className="mt-5 text-[1.0625rem] font-extrabold text-ink">
            매장이 늘어나면 이렇게 됩니다
          </p>
          <DocLayers
            layers={[
              {
                label: "지금",
                tone: "teal",
                title: "본점 — 정통대왕쑥뜸원",
                desc: "여기서 쓰는 기준(관리주기 · 미방문 · 잔여 회차)이 곧 운영 표준이 된다",
              },
              {
                label: "지금",
                tone: "aqua",
                title: "지점 화면",
                desc: "지점별 고객 · 방문 · 매출을 나눠 보는 화면이 이미 있다 (지점 / 운영)",
              },
              {
                label: "다음",
                tone: "gold",
                future: true,
                title: "가맹점",
                desc: "본점의 기준을 그대로 받아 같은 방식으로 운영한다 — 새로 배울 것이 화면 하나뿐이다",
              },
              {
                label: "다음",
                tone: "gold",
                future: true,
                title: "본사에 모이는 기록",
                desc: "어느 프로그램이 어느 지역에서 재방문으로 이어지는지가 모인다. 그 답으로 서비스를 다시 고친다",
              },
            ]}
          />
          <DocQuote tone="gold">
            더 얹기 전에, 지금 있는 것이 매일 실제로 쓰이는지가 먼저입니다.
            쓰이지 않는 기능 위에 무엇을 얹어도 쓰이지 않습니다.
          </DocQuote>
        </DocSection>

        {/* 돌아가는 길 — 문서 끝에서 길을 잃지 않게 */}
        <div className="card-hero rise-in !p-6">
          <p className="flex items-center gap-2 text-[0.8125rem] font-extrabold uppercase tracking-wider text-aqua-300">
            <SparkIcon className="h-4 w-4" />
            여기까지입니다
          </p>
          <p className="mt-2 text-[1.25rem] font-extrabold leading-tight text-white">
            이제 실제 화면에서 확인해 보십시오
          </p>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-deep-sub">
            위에서 이야기한 것들이 어느 화면에 있는지 바로 이어집니다.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/">
              <Button variant="on-dark" size="lg">
                대시보드로 돌아가기
                <ChevronRightIcon className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/intro">
              <Button variant="on-dark" size="lg">
                기획의도 읽기
              </Button>
            </Link>
          </div>
        </div>

        <DocLinks
          items={[
            {
              href: "/briefing",
              label: "오늘의 실행 브리핑",
              desc: "10절에서 이야기한 아침 화면",
              tone: "aqua",
            },
            {
              href: "/customers",
              label: "고객",
              desc: "07절 — 순서가 만들어지는 자리",
              tone: "sky",
            },
            {
              href: "/settings#set-rules",
              label: "설정 · 고객관리 기준",
              desc: "07절 — 그 순서를 매장이 정하는 자리",
              tone: "teal",
            },
            {
              href: "/analytics",
              label: "AX 도입성과",
              desc: "11절 — 실제 재등록만 세는 자리",
              tone: "emerald",
            },
            {
              href: "/welcome",
              label: "고객 화면",
              desc: "06절 — 고객이 보는 쪽",
              tone: "gold",
            },
            {
              href: "/guide",
              label: "사용 가이드",
              desc: "화면별 사용법이 필요하실 때",
              tone: "violet",
            },
          ]}
        />
      </div>
    </DocPage>
  );
}
