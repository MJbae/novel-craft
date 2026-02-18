import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/sonner';
import { AppLayout } from '@/components/layout/app-layout';
import './globals.css';

export const metadata: Metadata = {
  title: 'Novel Craft',
  description: '웹소설 생성·편집 서비스',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="antialiased">
        <AppLayout>{children}</AppLayout>
        <Toaster />
      </body>
    </html>
  );
}
