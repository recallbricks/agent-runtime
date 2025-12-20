import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RecallBricks System Monitor',
  description: 'Live visualization of your cognitive AI infrastructure',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
