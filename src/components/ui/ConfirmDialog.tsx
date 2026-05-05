import React from 'react';
import { Button } from './Forms';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-xl shadow-lg max-w-sm w-full p-6 animate-in zoom-in-95">
        <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 text-sm mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <Button type="button" variant="ghost" onClick={onCancel} className="h-10 px-4">{cancelText}</Button>
          <Button type="button" variant="danger" onClick={onConfirm} className="h-10 px-4">{confirmText}</Button>
        </div>
      </div>
    </div>
  );
}
