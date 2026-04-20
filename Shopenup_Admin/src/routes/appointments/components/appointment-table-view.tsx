import { useNavigate } from 'react-router-dom';
import { Table, Button, Text } from "@shopenup/ui";
import { Eye } from "@shopenup/icons";
import { useAppointments } from "../../../hooks/api/use-appointments";
import { format } from 'date-fns';

interface AppointmentTableViewProps {
  filters: {
    dateRange?: { from?: string; to?: string };
    search?: string;
    patient_name?: string;
    mobile?: string;
  };
}

export const AppointmentTableView = ({ filters }: AppointmentTableViewProps) => {
  const navigate = useNavigate();
  const { data: appointments = [], isLoading, error } = useAppointments(filters);

  if (isLoading) {
    return <div className="text-center py-8">Loading appointments...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">Error loading appointments</div>;
  }

  return (
    <div className="bg-ui-bg-base border border-ui-border-base rounded-lg overflow-hidden">
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Appointment ID</Table.HeaderCell>
            <Table.HeaderCell>Patient Name</Table.HeaderCell>
            <Table.HeaderCell>Date</Table.HeaderCell>
            <Table.HeaderCell>Time Slot</Table.HeaderCell>
            <Table.HeaderCell>Mobile Number</Table.HeaderCell>
            <Table.HeaderCell className="text-right">Actions</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {appointments.length === 0 ? (
            <Table.Row>
              <Table.Cell colSpan={6} className="text-center py-8">
                <Text className="text-ui-fg-subtle">No appointments found</Text>
              </Table.Cell>
            </Table.Row>
          ) : (
            appointments.map((appointment: any) => {
              // Get the correct field values (support both API and mapped names)
              const patientName = appointment.patient_name || appointment.fullName || '-';
              const appointmentDate = appointment.appointment_date || appointment.appointmentDate;
              const timeSlot = appointment.time_slot || 
                (appointment.startTime && appointment.endTime 
                  ? `${appointment.startTime} - ${appointment.endTime}` 
                  : appointment.startTime || '-');
              const mobile = appointment.mobile || appointment.mobileNumber || '-';
              
              return (
              <Table.Row key={appointment.id}>
                <Table.Cell>
                  <Text size="small" weight="plus">
                    {appointment.appointment_id || appointment.id}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Text size="small">{patientName}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Text size="small">
                    {appointmentDate
                      ? format(new Date(appointmentDate), 'MMM dd, yyyy')
                      : '-'}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Text size="small">{timeSlot}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Text size="small">{mobile}</Text>
                </Table.Cell>
                <Table.Cell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="transparent"
                      size="small"
                      onClick={() => navigate(`/appointments/${appointment.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </Table.Cell>
              </Table.Row>
              );
            })
          )}
        </Table.Body>
      </Table>
    </div>
  );
};

