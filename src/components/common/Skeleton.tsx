import React from 'react';
import clsx from 'clsx';

interface SkeletonProps {
  className?: string;
  count?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', count = 1 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={clsx(
            'animate-pulse bg-[#E1E8ED]/70 rounded-md',
            className || 'h-4 w-full'
          )}
          aria-hidden="true"
        />
      ))}
    </>
  );
};
