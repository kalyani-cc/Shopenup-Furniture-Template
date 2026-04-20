import { useParams, useNavigate } from 'react-router-dom';
import { Container, Heading, Text, Button, toast } from "@shopenup/ui";
import { ArrowLeft } from "@shopenup/icons";
import { useAppointment, useMarkAppointmentAsDone } from "../../hooks/api/use-appointments";
import { format } from 'date-fns';

export const AppointmentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: appointment, isLoading } = useAppointment(id || '');
  const markAsDoneMutation = useMarkAppointmentAsDone();

  if (isLoading) {
    return <div className="text-center py-8">Loading appointment details...</div>;
  }

  if (!appointment) {
    return <div className="text-center py-8">Appointment not found</div>;
  }

  // Get mapped values (support both API and alternative field names)
  const patientName = appointment.patient_name || appointment.fullName || '';
  const appointmentDate = appointment.appointment_date || appointment.appointmentDate;
  const mobile = appointment.mobile || appointment.mobileNumber || '';
  const timeSlot = appointment.time_slot || 
    (appointment.startTime && appointment.endTime 
      ? `${appointment.startTime} - ${appointment.endTime}` 
      : appointment.startTime || '');
  
  // Use age from API or calculate from date of birth
  const age = appointment.age || (appointment.date_of_birth 
    ? (() => {
        const birthDate = new Date(appointment.date_of_birth);
        const today = new Date();
        let calculatedAge = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          calculatedAge--;
        }
        return calculatedAge;
      })()
    : undefined);

  const handleMarkAsDone = async () => {
    if (!id) return;

    try {
      await markAsDoneMutation.mutateAsync(id);
      toast.success('Success', {
        description: 'Appointment marked as done successfully',
      });
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to mark appointment as done',
      });
    }
  };

  const isDone = appointment.status === 'done' || appointment.status === 'completed';

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <Button
            variant="transparent"
            size="small"
            onClick={() => navigate('/appointments')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <Heading>Appointment Details</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Appointment ID: {appointment.appointment_id || appointment.id}
            </Text>
          </div>
        </div>
        {!isDone && (
          <Button
            onClick={handleMarkAsDone}
            disabled={markAsDoneMutation.isPending}
            variant="primary"
          >
            {markAsDoneMutation.isPending ? 'Marking as Done...' : 'Mark as Done'}
          </Button>
        )}
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Personal Info */}
        <div className="mb-6">
          <Heading level="h2" className="mb-4">Personal Information</Heading>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Text size="small" className="text-ui-fg-subtle">Full Name</Text>
              <Text weight="plus">{patientName}</Text>
            </div>
            <div>
              <Text size="small" className="text-ui-fg-subtle">Gender</Text>
              <Text weight="plus">
                {appointment.gender 
                  ? appointment.gender.charAt(0).toUpperCase() + appointment.gender.slice(1).toLowerCase()
                  : '-'}
              </Text>
            </div>
            <div>
              <Text size="small" className="text-ui-fg-subtle">Date of Birth</Text>
              <Text weight="plus">
                {appointment.date_of_birth
                  ? format(new Date(appointment.date_of_birth), 'MMM dd, yyyy')
                  : '-'}
              </Text>
            </div>
            <div>
              <Text size="small" className="text-ui-fg-subtle">Age</Text>
              <Text weight="plus">{age || '-'}</Text>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="mb-6">
          <Heading level="h2" className="mb-4">Contact Information</Heading>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Text size="small" className="text-ui-fg-subtle">Email ID</Text>
              <Text weight="plus">{appointment.email || '-'}</Text>
            </div>
            <div>
              <Text size="small" className="text-ui-fg-subtle">Mobile Number</Text>
              <Text weight="plus">{mobile}</Text>
            </div>
            <div>
              <Text size="small" className="text-ui-fg-subtle">State</Text>
              <Text weight="plus">{appointment.state || '-'}</Text>
            </div>
            <div>
              <Text size="small" className="text-ui-fg-subtle">City</Text>
              <Text weight="plus">{appointment.city || '-'}</Text>
            </div>
            <div className="col-span-2">
              <Text size="small" className="text-ui-fg-subtle">Address</Text>
              <Text weight="plus">{appointment.address || '-'}</Text>
            </div>
            <div>
              <Text size="small" className="text-ui-fg-subtle">Pincode</Text>
              <Text weight="plus">{appointment.pincode || '-'}</Text>
            </div>
          </div>
        </div>

        {/* Health Info */}
        <div className="mb-6">
          <Heading level="h2" className="mb-4">Health Information</Heading>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Text size="small" className="text-ui-fg-subtle">Symptoms / Health Issue</Text>
              <Text weight="plus">{appointment.symptoms || '-'}</Text>
            </div>
            <div>
              <Text size="small" className="text-ui-fg-subtle">Duration of Symptoms</Text>
              <Text weight="plus">{appointment.duration_of_symptoms || appointment.durationOfSymptoms || '-'}</Text>
            </div>
            <div>
              <Text size="small" className="text-ui-fg-subtle">Existing Conditions</Text>
              <Text weight="plus">{appointment.existing_conditions || appointment.existingConditions || '-'}</Text>
            </div>
            <div className="col-span-2">
              <Text size="small" className="text-ui-fg-subtle">Current Medications</Text>
              <Text weight="plus">{appointment.current_medications || appointment.currentMedications || '-'}</Text>
            </div>
            <div className="col-span-2">
              <Text size="small" className="text-ui-fg-subtle">Allergies</Text>
              <Text weight="plus">{appointment.allergies || 'None'}</Text>
            </div>
          </div>
        </div>

              {/* Appointment Date & Slot */}
              <div className="mb-6">
                <Heading level="h2" className="mb-4">Appointment Details</Heading>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Text size="small" className="text-ui-fg-subtle">Appointment Date</Text>
                    <Text weight="plus">
                      {appointmentDate
                        ? format(new Date(appointmentDate), 'MMM dd, yyyy')
                        : '-'}
                    </Text>
                  </div>
                  <div>
                    <Text size="small" className="text-ui-fg-subtle">Time Slot</Text>
                    <Text weight="plus">{timeSlot}</Text>
                  </div>
                </div>
              </div>
      </div>
    </Container>
  );
};

