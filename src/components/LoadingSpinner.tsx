import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', text }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  return (
    <div className="flex items-center justify-center space-x-2">
      <div className={`animate-spin rounded-full border-b-2 border-accent ${sizeClasses[size]}`}></div>
      {text && <span className="text-accent">{text}</span>}
    </div>
  );
};

export default LoadingSpinner;
