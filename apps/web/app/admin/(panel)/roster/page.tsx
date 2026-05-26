import { redirect } from 'next/navigation';

/** Legacy URL — member management is unified on the Members page. */
export default function ElecomRosterRedirectPage() {
  redirect('/admin/voters?filter=pending');
}
