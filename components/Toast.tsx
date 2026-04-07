import React from 'react';
import { X, AlertTriangle, Info, CheckCircle2, AlertCircle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
    id: string;
    type: ToastType;
    message: string;
    description?: string;
    onClose: (id: string) => void;
}

const Toast = ({ id, type, message, description, onClose }: ToastProps) => {
    const icons = {
        success: <CheckCircle2 className="text-emerald-500" size={24} />,
        error: <AlertCircle className="text-red-500" size={24} />,
        info: <Info className="text-blue-500" size={24} />,
        warning: <AlertTriangle className="text-amber-500" size={24} />,
    };

    const colors = {
        success: 'border-emerald-100 bg-emerald-50/50 dark:bg-emerald-900/10 dark:border-emerald-900/20',
        error: 'border-red-100 bg-red-50/50 dark:bg-red-900/10 dark:border-red-900/20',
        info: 'border-blue-100 bg-blue-50/50 dark:bg-blue-900/10 dark:border-blue-900/20',
        warning: 'border-amber-100 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-900/20',
    };

    return (
        <div className={`
      flex items-start gap-4 p-4 rounded-3xl border-2 shadow-2xl backdrop-blur-md 
      animate-scale-up transition-all duration-300 max-w-sm w-full
      ${colors[type]}
    `}>
            <div className="shrink-0 mt-0.5">
                {icons[type]}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none mb-1">
                    {message}
                </p>
                {description && (
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 leading-tight">
                        {description}
                    </p>
                )}
            </div>
            <button
                onClick={() => onClose(id)}
                className="shrink-0 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
                <X size={16} />
            </button>
        </div>
    );
};

export default Toast;
