import React, { useState, useRef, KeyboardEvent, FocusEvent } from 'react';
import { useController, useFormContext, FieldPath, FieldValues } from 'react-hook-form';
import { Label, clx } from '@shopenup/ui';
import { z } from 'zod';

export const tagInputSchema = z.array(z.string()).optional();

interface TagInputProps<T extends FieldValues> {
  name: FieldPath<T>;
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  isRequired?: boolean;
  labelProps?: React.ComponentProps<typeof Label>;
}

export const TagInput = <T extends FieldValues>({
  name,
  label,
  placeholder = 'Type a tag and press Enter',
  className = '',
  disabled = false,
  isRequired = false,
  labelProps,
}: TagInputProps<T>) => {
  const { control } = useFormContext<T>();
  const {
    field: { onChange, value },
    fieldState: { error },
  } = useController({
    name,
    control,
  });

  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const tags = (value as string[]) || [];

  const addTag = (tagText: string) => {
    const trimmedTag = tagText.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      const newTags = [...tags, trimmedTag];
      onChange(newTags);
    }
    setInputValue('');
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = tags.filter((tag: string) => tag !== tagToRemove);
    onChange(newTags);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      // Remove last tag if input is empty and backspace is pressed
      removeTag(tags[tags.length - 1]);
    }
  };

  const handleBlur = (_e: FocusEvent<HTMLInputElement>) => {
    // Add tag when input loses focus if there's text
    if (inputValue.trim()) {
      addTag(inputValue);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  return (
    <div className={className}>
      {typeof label !== 'undefined' && (
        <Label
          {...labelProps}
          htmlFor={name}
          className={clx('block mb-1', labelProps?.className)}
        >
          {label}
          {isRequired ? <span className="text-red-primary">*</span> : ''}
        </Label>
      )}
      
      <div className="relative">
        <div className={clx(
          'w-full rounded-md border px-2 py-[2px] transition-colors caret-ui-fg-base bg-ui-bg-field hover:bg-ui-bg-field-hover shadow-borders-base placeholder-ui-fg-muted text-ui-fg-base transition-fg txt-compact-small',
        //   'bg-ui-bg-component border-ui-border-base',
          'focus-within:shadow-borders-interactive-with-active disabled:text-ui-fg-disabled',
          
        )}>
          <div className="flex flex-wrap items-center gap-0.5 min-h-[26px]">
            {/* Tags */}
            {tags.map((tag: string, index: number) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-ui-bg-subtle text-ui-fg-subtle text-xs rounded-[4px] border border-ui-border-base"
              >
                <span className="text-ui-fg-subtle text-xs">{tag}</span>
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-0.5 text-ui-fg-muted hover:text-ui-fg-subtle transition-colors p-0.5 rounded-sm hover:bg-ui-bg-subtle"
                  disabled={disabled}
                >
                  <svg
                    className="w-2.5 h-2.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </span>
            ))}
            
            {/* Input */}
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              placeholder={tags.length === 0 ? placeholder : ''}
              disabled={disabled}
              className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-ui-fg-base placeholder-ui-fg-muted placeholder:txt-compact-small"
            />
          </div>
        </div>
      </div>
      
      {error && (
        <div className="text-red-primary text-sm mt-1">
          {error.message}
        </div>
      )}
    </div>
  );
};

export default TagInput;
