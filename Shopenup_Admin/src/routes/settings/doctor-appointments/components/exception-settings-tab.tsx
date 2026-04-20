import { useState, useEffect } from 'react';
import { Button, Input, Select, Checkbox, Text, Heading, Table, toast, FocusModal } from "@shopenup/ui";
import { useTranslation } from 'react-i18next';
import { PencilSquare, Trash } from "@shopenup/icons";
import { generateTimeSlots } from './utils/slot-generator';

const API_BASE_URL = import.meta.env.VITE_SHOPENUP_BACKEND_URL || '';

interface Exception {
  id: string;
  dateFrom: string;
  dateTo: string;
  duration: number;
  workingHoursFrom: string;
  workingHoursTo: string;
  recurring: boolean;
  selectedSlots: string[];
}

const DURATION_OPTIONS = [15, 30, 45, 60];

export const ExceptionSettingsTab = () => {
  const { t } = useTranslation();
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingException, setEditingException] = useState<Exception | null>(null);

  // Form state
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [duration, setDuration] = useState<number>(30);
  const [workingHoursFrom, setWorkingHoursFrom] = useState<string>('09:00 AM');
  const [workingHoursTo, setWorkingHoursTo] = useState<string>('06:00 PM');
  const [recurring, setRecurring] = useState<boolean>(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);

  // Fetch exceptions
  useEffect(() => {
    fetchExceptions();
  }, []);

  const fetchExceptions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/appointments/appointment-exception`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setExceptions(data.exceptions || []);
      }
    } catch (error) {
      console.error('Error fetching exceptions:', error);
    }
  };

  // Generate slots when duration or hours change
  useEffect(() => {
    if (workingHoursFrom && workingHoursTo && duration) {
      const slots = generateTimeSlots(workingHoursFrom, workingHoursTo, duration);
      setAvailableSlots(slots);
      if (!editingException) {
        setSelectedSlots([]);
      }
    }
  }, [duration, workingHoursFrom, workingHoursTo, editingException]);

  const handleOpenModal = (exception?: Exception) => {
    if (exception) {
      setEditingException(exception);
      setDateFrom(exception.dateFrom);
      setDateTo(exception.dateTo);
      setDuration(exception.duration);
      setWorkingHoursFrom(exception.workingHoursFrom);
      setWorkingHoursTo(exception.workingHoursTo);
      setRecurring(exception.recurring);
      setSelectedSlots(exception.selectedSlots || []);
    } else {
      setEditingException(null);
      resetForm();
    }
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setDateFrom('');
    setDateTo('');
    setDuration(30);
    setWorkingHoursFrom('09:00 AM');
    setWorkingHoursTo('06:00 PM');
    setRecurring(false);
    setSelectedSlots([]);
  };

  const handleSlotToggle = (slot: string) => {
    setSelectedSlots(prev =>
      prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]
    );
  };

  const handleSelectAll = () => {
    setSelectedSlots([...availableSlots]);
  };

  const handleDeselectAll = () => {
    setSelectedSlots([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!dateFrom || !dateTo) {
      toast.error('Error', { description: 'Please select date range' });
      return;
    }

    if (selectedSlots.length === 0) {
      toast.error('Error', { description: 'Please select at least one time slot' });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        dateFrom,
        dateTo,
        duration: parseInt(String(duration)),
        workingHoursFrom,
        workingHoursTo,
        recurring,
        selectedSlots,
      };

      const url = editingException
        ? `${API_BASE_URL}/admin/appointments/appointment-exception?id=${editingException.id}`
        : `${API_BASE_URL}/admin/appointments/appointment-exception`;

      const method = editingException ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to save exception');
      }

      toast.success('Success', {
        description: editingException ? 'Exception updated successfully' : 'Exception created successfully',
      });

      setIsModalOpen(false);
      resetForm();
      fetchExceptions();
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to save exception',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (exceptionId: string) => {
    if (!confirm('Are you sure you want to delete this exception?')) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/appointments/appointment-exception?id=${exceptionId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete exception');
      }

      toast.success('Success', { description: 'Exception deleted successfully' });
      fetchExceptions();
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to delete exception',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Heading level="h3">{t('doctorAppointments.exceptionSettings.title')}</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {t('doctorAppointments.exceptionSettings.description')}
          </Text>
        </div>
        <Button onClick={() => handleOpenModal()}>
          {t('doctorAppointments.exceptionSettings.addException')}
        </Button>
      </div>

      {/* Exceptions Table */}
      {exceptions.length === 0 ? (
        <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-8 text-center">
          <Text className="text-ui-fg-subtle">
            {t('doctorAppointments.exceptionSettings.noExceptions')}
          </Text>
        </div>
      ) : (
        <div className="bg-ui-bg-base border border-ui-border-base rounded-lg overflow-hidden">
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Date Range</Table.HeaderCell>
                <Table.HeaderCell>Duration</Table.HeaderCell>
                <Table.HeaderCell>Working Hours</Table.HeaderCell>
                <Table.HeaderCell>Recurring</Table.HeaderCell>
                <Table.HeaderCell className="text-right">Actions</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {exceptions.map((exception) => (
                <Table.Row key={exception.id}>
                  <Table.Cell>
                    {exception.dateFrom} - {exception.dateTo}
                  </Table.Cell>
                  <Table.Cell>{exception.duration} min</Table.Cell>
                  <Table.Cell>
                    {exception.workingHoursFrom} - {exception.workingHoursTo}
                  </Table.Cell>
                  <Table.Cell>{exception.recurring ? 'Yes' : 'No'}</Table.Cell>
                  <Table.Cell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="transparent"
                        size="small"
                        onClick={() => handleOpenModal(exception)}
                      >
                        <PencilSquare className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="transparent"
                        size="small"
                        onClick={() => handleDelete(exception.id)}
                      >
                        <Trash className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
      )}

      {/* Exception Form Modal */}
      <FocusModal open={isModalOpen} onOpenChange={setIsModalOpen}>
        <FocusModal.Content>
          <form onSubmit={handleSubmit}>
            <FocusModal.Header>
              <Heading level="h2">
                {editingException ? 'Edit Exception' : 'Add Exception'}
              </Heading>
            </FocusModal.Header>
            <FocusModal.Body className="space-y-6">
              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('doctorAppointments.exceptionSettings.dateRange')}
                </label>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-xs text-ui-fg-subtle mb-1">From</label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-ui-fg-subtle mb-1">To</label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('doctorAppointments.exceptionSettings.duration')}
                </label>
                <Select value={String(duration)} onValueChange={(value) => setDuration(Number(value))}>
                  <Select.Trigger>
                    <Select.Value placeholder="Select duration" />
                  </Select.Trigger>
                  <Select.Content>
                    {DURATION_OPTIONS.map(opt => (
                      <Select.Item key={opt} value={String(opt)}>
                        {opt} minutes
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              </div>

              {/* Working Hours */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('doctorAppointments.exceptionSettings.workingHours')}
                </label>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-xs text-ui-fg-subtle mb-1">From</label>
                    <Input
                      type="time"
                      value={workingHoursFrom}
                      onChange={(e) => setWorkingHoursFrom(e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-ui-fg-subtle mb-1">To</label>
                    <Input
                      type="time"
                      value={workingHoursTo}
                      onChange={(e) => setWorkingHoursTo(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Recurring */}
              <div className="flex items-center">
                <Checkbox
                  checked={recurring}
                  onCheckedChange={(checked) => setRecurring(checked === true)}
                />
                <label className="ml-2 text-sm">
                  {t('doctorAppointments.exceptionSettings.recurring')}
                </label>
              </div>

              {/* Slot Selection */}
              {availableSlots.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium">Select Slots</label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="small"
                        onClick={handleSelectAll}
                      >
                        Select All
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="small"
                        onClick={handleDeselectAll}
                      >
                        Deselect All
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 max-h-64 overflow-y-auto border border-ui-border-base rounded-lg p-4">
                    {availableSlots.map(slot => (
                      <div key={slot} className="flex items-center">
                        <Checkbox
                          checked={selectedSlots.includes(slot)}
                          onCheckedChange={() => handleSlotToggle(slot)}
                        />
                        <label className="ml-2 text-sm">{slot}</label>
                      </div>
                    ))}
                  </div>
                  <Text size="small" className="text-ui-fg-subtle mt-2">
                    Selected: {selectedSlots.length} / {availableSlots.length}
                  </Text>
                </div>
              )}
            </FocusModal.Body>
            <FocusModal.Footer>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? 'Saving...' : editingException ? 'Update' : 'Create'}
              </Button>
            </FocusModal.Footer>
          </form>
        </FocusModal.Content>
      </FocusModal>
    </div>
  );
};

