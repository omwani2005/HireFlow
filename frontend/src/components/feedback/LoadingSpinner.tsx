import React from 'react';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  label,
  className,
}) => {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <div className={twMerge(clsx('flex items-center justify-center gap-2.5 text-teal-600', className))}>
      <Loader2 className={twMerge(clsx('animate-spin', sizes[size]))} />
      {label && <span className="text-sm font-medium text-slate-600">{label}</span>}
    </div>
  );
};
