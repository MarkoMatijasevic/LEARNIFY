import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div 
      className={`spinner ${sizeClasses[size]} ${className}`}
      style={{
        border: '2px solid #e5e7eb',
        borderTop: '2px solid #ef4444',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }}
    />
  );
};

export default LoadingSpinner;