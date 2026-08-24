/**
 * 직원 · 관리자 화면의 껍데기
 *
 * 사이드바 · 하단 네비 · 고객 검색 · 기록 시트가 모두 여기 붙는다.
 * 고객 포털(MY WELLNESS)은 이 껍데기를 쓰지 않는다. 그래서 route group 으로
 * 나눠 두었다 — 괄호 이름은 주소에 나타나지 않으므로 기존 URL 은 그대로다.
 */

import { AppProvider } from "@/lib/data/store";
import { StaffLinkProvider } from "@/lib/supabase/StaffLink";
import AppShell from "@/components/layout/AppShell";
import { ToastProvider } from "@/components/ui/toast";
import { TourProvider } from "@/components/docs/Tour";

export default function StaffLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AppProvider>
      {/* 매장 계정을 연결했을 때만 서버와 오간다. 연결 전에는 아무 일도 없다 */}
      <StaffLinkProvider>
        <ToastProvider>
          <TourProvider>
            <AppShell>{children}</AppShell>
          </TourProvider>
        </ToastProvider>
      </StaffLinkProvider>
    </AppProvider>
  );
}
