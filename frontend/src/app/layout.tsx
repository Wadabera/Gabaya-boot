import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { ErrorBoundary } from '@/components/error-boundary';

export const metadata: Metadata = {
  title: 'ገበያ ቡት (Gebeya Boot) - Telegram Shop & AI Assistant',
  description: 'Telegram E-commerce & Grounded AI Assistant Platform for Ethiopian Merchants',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="am">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-brand-500 selection:text-white">
        <ErrorBoundary>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
