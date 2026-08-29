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
import StaffGate from "@/components/layout/StaffGate";
import { ToastProvider } from "@/components/ui/toast";
import { TourProvider } from "@/components/docs/Tour";
import { DevicePreviewProvider } from "@/components/layout/DevicePreview";

export default function StaffLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AppProvider>
      {/* 매장 계정을 연결했을 때만 서버와 오간다. 연결 전에는 아무 일도 없다 */}
      <StaffLinkProvider>
        <ToastProvider>
          <TourProvider>
            {/* 로그인하지 않았으면 여기서 멈춘다 (Demo 는 지나간다) */}
            <StaffGate>
              {/*
                게이트 안쪽에 둔다. 미리보기는 지금 화면을 그대로 다시
                그리는 것이라, 로그인하지 않은 사람에게는 열릴 일이 없어야 한다.
              */}
              <DevicePreviewProvider>
                <AppShell>{children}</AppShell>
              </DevicePreviewProvider>
            </StaffGate>
          </TourProvider>
        </ToastProvider>
      </StaffLinkProvider>
    </AppProvider>
  );
}
