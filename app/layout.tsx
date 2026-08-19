import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProvider } from "@/lib/data/store";
import AppShell from "@/components/layout/AppShell";
import { ToastProvider } from "@/components/ui/toast";
import { TourProvider } from "@/components/docs/Tour";
import RootBoundary from "@/components/layout/RootBoundary";

export const metadata: Metadata = {
  title: "정통대왕쑥뜸원 AX Platform",
  description: "정통대왕쑥뜸원 웰니스 운영 AX 플랫폼",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F3F4F2",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        {/* 스토어보다 바깥 — 데이터를 읽다 생긴 오류까지 여기서 받는다 */}
        <RootBoundary>
          <AppProvider>
            <ToastProvider>
              <TourProvider>
                <AppShell>{children}</AppShell>
              </TourProvider>
            </ToastProvider>
          </AppProvider>
        </RootBoundary>
      </body>
    </html>
  );
}
