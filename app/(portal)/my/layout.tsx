import type { Metadata } from "next";
import { PortalProvider } from "@/lib/portal/store";
import PortalShell from "@/components/portal/PortalShell";
import PortalGate from "@/components/portal/PortalGate";
import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: "MY WELLNESS · 정통대왕쑥뜸원",
  description: "내 이용기록과 이용권을 확인하는 고객 화면",
};

/**
 * 고객 포털의 껍데기.
 *
 * 직원용 AppProvider 는 여기 없다. 고객 브라우저에 지점 전체 자료를
 * 내려받을 이유가 없기 때문이다. 고객은 PortalProvider 를 통해
 * 서버가 자기 몫으로 내려 준 것만 본다.
 */
export default function PortalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <PortalProvider>
      <ToastProvider>
        <PortalGate>
          <PortalShell>{children}</PortalShell>
        </PortalGate>
      </ToastProvider>
    </PortalProvider>
  );
}
