// src/components/LoadingSpinner.tsx

import { Loader2 } from "lucide-react";

export default function LoadingSpinner({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex flex-col h-full w-full items-center justify-center p-6 bg-gray-50">
      <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
      <p className="text-gray-500">{text}</p>
    </div>
  );
}