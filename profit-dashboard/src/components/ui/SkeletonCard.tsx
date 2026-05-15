import React from 'react';

interface Props {
  height?: string;
  className?: string;
}

export function SkeletonCard({ height = 'h-24', className = '' }: Props) {
  return (
    <div className={`bg-[#1a1d2e] border border-white/[0.07] rounded-lg animate-pulse ${height} ${className}`} />
  );
}

export function SkeletonRow() {
  return (
    <div className="flex gap-3 items-center py-2">
      <div className="bg-[#2a2d3e] rounded h-4 w-24 animate-pulse" />
      <div className="bg-[#2a2d3e] rounded h-4 w-16 animate-pulse" />
      <div className="bg-[#2a2d3e] rounded h-4 w-20 animate-pulse" />
    </div>
  );
}
