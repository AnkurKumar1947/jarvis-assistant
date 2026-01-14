'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MainGridProps {
  leftPanel: ReactNode;
  centerPanel: ReactNode;
  rightPanel: ReactNode;
  className?: string;
}

export function MainGrid({ leftPanel, centerPanel, rightPanel, className }: MainGridProps) {
  return (
    <div className={cn('grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6', className)}>
      {/* Left Column */}
      <div className="lg:col-span-3 space-y-4">
        {leftPanel}
      </div>

      {/* Middle Column */}
      <div className="lg:col-span-5">
        {centerPanel}
      </div>

      {/* Right Column */}
      <div className="lg:col-span-4">
        {rightPanel}
      </div>
    </div>
  );
}

