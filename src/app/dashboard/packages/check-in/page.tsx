'use client';

import dynamic from 'next/dynamic';

const CheckInPage = dynamic(
  () => import('./_client'),
  { ssr: false, loading: () => <div className="flex h-screen items-center justify-center"><p>Loading...</p></div> }
);

export default function Page() {
  return <CheckInPage />;
}
