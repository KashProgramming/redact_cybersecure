import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-[#515151]/10 border border-[#515151]/30 rounded-2xl p-6 backdrop-blur-sm hover:border-[#6a6a6a]/50 transition duration-300",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className, ...props }: CardProps) {
  return (
    <div className={cn("mb-4", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className, ...props }: CardProps) {
  return (
    <h3 className={cn("text-xl font-bold text-white", className)} {...props}>
      {children}
    </h3>
  );
}

export function CardContent({ children, className, ...props }: CardProps) {
  return (
    <div className={cn("text-gray-300", className)} {...props}>
      {children}
    </div>
  );
}
