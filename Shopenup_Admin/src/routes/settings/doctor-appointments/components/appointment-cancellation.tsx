import { useState, useEffect } from 'react';
import { Text, Table, toast, Button } from "@shopenup/ui";

const API_BASE_URL = import.meta.env.VITE_SHOPENUP_BACKEND_URL || '';
const ITEMS_PER_PAGE = 10;

interface CancelledAppointment {
  id: string;
  patient_name?: string;
  fullName?: string;
  appointment_date?: string;
  appointmentDate?: string;
  time_slot?: string;
  startTime?: string;
  endTime?: string;
  mobile?: string;
  mobileNumber?: string;
  status: string;
  reason?: string;
  cancelled_at?: string;
  cancelledAt?: string;
}

export const AppointmentCancellation = () => {
  const [fetching, setFetching] = useState(false);
  const [cancelledAppointments, setCancelledAppointments] = useState<CancelledAppointment[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchCancelledAppointments();
  }, []);

  // Calculate pagination
  const totalPages = Math.ceil(cancelledAppointments.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentPageAppointments = cancelledAppointments.slice(startIndex, endIndex);

  // Reset to page 1 when appointments change
  useEffect(() => {
    setCurrentPage(1);
  }, [cancelledAppointments.length]);

  const fetchCancelledAppointments = async () => {
    setFetching(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/appointments`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const appointments = data.appointments || [];
        
        // Filter only cancelled appointments
        const cancelled = appointments.filter(
          (apt: any) => 
            apt.status === 'cancelled' || apt.status === 'canceled'
        );
        
        // Map API field names to our interface
        const mappedAppointments = cancelled.map((apt: any) => {
          // Preserve cancelled_at from API (can be cancelledAt or cancelled_at)
          const cancelledAt = apt.cancelled_at || apt.cancelledAt || null;
          
          return {
            ...apt,
            patient_name: apt.fullName || apt.patient_name,
            appointment_date: apt.appointmentDate || apt.appointment_date,
            mobile: apt.mobileNumber || apt.mobile,
            time_slot: apt.time_slot || (apt.startTime && apt.endTime ? `${apt.startTime} - ${apt.endTime}` : apt.startTime || ''),
            cancelled_at: cancelledAt, // Ensure cancelled_at is set (from API response)
            cancelledAt: cancelledAt, // Also set cancelledAt for compatibility
            reason: apt.cancellationReason || apt.reason || apt.cancellation_reason,
          };
        });
        
        setCancelledAppointments(mappedAppointments);
      }
    } catch (error) {
      console.error('Error fetching cancelled appointments:', error);
      toast.error('Error', { description: 'Failed to fetch cancelled appointments' });
    } finally {
      setFetching(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-6">
        {/* <div className="flex items-center justify-between mb-4">
          <Heading level="h3">Cancelled Appointments</Heading>
          <Button variant="secondary" size="small" onClick={fetchCancelledAppointments} disabled={fetching}>
            {fetching ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div> */}
        {fetching && cancelledAppointments.length === 0 ? (
          <Text className="text-ui-fg-subtle">Loading cancelled appointments...</Text>
        ) : cancelledAppointments.length === 0 ? (
          <Text className="text-ui-fg-subtle">No cancelled appointments found</Text>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Patient Name</Table.HeaderCell>
                  <Table.HeaderCell>Appointment Date</Table.HeaderCell>
                  <Table.HeaderCell>Time Slot</Table.HeaderCell>
                  <Table.HeaderCell>Mobile</Table.HeaderCell>
                  <Table.HeaderCell>Cancelled At</Table.HeaderCell>
                  <Table.HeaderCell>Reason</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {currentPageAppointments.map((appointment) => (
                  <Table.Row key={appointment.id}>
                    <Table.Cell>
                      <Text size="small">
                        {appointment.patient_name || appointment.fullName || '-'}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="small">
                        {appointment.appointment_date 
                          ? new Date(appointment.appointment_date).toLocaleDateString()
                          : '-'}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="small">
                        {appointment.time_slot || '-'}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="small">
                        {appointment.mobile || appointment.mobileNumber || '-'}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="small" className="text-ui-fg-subtle">
                        {(() => {
                          // Try all possible field names
                          const cancelledAtValue = (appointment as any).cancelled_at || (appointment as any).cancelledAt || appointment.cancelled_at || appointment.cancelledAt;
                          
                          if (!cancelledAtValue) {
                            return '-';
                          }
                          
                          try {
                            const date = new Date(cancelledAtValue);
                            if (isNaN(date.getTime())) {
                              return String(cancelledAtValue);
                            }
                            return date.toLocaleDateString();
                          } catch {
                            return String(cancelledAtValue);
                          }
                        })()}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="small" className="text-ui-fg-subtle">
                        {appointment.reason || '-'}
                      </Text>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </div>
        )}
        
        {/* Pagination Controls */}
        {cancelledAppointments.length > ITEMS_PER_PAGE && (
          <div className="mt-4 flex items-center justify-between">
            <Text size="small" className="text-ui-fg-subtle">
              Showing {startIndex + 1} to {Math.min(endIndex, cancelledAppointments.length)} of {cancelledAppointments.length} appointments
            </Text>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="small"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Text size="small" className="flex items-center px-2">
                Page {currentPage} of {totalPages}
              </Text>
              <Button
                variant="secondary"
                size="small"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

