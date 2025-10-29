import dynamic from 'next/dynamic';
import { cookies, headers } from 'next/headers';
import { Suspense } from 'react';

const PipecatInterview = dynamic(() => import('../../components/PipecatInterview'), { ssr: false });

export const metadata = { title: 'Voice Interview' };

function InterviewInner() {
  // Use URLSearchParams in client component; we pass through via key trick
  return (
    <PipecatInterview />
  );
}

export default function InterviewPage() {
  return (
    <main className="min-h-screen bg-white">
      <Suspense>
        <InterviewInner />
      </Suspense>
    </main>
  );
}
