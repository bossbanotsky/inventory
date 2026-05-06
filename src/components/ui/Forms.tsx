import React from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">{label}</label>}
        <input
          ref={ref}
          className={cn(
            "flex h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium transition-all shadow-sm",
            "placeholder:text-slate-400",
            "focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error ? "border-red-500 focus:ring-red-500/10 focus:border-red-500" : "",
            className
          )}
          {...props}
        />
        {error && <span className="text-[10px] text-red-500 font-bold ml-1 uppercase tracking-wider">{error}</span>}
      </div>
    );
  }
);
Input.displayName = 'Input';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string }>(
  ({ className, label, error, children, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">{label}</label>}
        <div className="relative">
          <select
            ref={ref}
            className={cn(
              "flex h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium transition-all shadow-sm appearance-none",
              "focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500",
              "disabled:cursor-not-allowed disabled:opacity-50",
              error ? "border-red-500 focus:ring-red-500/10 focus:border-red-500" : "",
              className
            )}
            {...props}
          >
            {children}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
        {error && <span className="text-[10px] text-red-500 font-bold ml-1 uppercase tracking-wider">{error}</span>}
      </div>
    );
  }
);
Select.displayName = 'Select';

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' }>(
  ({ className, variant = 'primary', ...props }, ref) => {
    const variants = {
      primary: "bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-500/20 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_10px_20px_-5px_rgba(0,0,0,0.1)]",
      secondary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500/20 shadow-blue-100/50 shadow-lg",
      danger: "bg-red-500 text-white hover:bg-red-600 focus:ring-red-500/20 shadow-red-100/50 shadow-lg",
      ghost: "bg-transparent text-slate-600 hover:bg-slate-50 focus:ring-slate-500/10",
      outline: "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 focus:ring-slate-500/10 shadow-sm",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-2xl text-sm font-bold transition-all focus:outline-none focus:ring-4 active:scale-[0.98]",
          "h-12 px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed",
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
