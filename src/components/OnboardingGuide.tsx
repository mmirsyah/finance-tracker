// src/components/OnboardingGuide.tsx

"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface OnboardingGuideProps {
  title: string;
  message: string;
  buttonText: string;
  buttonLink: string;
}

export default function OnboardingGuide({
  title,
  message,
  buttonText,
  buttonLink,
}: OnboardingGuideProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-blue-200">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">{title}</h2>
      <p className="text-gray-600 mb-6">{message}</p>
      <Link href={buttonLink}>
        <span className="inline-flex items-center gap-2 bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow">
          {buttonText}
          <ArrowRight size={16} />
        </span>
      </Link>
    </div>
  );
}