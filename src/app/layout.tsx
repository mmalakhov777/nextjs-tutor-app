import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import 'katex/dist/katex.min.css';
import Script from 'next/script';
import { FileProvider } from '@/contexts/FileContext';

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
    <html lang="en">
      <head>
        <link 
          rel="stylesheet" 
          href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css"
        />
        <link 
          rel="stylesheet" 
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
        />
        <Script 
          src="https://mystylus.ai/msd/msd-app-core.js"
          strategy="beforeInteractive"
        />
      </head>
      <body>
        <main>
          <FileProvider>
            {children}
          </FileProvider>
        </main>
      </body>
    </html>
  );
}
