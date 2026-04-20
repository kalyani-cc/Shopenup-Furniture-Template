import React from 'react';
import { Button, Text, clx } from '@shopenup/ui';
import { ExclamationCircle, CheckCircle, XCircle } from '@shopenup/icons';

export interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'success' | 'info';
  isLoading?: boolean;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'warning',
  isLoading = false,
}) => {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <XCircle className="w-8 h-8 text-red-500" />,
          confirmButtonClass: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
        };
      case 'success':
        return {
          icon: <CheckCircle className="w-8 h-8 text-green-500" />,
          confirmButtonClass: 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500',
        };
      case 'info':
        return {
          icon: <ExclamationCircle className="w-8 h-8 text-blue-500" />,
          confirmButtonClass: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
        };
      default: // warning
        return {
          icon: <ExclamationCircle className="w-8 h-8 text-yellow-500" />,
          confirmButtonClass: 'bg-yellow-600 hover:bg-yellow-700 text-white focus:ring-yellow-500',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div className={clx(
        'relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full',
        'border border-gray-200 dark:border-gray-700',
        'transform transition-all duration-200 ease-out',
        'animate-in fade-in-0 zoom-in-95 duration-200'
      )}>
        {/* Header with icon */}
        <div className="flex items-start space-x-4 p-6 pb-4">
          <div className="flex-shrink-0 mt-1">
            {styles.icon}
          </div>
          
          <div className="flex-1 min-w-0">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {title}
            </Text>
            <Text className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              {message}
            </Text>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex justify-end space-x-3 px-6 py-4 bg-gray-50 dark:bg-gray-700/50 rounded-b-xl">
          <Button
            variant="transparent"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-600"
          >
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className={clx(
              'px-6 py-2 font-medium transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-offset-2',
              styles.confirmButtonClass,
              isLoading && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processing...</span>
              </div>
            ) : (
              confirmText
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;
