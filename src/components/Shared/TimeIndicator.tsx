// src/components/Shared/TimeIndicator.tsx
import React from 'react';
import { formatTimeString } from '../../utils/dateUtils';

interface TimeIndicatorProps {
  top: number;
  currentTime: Date;
  showTimeLabel?: boolean;
}

export default function TimeIndicator({ top, currentTime, showTimeLabel = false }: TimeIndicatorProps) {
  return (
    <div className="absolute left-0 right-0 z-20" style={{ top: `${top}px` }}>
      <div className="relative h-px bg-red-500">
        <div className="absolute -left-1 -top-1 w-2.5 h-2.5 bg-red-500 rounded-full"></div>
        {showTimeLabel && (
          <div className="absolute -top-2.5 left-1 text-xs text-red-500 font-medium bg-white pr-1">
            {formatTimeString(currentTime.toTimeString())}
          </div>
        )}
      </div>
    </div>
  );
}
