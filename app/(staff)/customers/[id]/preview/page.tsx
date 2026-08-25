"use client";

/**
 * 고객 화면 미리보기 (직원용)
 * ============================
 *
 * (staff) 그룹 안에 둔 것이 핵심이다. 그래서 이 화면도 직원 로그인 게이트를
 * 그대로 지난다 — 로그인하지 않았거나 직원이 아니면 애초에 들어오지 못한다.
 *
 * 고객 포털 route group 에 두지 않은 이유도 같다. 그쪽에 두면 "고객 화면인데
 * 직원도 볼 수 있는 자리" 가 생기고, 그 예외가 곧 구멍이 된다.
 *
 * 여기서 쓰는 자료는 직원 스토어(factsById)의 그 고객 한 명치뿐이다.
 * 고객 상세 화면이 이미 쓰고 있는 것과 똑같은 값이다.
 */

import { useParams } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import CustomerPortalPreview from "@/components/staff/CustomerPortalPreview";
import { Button, Card } from "@/components/ui";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { useStore } from "@/lib/data/store";

export default function CustomerPreviewPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { factsById, branches, settings } = useStore();

  const facts = id ? factsById.get(id) : undefined;

  if (!facts) {
    return (
      <div>
        <PageHeader title="고객 화면 미리보기" />
        <Card>
          <p className="text-[1rem] font-bold text-ink">
            고객을 찾지 못했습니다.
          </p>
          <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-sub">
            목록에서 다시 골라 주세요.
          </p>
          <Link href="/customers" className="mt-4 block">
            <Button variant="secondary">고객 목록으로</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const branchName =
    branches.find((b) => b.id === facts.customer.branchId)?.name ??
    settings.branchName;

  return (
    <div>
      <Link
        href={`/customers/${facts.customer.id}`}
        className="tap-line mb-2 inline-flex items-center gap-1 pr-2 text-sm font-bold text-ink-sub hover:text-aqua-700"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        고객 상세
      </Link>

      <PageHeader
        title="고객 화면 미리보기"
        description="이 고객의 MY WELLNESS 화면이 어떻게 보이는지 그대로 확인하실 수 있습니다."
      />

      <CustomerPortalPreview
        facts={facts}
        branchName={branchName}
        backHref={`/customers/${facts.customer.id}`}
      />
    </div>
  );
}
