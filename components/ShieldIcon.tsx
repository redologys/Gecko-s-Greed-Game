
import React from 'react';

const ShieldIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    className={className || "h-6 w-6"} 
    viewBox="0 0 20 20" 
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M10 2L3 5v5c0 5 7 7 7 7s7-2 7-7V5l-7-3z" />
  </svg>
);

export default ShieldIcon;
