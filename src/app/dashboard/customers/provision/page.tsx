import { redirect } from 'next/navigation';

/**
 * The provision workflow has moved to the Platform Console (super-admin area).
 * Redirect any old bookmarks/links to the new location.
 */
export default function ProvisionRedirect() {
  redirect('/dashboard/super-admin/provision');
}
