import { useState, useEffect, useMemo } from 'react';
import { Text, Table, Button, toast, usePrompt } from "@shopenup/ui";
import { Trash } from "@shopenup/icons";

const API_BASE_URL = import.meta.env.VITE_SHOPENUP_BACKEND_URL || '';

interface SlotOverride {
  id: string;
  startDate: string;
  endDate: string;
  duration: number;
  workingDays: string[];
  workingHoursFrom: string;
  workingHoursTo: string;
  selectedSlots: string[];
  status: 'active' | 'inactive';
  reason?: string;
}

export const OverrideHistory = () => {
  const [fetching, setFetching] = useState(false);
  const [overrides, setOverrides] = useState<SlotOverride[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const prompt = usePrompt();

  useEffect(() => {
    fetchOverrides();
  }, []);

  const fetchOverrides = async () => {
    setFetching(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/appointments/slot-overrides`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setOverrides(data.overrides || []);
      }
    } catch (error) {
      console.error('Error fetching overrides:', error);
      toast.error('Error', { description: 'Failed to fetch override history' });
    } finally {
      setFetching(false);
    }
  };

  // Fetch count of affected appointments that will be cancelled
  const fetchAffectedSlotsCount = async (fromDate: string, toDate: string): Promise<number> => {
    try {
      const params = new URLSearchParams();
      params.append('dateFrom', fromDate);
      params.append('dateTo', toDate);
      
      const response = await fetch(`${API_BASE_URL}/admin/appointments?${params.toString()}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const appointments = data.appointments || [];
        // Filter out cancelled, done, and completed appointments - only count active appointments
        const activeAppointments = appointments.filter(
          (apt: any) => 
            apt.status !== 'cancelled' && 
            apt.status !== 'canceled' && 
            apt.status !== 'done' && 
            apt.status !== 'completed'
        );
        return activeAppointments.length;
      }
      return 0;
    } catch (error) {
      console.error('Error fetching affected slots count:', error);
      return 0;
    }
  };

  // Sort overrides by startDate descending (latest first)
  const sortedOverrides = useMemo(() => {
    return [...overrides]
      .filter(o => o.status !== 'inactive')
      .sort((a, b) => {
        const dateA = new Date(a.startDate).getTime();
        const dateB = new Date(b.startDate).getTime();
        return dateB - dateA; // Descending order (latest first)
      });
  }, [overrides]);

  const handleDelete = async (id: string) => {
    const override = overrides.find(o => o.id === id);
    if (!override) return;

    const startDateStr = override.startDate.split('T')[0];
    const endDateStr = override.endDate.split('T')[0];

    // Fetch count of affected appointments
    const count = await fetchAffectedSlotsCount(startDateStr, endDateStr);
    
    const description = `This will delete override slots and regenerate master slots for the date range.\n\nThis will fail if override slots have active bookings.`;
    const fullDescription = count > 0
      ? `${description}\n\n⚠️ ${count} appointment${count !== 1 ? 's' : ''} will be cancelled.`
      : description;
    
    const res = await prompt({
      title: 'Delete Override',
      description: fullDescription,
      confirmText: 'Delete',
      cancelText: 'Cancel',
    });

    if (!res) {
      return;
    }

    setDeletingId(id);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/appointments/slot-overrides/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete override');
      }

      toast.success('Success', { description: 'Override deleted successfully' });
      fetchOverrides();
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to delete override',
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-6">
        {/* <div className="flex items-center justify-between mb-4">
          <Heading level="h3">Override History</Heading>
          <Button variant="secondary" size="small" onClick={fetchOverrides} disabled={fetching}>
            {fetching ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div> */}
        {fetching && overrides.length === 0 ? (
          <Text className="text-ui-fg-subtle">Loading override history...</Text>
        ) : sortedOverrides.length === 0 ? (
          <Text className="text-ui-fg-subtle">No override history found</Text>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Date Range</Table.HeaderCell>
                  <Table.HeaderCell>Working Hours</Table.HeaderCell>
                  <Table.HeaderCell>Status</Table.HeaderCell>
                  <Table.HeaderCell>Reason</Table.HeaderCell>
                  <Table.HeaderCell>Action</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {sortedOverrides.map((override) => (
                  <Table.Row key={override.id}>
                    <Table.Cell>
                      {new Date(override.startDate).toLocaleDateString()} - {new Date(override.endDate).toLocaleDateString()}
                    </Table.Cell>
                    <Table.Cell>
                      {override.workingHoursFrom} - {override.workingHoursTo}
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="small" className="text-green-600">
                        Overridden
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="small" className="text-ui-fg-subtle">
                        {override.reason || '-'}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => handleDelete(override.id)}
                        disabled={deletingId === override.id}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};

