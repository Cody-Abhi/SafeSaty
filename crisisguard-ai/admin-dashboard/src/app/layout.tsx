import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import AppShell from '@/components/AppShell';

export const metadata: Metadata = {
  title: 'CrisisGuard AI — Command Center',
  description:
    'AI-Powered Emergency Response & Crisis Coordination Dashboard for Hospitality Ecosystems',
  keywords: ['crisis management', 'emergency response', 'hotel safety', 'real-time monitoring'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="font-body antialiased bg-surface">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
