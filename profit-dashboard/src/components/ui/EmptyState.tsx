import React from 'react';
import { InboxIcon } from 'lucide-react';

interface Props {
  message?: string;
}

export function EmptyState({ message = 'No data for this period' }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-[#64748b]">
      <InboxIcon size={32} strokeWidth={1.5} />
      <span className="text-sm font-sans">{message}</span>
    </div>
  );
}
