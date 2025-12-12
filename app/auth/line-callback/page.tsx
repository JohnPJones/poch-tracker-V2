import { Suspense } from 'react';
import LineCallbackClient from './client';

function Loading() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-lg text-gray-700">กำลังโหลด...</p>
      </div>
    </div>
  );
}

export default function LineCallbackPage() {
  return (
    <Suspense fallback={<Loading />}>
      <LineCallbackClient />
    </Suspense>
  );
}