// src/app/(app)/assets/page.tsx
"use client";

import { Suspense } from 'react';
import AssetsView from './AssetsView';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function AssetsPage() {
  
  return (
    <Suspense fallback={<LoadingSpinner text="Loading assets page..." />}>
      <AssetsView />
    </Suspense>
  );
}