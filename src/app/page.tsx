import { redirect } from 'next/navigation';

// Entry point: send everyone to the dashboard, which enforces auth (and
// bounces to /login if there's no valid session).
export default function Home() {
  redirect('/dashboard');
}
