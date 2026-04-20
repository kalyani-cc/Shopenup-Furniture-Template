import { 
  Badge,
  Text,
  DropdownMenu,
  Button,
  Table,
  Tooltip
} from "@shopenup/ui";
import { EllipsisHorizontal, DocumentText, InformationCircle, SquaresPlusSolid } from "@shopenup/icons";
import { Document } from '../../../hooks/api/use-document';

interface DocumentsTableProps {
  documents: Document[];
  isLoading: boolean;
  onView: (document: Document) => void;
  onDownload: (document: Document) => void;
  onViewInvoice?: (document: Document) => void;
}

export const DocumentsTable = ({ 
  documents, 
  isLoading, 
  onView,
  onDownload,
  onViewInvoice,
}: DocumentsTableProps) => {

  const getFulfillmentBadge = (status?: string) => {
    // Map API fulfillment statuses
    const normalizedStatus = status?.toLowerCase();
    
    switch (normalizedStatus) {
      case 'fulfilled':
      case 'shipped':
      case 'delivered':
      case 'returned':
        return (
          <Badge size="small" className="bg-ui-bg-subtle text-ui-fg-base border border-ui-border-base">
            <span className="inline-block w-2 h-2 bg-green-500 mr-1.5"></span>
            Fulfilled
          </Badge>
        );
      case 'not_fulfilled':
      case 'partially_fulfilled':
      case 'partially_shipped':
      case 'partially_delivered':
      case 'partially_returned':
      case 'requires_action':
        return (
          <Badge size="small" className="bg-ui-bg-subtle text-ui-fg-base border border-ui-border-base">
            <span className="inline-block w-2 h-2 bg-yellow-500 mr-1.5"></span>
            Pending
          </Badge>
        );
      case 'canceled':
      case 'cancelled':
        return (
          <Badge size="small" className="bg-ui-bg-subtle text-ui-fg-base border border-ui-border-base">
            <span className="inline-block w-2 h-2 bg-red-500 mr-1.5"></span>
            Cancelled
          </Badge>
        );
      default:
        return (
          <Badge size="small" className="bg-ui-bg-subtle text-ui-fg-base border border-ui-border-base">
            <span className="inline-block w-2 h-2 bg-gray-400 mr-1.5"></span>
            N/A
          </Badge>
        );
    }
  };

  const getPaymentBadge = (status?: string) => {
    // Map API payment statuses
    const normalizedStatus = status?.toLowerCase();
    
    switch (normalizedStatus) {
      case 'captured':
      case 'paid':
      case 'refunded':
        return (
          <Badge size="small" className="bg-ui-bg-subtle text-ui-fg-base border border-ui-border-base">
            <span className="inline-block w-2 h-2 bg-green-500 mr-1.5"></span>
            Paid
          </Badge>
        );
      case 'awaiting':
      case 'authorized':
      case 'partially_authorized':
      case 'partially_captured':
      case 'partially_refunded':
      case 'requires_action':
      case 'pending':
        return (
          <Badge size="small" className="bg-ui-bg-subtle text-ui-fg-base border border-ui-border-base">
            <span className="inline-block w-2 h-2 bg-yellow-500 mr-1.5"></span>
            Pending
          </Badge>
        );
      case 'not_paid':
      case 'canceled':
      case 'failed':
        return (
          <Badge size="small" className="bg-ui-bg-subtle text-ui-fg-base border border-ui-border-base">
            <span className="inline-block w-2 h-2 bg-red-500 mr-1.5"></span>
            Failed
          </Badge>
        );
      default:
        return (
          <Badge size="small" className="bg-ui-bg-subtle text-ui-fg-base border border-ui-border-base">
            <span className="inline-block w-2 h-2 bg-gray-400 mr-1.5"></span>
            N/A
          </Badge>
        );
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const formatCurrency = (amount?: number, currency: string = '₹'): string => {
    if (amount === undefined || amount === null) return 'N/A';
    return `${currency}${amount.toFixed(2)}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Text className="text-ui-fg-muted">Loading documents...</Text>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="p-4 bg-ui-bg-subtle rounded-full">
          <DocumentText className="h-8 w-8 text-ui-fg-muted" />
        </div>
        <div className="text-center">
          <Text className="font-medium text-ui-fg-base mb-1">No Documents Found</Text>
          <Text className="text-sm text-ui-fg-muted">
            There are no documents to display at the moment.
          </Text>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Order</Table.HeaderCell>
            <Table.HeaderCell>Date added</Table.HeaderCell>
            <Table.HeaderCell>Customer</Table.HeaderCell>
            <Table.HeaderCell>Fulfillment</Table.HeaderCell>
            <Table.HeaderCell>Payment status</Table.HeaderCell>
            <Table.HeaderCell>Total</Table.HeaderCell>
            <Table.HeaderCell>Tax</Table.HeaderCell>
            <Table.HeaderCell>Documents</Table.HeaderCell>
            <Table.HeaderCell className="text-right">
              <div className="flex items-center justify-end gap-1">
                Actions
                <Tooltip content="Manage order actions">
                  <InformationCircle className="h-4 w-4 text-ui-fg-muted" />
                </Tooltip>
              </div>
            </Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {documents.map((document) => (
            <Table.Row key={document.id} className="hover:bg-ui-bg-subtle-hover">
              <Table.Cell>
                <Text className="font-medium text-sm text-ui-fg-subtle">
                  #{document.display_id || document.id.substring(0, 8)}
                </Text>
              </Table.Cell>
              <Table.Cell>
                <Text className="text-sm text-ui-fg-subtle">
                  {formatDate(document.created_at)}
                </Text>
              </Table.Cell>
              <Table.Cell>
                <div className="flex flex-col">
                  <Text className="text-sm font-medium">
                    {document.customer_name || 'Unknown'}
                  </Text>
                  {document.customer_email && (
                    <Text className="text-xs text-ui-fg-muted">
                      {document.customer_email}
                    </Text>
                  )}
                </div>
              </Table.Cell>
              <Table.Cell>
                {getFulfillmentBadge(document.fulfillment_status)}
              </Table.Cell>
              <Table.Cell>
                {getPaymentBadge(document.payment_status)}
              </Table.Cell>
              <Table.Cell>
                <Text className="text-sm font-medium">
                  {formatCurrency(document.total_amount, document.currency || '₹')}
                </Text>
              </Table.Cell>
              <Table.Cell>
                <Text className="text-sm font-medium">
                  {formatCurrency(document.tax_amount, document.currency || '₹')}
                </Text>
              </Table.Cell>
              <Table.Cell>
                <div className="flex flex-col gap-0.5">
                  {(() => {
                    const normalizedStatus = document.fulfillment_status?.toLowerCase();
                    const isFulfilled = ['fulfilled', 'shipped', 'delivered', 'returned'].includes(normalizedStatus || '');
                    
                    // Check if invoice exists in backend database
                    const hasInvoice = !!document.invoice_number;
                    
                    // Only show if fulfilled AND invoice exists in database
                    if (isFulfilled && hasInvoice) {
                      const invoiceNumber = document.invoice_number;
                      return (
                        <button
                          onClick={() => onViewInvoice?.(document)}
                          className="text-sm text-ui-fg-interactive hover:text-ui-fg-interactive-hover hover:underline cursor-pointer text-left transition-colors"
                          title="Click to view invoice"
                        >
                          Invoice: {invoiceNumber}
                        </button>
                      );
                    }
                    
                    // Show empty state if not generated
                    return null;
                  })()}
                </div>
              </Table.Cell>
              <Table.Cell className="text-right">
                {/* Show tooltip and disable action button if order is not fulfilled */}
                {(() => {
                  const normalizedStatus = document.fulfillment_status?.toLowerCase();
                  const isFulfilled = ['fulfilled', 'shipped', 'delivered', 'returned'].includes(normalizedStatus || '');
                  
                  return !isFulfilled ? (
                    <Tooltip content="You can generate invoice after fulfillment">
                      <div className="inline-block">
                        <Button
                          variant="transparent"
                          size="small"
                          disabled
                          className="text-ui-fg-muted opacity-50 cursor-not-allowed"
                        >
                          <EllipsisHorizontal className="h-5 w-5" />
                        </Button>
                      </div>
                    </Tooltip>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenu.Trigger asChild>
                        <Button
                          variant="transparent"
                          size="small"
                          className="text-ui-fg-muted hover:text-ui-fg-base"
                        >
                          <EllipsisHorizontal className="h-5 w-5" />
                        </Button>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Content align="end">
                        <DropdownMenu.Item onClick={() => onView(document)}>
                          <DocumentText className="h-4 w-4 mr-2" />
                          Generate Invoice
                        </DropdownMenu.Item>
                        <DropdownMenu.Item onClick={() => onDownload(document)}>
                          <SquaresPlusSolid className="h-4 w-4 mr-2" />
                          Generate new packaging slip
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu>
                  );
                })()}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </div>
  );
};
