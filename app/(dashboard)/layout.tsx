import type { ReactNode } from 'react';

import { DashboardLayout } from '../../components/layout/DashboardLayout';

interface DashboardRootLayoutProps {
  children: ReactNode;
}

export default function DashboardRootLayout({
  children,
}: DashboardRootLayoutProps) {
  return <DashboardLayout>{children}</DashboardLayout>;
}


