import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ size = 'md', message = '' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 p-4">
      <Loader2 className={`${sizeClasses[size] || sizeClasses.md} text-indigo-500 animate-spin`} />
      {message && <p className="text-slate-400 text-sm animate-pulse">{message}</p>}
    </div>
  );
}
