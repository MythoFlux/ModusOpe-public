import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { AlertTriangle, Check, X } from 'lucide-react';

export default function ConfirmationModal() {
  const { state, dispatch } = useApp();
  const { confirmationModal } = state;

  if (!confirmationModal.isOpen) {
    return null;
  }

  const handleConfirm = () => {
    confirmationModal.onConfirm?.();
    dispatch({ type: 'CLOSE_CONFIRMATION_MODAL' });
  };

  const handleCancel = () => {
    confirmationModal.onCancel?.();
    dispatch({ type: 'CLOSE_CONFIRMATION_MODAL' });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all">
        <div className="p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800">
            {confirmationModal.title || 'Vahvista toiminto'}
          </h3>
          <p className="text-gray-600 mt-3">
            {confirmationModal.message}
          </p>
        </div>
        <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-4 rounded-b-xl">
          <button
            onClick={handleCancel}
            className="px-6 py-2.5 text-gray-700 font-semibold bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4 inline mr-2" />
            Peruuta
          </button>
          <button
            onClick={handleConfirm}
            className="px-6 py-2.5 text-white font-semibold bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
          >
            <Check className="w-4 h-4 inline mr-2" />
            Vahvista
          </button>
        </div>
      </div>
    </div>
  );
}
