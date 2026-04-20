import { Button, Badge, Text } from "@shopenup/ui";
import { CheckCircleSolid } from "@shopenup/icons";
import type { InvoiceTemplate } from './template-types';

interface TemplateCardProps {
  template: InvoiceTemplate;
  isSelected: boolean;
  onSelect: (templateId: string) => void;
  onPreview: (templateId: string) => void;
}

export const TemplateCard = ({ 
  template, 
  isSelected, 
  onSelect,
  onPreview 
}: TemplateCardProps) => {
  return (
    <div 
      className={`
        relative border-2 rounded-lg p-5 transition-all cursor-pointer max-w-xs
        ${isSelected 
          ? 'border-ui-fg-interactive bg-ui-bg-subtle shadow-md' 
          : 'border-ui-border-base bg-ui-bg-base hover:border-ui-border-strong'
        }
      `}
      onClick={() => onSelect(template.id)}
    >
      {/* Selected Badge */}
      {isSelected && (
        <div className="absolute top-4 right-4">
          <Badge size="small" className="bg-ui-tag-green-bg text-ui-tag-green-text border-ui-tag-green-border">
            <CheckCircleSolid className="h-3 w-3 mr-1" />
            Selected
          </Badge>
        </div>
      )}

      {/* Template Preview */}
      <div 
        className="mb-3 h-32 rounded-lg border-2 border-ui-border-base flex items-center justify-center overflow-hidden"
        style={{ 
          background: `linear-gradient(135deg, ${template.colorScheme.primary}15 0%, ${template.colorScheme.secondary}15 100%)` 
        }}
      >
        {/* Mock Invoice Preview */}
        <div className="w-full h-full p-4 scale-75 transform">
          <div className="bg-white rounded shadow-lg p-4 h-full">
            <div className="flex justify-between items-start mb-3">
              <div className="flex gap-2 items-start">
                {template.hasLogo && (
                  <div 
                    className="h-8 w-8 rounded flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: template.colorScheme.primary }}
                  >
                    L
                  </div>
                )}
                <div>
                  <div 
                    className="h-3 max-w-32 rounded mb-2" 
                    style={{ backgroundColor: template.colorScheme.primary }}
                  ></div>
                  <div className="h-2 w-32 bg-gray-200 rounded"></div>
                </div>
              </div>
              <div 
                className="h-6 max-w-16 rounded"
                style={{ backgroundColor: template.colorScheme.primary }}
              ></div>
            </div>
            <div className="space-y-2 mb-3">
              <div className="h-2 w-full bg-gray-100 rounded"></div>
              <div className="h-2 w-3/4 bg-gray-100 rounded"></div>
            </div>
            <div 
              className="h-12 rounded mb-2"
              style={{ backgroundColor: `${template.colorScheme.primary}20` }}
            ></div>
            <div className="space-y-1">
              <div className="h-2 w-full bg-gray-100 rounded"></div>
              <div className="h-2 w-full bg-gray-100 rounded"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Template Info */}
      <div className="space-y-2.5">
        <div>
          <h3 className="text-sm font-semibold text-ui-fg-base mb-1">
            {template.name}
          </h3>
          <Text size="xsmall" className="text-ui-fg-subtle">
            {template.description}
          </Text>
        </div>

        {/* Features */}
        <div className="flex flex-wrap gap-1.5">
          {template.features.map((feature, index) => (
            <Badge 
              key={index} 
              size="xsmall"
              className="bg-ui-bg-subtle text-ui-fg-muted border border-ui-border-base"
            >
              {feature}
            </Badge>
          ))}
        </div>

        {/* Color Scheme */}
        <div className="flex items-center gap-2">
          <Text size="xsmall" className="text-ui-fg-muted">Colors:</Text>
          <div className="flex gap-1">
            <div 
              className="w-5 h-5 rounded border border-ui-border-base"
              style={{ backgroundColor: template.colorScheme.primary }}
              title="Primary"
            ></div>
            <div 
              className="w-5 h-5 rounded border border-ui-border-base"
              style={{ backgroundColor: template.colorScheme.secondary }}
              title="Secondary"
            ></div>
            <div 
              className="w-5 h-5 rounded border border-ui-border-base"
              style={{ backgroundColor: template.colorScheme.accent }}
              title="Accent"
            ></div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-1.5 pt-1.5">
          <Button
            size="small"
            variant={isSelected ? "primary" : "secondary"}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(template.id);
            }}
            className="flex-1 text-xs"
          >
            {isSelected ? 'Selected' : 'Select'}
          </Button>
          <Button
            size="small"
            variant="transparent"
            onClick={(e) => {
              e.stopPropagation();
              onPreview(template.id);
            }}
            className="text-xs"
          >
            Preview
          </Button>
        </div>
      </div>
    </div>
  );
};

