'use client';

import dynamic from 'next/dynamic';

const SettingsPage = dynamic(
  () => import('./_client'),
  { ssr: false, loading: () => <div className="flex h-screen items-center justify-center"><p>Loading settings...</p></div> }
);

export default function Page() {
  return <SettingsPage />;
}
