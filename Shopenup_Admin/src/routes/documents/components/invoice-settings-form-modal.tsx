import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { Button, Input, Label, Text } from "@shopenup/ui";
import { XMarkMini } from "@shopenup/icons";

const InvoiceSettingsSchema = zod.object({
  number_format: zod.string().min(1, 'Number format is required').refine(
    (val) => val.includes('{invoice_number}'),
    'Format must include {invoice_number}'
  ),
  forced_number: zod.string().optional(),
  next_invoice_number: zod.string().optional(),
});

type InvoiceSettingsFormData = zod.infer<typeof InvoiceSettingsSchema>;

interface InvoiceSettingsFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: InvoiceSettingsFormData) => void;
  isLoading?: boolean;
}

export const InvoiceSettingsFormModal = ({ isOpen, onClose, onSave, isLoading = false }: InvoiceSettingsFormModalProps) => {
  const [calculatedNextNumber, setCalculatedNextNumber] = useState<string>('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<InvoiceSettingsFormData>({
    resolver: zodResolver(InvoiceSettingsSchema),
    defaultValues: {
      number_format: '{invoice_number}',
      forced_number: '',
      next_invoice_number: '',
    },
  });

  const forcedNumber = watch('forced_number');
  const numberFormat = watch('number_format');

  // Calculate next invoice number based on forced number
  useEffect(() => {
    if (forcedNumber && numberFormat) {
      const nextNum = parseInt(forcedNumber) || 0;
      const formatted = numberFormat.replace('{invoice_number}', String(nextNum));
      setCalculatedNextNumber(formatted);
      setValue('next_invoice_number', formatted);
    } else if (numberFormat) {
      // Default to showing format with placeholder
      const formatted = numberFormat.replace('{invoice_number}', '001');
      setCalculatedNextNumber(formatted);
      setValue('next_invoice_number', formatted);
    }
  }, [forcedNumber, numberFormat, setValue]);

  const onSubmit = (data: InvoiceSettingsFormData) => {
    onSave(data);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-ui-bg-base rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-ui-border-base sticky top-0 bg-ui-bg-base">
          <div>
            <h2 className="text-xl font-semibold text-ui-fg-base">Invoice Settings</h2>
            <Text size="small" className="text-ui-fg-subtle">
              These settings will be applied for newly generated invoices.
            </Text>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-ui-bg-subtle rounded transition-colors"
          >
            <XMarkMini className="h-5 w-5 text-ui-fg-muted" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Number Format */}
          <div className="space-y-2">
            <Label htmlFor="number_format">
              Number format <span className="text-red-500">*</span>
            </Label>
            <Input
              id="number_format"
              {...register('number_format')}
              placeholder="e.g., INV-{invoice_number}"
            />
            <Text size="small" className="text-ui-fg-muted">
              Format must include {'{invoice_number}'}
            </Text>
            {errors.number_format && (
              <Text size="small" className="text-red-500">
                {errors.number_format.message}
              </Text>
            )}
          </div>

          {/* Forced Number */}
          <div className="space-y-2">
            <Label htmlFor="forced_number">Forced number</Label>
            <Input
              id="forced_number"
              type="number"
              {...register('forced_number')}
              placeholder="e.g., 1000"
            />
            <Text size="small" className="text-ui-fg-muted">
              It will auto-increment starting from this number.
            </Text>
            {errors.forced_number && (
              <Text size="small" className="text-red-500">
                {errors.forced_number.message}
              </Text>
            )}
          </div>

          {/* Next Invoice Number Preview */}
          <div className="space-y-2">
            <Label htmlFor="next_invoice_number">
              Your next invoice number will be:
            </Label>
            <Input
              id="next_invoice_number"
              {...register('next_invoice_number')}
              value={calculatedNextNumber}
              disabled
              className="bg-ui-bg-disabled cursor-not-allowed"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-ui-border-base">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

