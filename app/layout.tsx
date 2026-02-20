import type { Metadata } from 'next';
import './globals.css';
import { ensureAdminExists } from '@/lib/init-admin';
import { TimeoutChecker } from '@/components/TimeoutChecker';

export const metadata: Metadata = {
  title: 'MediFind - Medicine Reservation Platform',
  description: 'Find and reserve medicines from local pharmacies',
};

// Initialize admin account on server startup
if (typeof window === 'undefined') {
  ensureAdminExists().catch(console.error);
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <TimeoutChecker />
        {children}
      </body>
    </html>
  );
}
