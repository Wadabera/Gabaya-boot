import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export function LoadingSpinner({ size = 'md', text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-4',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`${sizeClasses[size]} border-brand-500 border-t-transparent rounded-full animate-spin`}
      />
      {text && <p className="text-sm text-slate-600">{text}</p>}
    </div>
  );
}

export function PageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <LoadingSpinner size="lg" text="Loading..." />
    </div>
  );
}

export function CardLoading() {
  return (
    <div className="p-6 rounded-2xl bg-white border border-slate-200 animate-pulse">
      <div className="h-4 bg-slate-200 rounded w-1/3 mb-4" />
      <div className="h-8 bg-slate-200 rounded w-2/3 mb-4" />
      <div className="h-4 bg-slate-200 rounded w-full mb-2" />
      <div className="h-4 bg-slate-200 rounded w-3/4" />
    </div>
  );
}
