export type TemplateId = 'with-logo' | 'without-logo';

export interface InvoiceTemplate {
  id: TemplateId;
  name: string;
  description?: string;
  preview: string; // Preview image or thumbnail
  features: string[];
  hasLogo: boolean;
  colorScheme: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

export const INVOICE_TEMPLATES: InvoiceTemplate[] = [
  {
    id: 'with-logo',
    name: 'With Logo',
    // description: 'Invoice with company logo and professional branding',
    preview: 'with-logo-preview',
    features: ['Company logo', 'Professional header', 'Brand identity', 'Traditional styling'],
    hasLogo: true,
    colorScheme: {
      primary: '#CD8573',
      secondary: '#666666',
      accent: '#333333',
    },
  },
  {
    id: 'without-logo',
    name: 'Without Logo',
    // description: 'Clean invoice design without logo',
    preview: 'without-logo-preview',
    features: ['Text-only header', 'Minimal branding', 'Clean layout', 'Professional look'],
    hasLogo: false,
    colorScheme: {
      primary: '#CD8573',
      secondary: '#666666',
      accent: '#333333',
    },
  },
];

