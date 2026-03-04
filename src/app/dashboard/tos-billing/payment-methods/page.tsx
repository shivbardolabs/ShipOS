'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Payment Methods have been moved into individual Customer records.
 * This page now redirects to the Customers list.
 *
 * @see BAR-392
 */
export default function PaymentMethodsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/customers');
  }, [router]);

  return (
    <div className="flex items-center justify-center py-24 text-surface-400 text-sm">
      Redirecting to Customers…
    </div>
  );
}
