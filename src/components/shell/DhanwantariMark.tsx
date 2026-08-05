import React from 'react';

/**
 * Signature mark: three ripple arcs radiating from a single point — reads as
 * a sound wave (hearing/ENT) and as a ripple from a dropped kalash (Dhanwantari).
 * Deliberately not a literal ear or a literal pot — a mark that works at 20px.
 */
export const DhanwantariMark: React.FC<{ className?: string; animated?: boolean }> = ({
  className = 'w-8 h-8',
  animated = false,
}) => (
  <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
    <circle cx="12" cy="20" r="3" className="fill-brass-400" />
    <path
      d="M17 20a5 5 0 0 1 5 -5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className={animated ? 'animate-pulse' : ''}
    />
    <path
      d="M17 26a11 11 0 0 0 11 -11"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      opacity="0.7"
    />
    <path
      d="M17 32a17 17 0 0 0 17 -17"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      opacity="0.4"
    />
  </svg>
);
