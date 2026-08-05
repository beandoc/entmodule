import type { Metadata, Viewport } from 'next';
import './globals.css';
import { fontDisplay, fontSans, fontSansHi, fontMono } from '@/lib/fonts';
import { AppDataProvider } from '@/lib/app-data-context';
import { AppShell } from '@/components/shell/AppShell';

export const metadata: Metadata = {
  title: 'i-Dhanwantari ENT Patient Education & Recovery Portal',
  description: 'ABDM-aligned, HL7 v2 + FHIR R4 clinical patient education service for superspeciality ENT care pathways.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#0b132b',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fontDisplay.variable} ${fontSans.variable} ${fontSansHi.variable} ${fontMono.variable}`} suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="min-h-screen flex flex-col bg-paper-50 dark:bg-ink-950 text-slate-900 dark:text-slate-100 font-sans">
        <AppDataProvider>
          <AppShell>{children}</AppShell>
        </AppDataProvider>
      </body>
    </html>
  );
}
