"use client";
import { useMemo } from "react";

interface RadialProgressProps {
  current: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

const RadialProgress = ({ 
  current, 
  max, 
  size = 200, 
  strokeWidth = 12,
  label = "Daily Limit" 
}: RadialProgressProps) => {
  const percentage = useMemo(() => Math.min((current / max) * 100, 100), [current, max]);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;
  
  const getColor = () => {
    if (percentage >= 90) return "hsl(var(--destructive))";
    if (percentage >= 75) return "hsl(var(--warning))";
    return "hsl(var(--primary))";
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
          style={{
            filter: `drop-shadow(0 0 8px ${getColor()})`,
          }}
        />
      </svg>
      
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
        <span className="text-3xl font-bold" style={{ color: getColor() }}>
          {percentage.toFixed(0)}%
        </span>
        <div className="text-sm text-muted-foreground mt-1">
          <span className="font-semibold text-foreground">{formatCurrency(current)}</span>
          <span> / {formatCurrency(max)}</span>
        </div>
      </div>
    </div>
  );
};

export default RadialProgress;