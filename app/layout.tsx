import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProvider } from "@/lib/data/store";
import AppShell from "@/components/layout/AppShell";
import { ToastProvider } from "@/components/ui/toast";
import { TourProvider } from "@/components/docs/Tour";

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
        <AppProvider>
          <ToastProvider>
            <TourProvider>
              <AppShell>{children}</AppShell>
            </TourProvider>
          </ToastProvider>
        </AppProvider>
      </body>
    </html>
  );
}
