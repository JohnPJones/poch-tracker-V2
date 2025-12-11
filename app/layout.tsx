import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'ติดตามโภชนาการไต',
  description: 'แอพติดตามโปรตีนสำหรับผู้ป่วยโรคไต',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body style={{ fontFamily: "'Prompt', sans-serif" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}