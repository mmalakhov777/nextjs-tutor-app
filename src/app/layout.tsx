import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import './globals.css';
import Script from 'next/script';
import { FileProvider } from '@/contexts/FileContext';
import { ScenarioProvider } from '@/contexts/ScenarioContext';

// Optimize font loading with next/font
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'AI Tutoring Platform',
  description: 'An intelligent tutoring platform powered by AI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link 
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css"
        />
        <Script 
          src="https://mystylus.ai/msd/msd-app-core.js"
          strategy="afterInteractive"
        />
      </head>
      <body className="font-sans">
        <main>
          <FileProvider>
            <ScenarioProvider>
              {children}
            </ScenarioProvider>
          </FileProvider>
        </main>
      </body>
    </html>
  );
}
