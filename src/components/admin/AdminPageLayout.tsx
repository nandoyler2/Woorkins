import React from 'react';
import { cn } from '@/lib/utils';

interface AdminPageLayoutProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function AdminPageLayout({ 
  title, 
  description, 
  children, 
  actions,
  className 
}: AdminPageLayoutProps) {
  return (
    <div className={cn(
      "min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-background",
      className
    )}>
      {/* Header com gradiente */}
      <div className="bg-gradient-to-r from-blue-900 via-teal-700 to-blue-900 text-white p-6 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">{title}</h1>
              {description && (
                <p className="text-blue-100 mt-2 text-sm sm:text-base">{description}</p>
              )}
            </div>
            {actions && (
              <div className="flex items-center gap-2">
                {actions}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-7xl mx-auto p-4 sm:p-6 animate-in fade-in duration-500">
        {children}
      </div>
    </div>
  );
}
