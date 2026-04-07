import React from 'react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    type?: 'danger' | 'primary';
    isLoading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

const ConfirmModal = ({
    isOpen,
    title,
    message,
    confirmLabel = 'Confirmer',
    cancelLabel = 'Annuler',
    type = 'primary',
    isLoading = false,
    onConfirm,
    onCancel,
}: ConfirmModalProps) => {
    if (!isOpen) return null;

    const typeConfig = {
        danger: {
            btn: 'bg-red-600 hover:bg-red-700 shadow-red-500/20',
            icon: <AlertTriangle size={32} className="text-red-500" />,
            bg: 'bg-red-50 dark:bg-red-900/20'
        },
        primary: {
            btn: 'bg-primary-600 hover:bg-primary-700 shadow-primary-500/20',
            icon: <AlertTriangle size={32} className="text-primary-500" />,
            bg: 'bg-primary-50 dark:bg-primary-900/20'
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl animate-fade-in"
                onClick={() => !isLoading && onCancel()}
            />
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-2xl overflow-hidden animate-scale-up border border-slate-200 dark:border-slate-800">
                <div className="p-10 text-center">
                    <div className={`w-20 h-20 ${typeConfig[type].bg} rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner`}>
                        {typeConfig[type].icon}
                    </div>

                    <h2 className="text-2xl font-black dark:text-white uppercase tracking-tighter mb-4 px-4">
                        {title}
                    </h2>

                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400 leading-relaxed mb-10 px-4">
                        {message}
                    </p>

                    <div className="space-y-3">
                        <button
                            onClick={onConfirm}
                            disabled={isLoading}
                            className={`w-full text-white py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3 ${typeConfig[type].btn}`}
                        >
                            {isLoading && <Loader2 size={18} className="animate-spin" />}
                            {confirmLabel}
                        </button>
                        <button
                            onClick={onCancel}
                            disabled={isLoading}
                            className="w-full text-slate-400 hover:text-slate-600 py-4 font-black uppercase text-[10px] tracking-widest transition-all"
                        >
                            {cancelLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
