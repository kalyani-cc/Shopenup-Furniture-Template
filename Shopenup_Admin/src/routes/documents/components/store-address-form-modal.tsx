import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { useEffect } from 'react';
import { Button, Input, Label, Text } from "@shopenup/ui";
import { XMarkMini } from "@shopenup/icons";
import { CountrySelect } from '../../../components/inputs/country-select';
import { ProvinceSelect } from '../../../components/inputs/province-select';

const StoreAddressSchema = zod.object({
  company_name: zod.string().min(1, 'Company name is required'),
  first_name: zod.string().min(1, 'First name is required'),
  last_name: zod.string().min(1, 'Last name is required'),
  address_1: zod.string().min(1, 'Address is required'),
  address_2: zod.string().optional(),
  city: zod.string().min(1, 'City is required'),
  country_code: zod.string().min(2, 'Country is required'),
  province: zod.string().optional(),
  postal_code: zod.string().min(1, 'Postal code is required'),
  // phone: zod.string().min(1, 'Phone number is required'),
});

type StoreAddressFormData = zod.infer<typeof StoreAddressSchema>;

interface StoreAddressFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: StoreAddressFormData) => void;
  isLoading?: boolean;
  initialData?: StoreAddressFormData | null;
}

export const StoreAddressFormModal = ({ isOpen, onClose, onSave, isLoading = false, initialData }: StoreAddressFormModalProps) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<StoreAddressFormData>({
    resolver: zodResolver(StoreAddressSchema),
    defaultValues: {
      company_name: 'Akshar Ayurved',
      first_name: '',
      last_name: '',
      address_1: '',
      address_2: '',
      city: '',
      country_code: 'in',
      province: '',
      postal_code: '',
      // phone: '',
    },
  });

  // Update form when initialData changes
  useEffect(() => {
    if (initialData && isOpen) {
      reset({
        company_name: initialData.company_name || 'Akshar Ayurved',
        first_name: initialData.first_name || '',
        last_name: initialData.last_name || '',
        address_1: initialData.address_1 || '',
        address_2: initialData.address_2 || '',
        city: initialData.city || '',
        country_code: initialData.country_code || 'in',
        province: initialData.province || '',
        postal_code: initialData.postal_code || '',
      });
    }
  }, [initialData, isOpen, reset]);

  const countryCode = watch('country_code');

  const onSubmit = (data: StoreAddressFormData) => {
    onSave(data);
    // Modal will be closed by parent on successful save
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-ui-bg-base rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-ui-border-base sticky top-0 bg-ui-bg-base">
          <div>
            <h2 className="text-xl font-semibold text-ui-fg-base">Change Store Address</h2>
            <Text size="small" className="text-ui-fg-subtle">
              Update your store information and contact details
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
          {/* Company Name */}
          <div className="space-y-2">
            <Label htmlFor="company_name">
              Company Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="company_name"
              {...register('company_name')}
              placeholder="Enter company name"
            />
            {errors.company_name && (
              <Text size="small" className="text-red-500">
                {errors.company_name.message}
              </Text>
            )}
          </div>

          {/* First Name & Last Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">
                First Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="first_name"
                {...register('first_name')}
                placeholder="Enter first name"
              />
              {errors.first_name && (
                <Text size="small" className="text-red-500">
                  {errors.first_name.message}
                </Text>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">
                Last Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="last_name"
                {...register('last_name')}
                placeholder="Enter last name"
              />
              {errors.last_name && (
                <Text size="small" className="text-red-500">
                  {errors.last_name.message}
                </Text>
              )}
            </div>
          </div>

          {/* Address Line 1 & 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="address_1">
                Address Line 1 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="address_1"
                {...register('address_1')}
                placeholder="Enter address"
              />
              {errors.address_1 && (
                <Text size="small" className="text-red-500">
                  {errors.address_1.message}
                </Text>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address_2">Address Line 2</Label>
              <Input
                id="address_2"
                {...register('address_2')}
                placeholder="Enter address line 2 (optional)"
              />
            </div>
          </div>

          {/* City & Postal Code */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">
                City <span className="text-red-500">*</span>
              </Label>
              <Input
                id="city"
                {...register('city')}
                placeholder="Enter city"
              />
              {errors.city && (
                <Text size="small" className="text-red-500">
                  {errors.city.message}
                </Text>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="postal_code">
                Postal Code <span className="text-red-500">*</span>
              </Label>
              <Input
                id="postal_code"
                {...register('postal_code')}
                placeholder="Enter postal code"
              />
              {errors.postal_code && (
                <Text size="small" className="text-red-500">
                  {errors.postal_code.message}
                </Text>
              )}
            </div>
          </div>

          {/* Country & State */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="country_code">
                Country <span className="text-red-500">*</span>
              </Label>
              <CountrySelect
                value={countryCode}
                onChange={(e) => setValue('country_code', e.target.value)}
              />
              {errors.country_code && (
                <Text size="small" className="text-red-500">
                  {errors.country_code.message}
                </Text>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="province">State / Province</Label>
              <ProvinceSelect
                value={watch('province')}
                onChange={(e) => setValue('province', e.target.value)}
                country_code={countryCode || 'in'}
                valueAs="iso_2"
              />
            </div>
          </div>

          {/* Phone */}
          {/* <div className="space-y-2">
            <Label htmlFor="phone">
              Phone Number <span className="text-red-500">*</span>
            </Label>
            <Input
              id="phone"
              {...register('phone')}
              placeholder="Enter phone number"
              type="tel"
            />
            {errors.phone && (
              <Text size="small" className="text-red-500">
                {errors.phone.message}
              </Text>
            )}
          </div> */}

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-ui-border-base">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Address'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

