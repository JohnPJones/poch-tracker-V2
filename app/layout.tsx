import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';
import { Prompt } from 'next/font/google';

const prompt = Prompt({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['thai', 'latin'],
  display: 'swap',
  variable: '--font-prompt',
});

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
      <body className={prompt.variable}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}