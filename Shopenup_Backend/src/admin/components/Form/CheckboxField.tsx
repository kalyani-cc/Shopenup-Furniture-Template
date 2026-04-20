import { Label, clx } from '@shopenup/ui';
import { useController, ControllerRenderProps, FieldPath, FieldValues } from 'react-hook-form';

export interface CheckboxFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> {
  className?: string;
  name: TName;
  label?: string;
  labelProps?: React.ComponentProps<typeof Label>;
  checkboxProps?: Omit<
    React.ComponentProps<'input'>,
    'name' | 'id' | 'type' | keyof ControllerRenderProps
  >;
  isRequired?: boolean;
}

export const CheckboxField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  className,
  name,
  label,
  labelProps,
  checkboxProps,
  isRequired,
}: CheckboxFieldProps<TFieldValues, TName>) => {
  const { field, fieldState } = useController<TFieldValues, TName>({
    name,
  });

  return (
    <div className={className}>
      <div className="flex items-center space-x-2">
        <input
          {...checkboxProps}
          type="checkbox"
          id={name}
          name={field.name}
          checked={field.value || false}
          onChange={field.onChange}
          onBlur={field.onBlur}
          ref={field.ref}
          className={clx(
            'rounded border-gray-700 text-blue-600 focus:ring-blue-500',
            checkboxProps?.className
          )}
        />
        {typeof label !== 'undefined' && (
          <Label
            {...labelProps}
            htmlFor={name}
            className={clx('text-sm font-medium text-gray-700 dark:text-gray-300', labelProps?.className)}
          >
            {label}
            {isRequired ? <span className="text-red-primary">*</span> : ''}
          </Label>
        )}
      </div>
      {fieldState.error && (
        <div className="text-red-primary text-sm mt-1">
          {fieldState.error.message}
        </div>
      )}
    </div>
  );
};
