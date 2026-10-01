/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AppShell } from './components/AppShell';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { CustomersPage } from './pages/CustomersPage';
import { LoansPage } from './pages/LoansPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { DueDatesPage } from './pages/DueDatesPage';
import { ReportsPage } from './pages/ReportsPage';
import { HistoryPage } from './pages/HistoryPage';
import { GuidePage } from './pages/GuidePage';
import { SettingsPage } from './pages/SettingsPage';
import {
  FALLBACK_DRIVE_ICON_URL,
  OFFICIAL_ICON_URL,
} from './utils/formatters';

const MainRouter: React.FC = () => {
  const { user, authLoading, activeTab } = useApp();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <img
          src={OFFICIAL_ICON_URL}
          onError={(e) => {
            e.currentTarget.src = FALLBACK_DRIVE_ICON_URL;
          }}
          alt="KreditKu"
          className="w-20 h-20 rounded-3xl shadow-md border border-slate-200 animate-pulse"
        />
        <div className="mt-4 text-base font-bold text-slate-900">KreditKu</div>
        <div className="mt-1 text-xs text-slate-500">
          Memuat sistem keamanan & sinkronisasi cloud...
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <AppShell>
      {activeTab === 'dashboard' && <DashboardPage />}
      {activeTab === 'customers' && <CustomersPage />}
      {activeTab === 'loans' && <LoansPage />}
      {activeTab === 'payments' && <PaymentsPage />}
      {activeTab === 'duedates' && <DueDatesPage />}
      {activeTab === 'reports' && <ReportsPage />}
      {activeTab === 'history' && <HistoryPage />}
      {activeTab === 'guide' && <GuidePage />}
      {activeTab === 'settings' && <SettingsPage />}
    </AppShell>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainRouter />
    </AppProvider>
  );
}
