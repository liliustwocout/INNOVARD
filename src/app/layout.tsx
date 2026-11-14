import type { Metadata } from 'next';
import './globals.css';
import { AppProvider } from '@/context/AppContext';
import { AppShell } from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: 'INNOVARD — Quản lý Tiến độ & Cộng tác Đội nhóm',
  description:
    'Nền tảng theo dõi tiến độ thành viên, Daily Standup, báo cáo họp nhóm và lịch sự kiện trực quan cho các đội dự án INNOVARD.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="min-h-screen antialiased">
        <AppProvider>
          <AppShell>{children}</AppShell>
        </AppProvider>
      </body>
    </html>
  );
}
