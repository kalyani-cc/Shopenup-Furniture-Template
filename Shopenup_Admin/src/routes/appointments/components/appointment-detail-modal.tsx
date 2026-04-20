import { Drawer, Heading, Button, Input, Label, toast, usePrompt } from "@shopenup/ui";
import { useAppointment, useMarkAppointmentAsDone, useCancelAppointment } from "../../../hooks/api/use-appointments";
import { format, isToday } from 'date-fns';

interface AppointmentDetailModalProps {
  appointmentId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AppointmentDetailModal = ({
  appointmentId,
  isOpen,
  onClose,
}: AppointmentDetailModalProps) => {
  const { data: appointment, isLoading } = useAppointment(appointmentId || '');
  const markAsDoneMutation = useMarkAppointmentAsDone();
  const cancelAppointmentMutation = useCancelAppointment();
  const prompt = usePrompt();

  if (!isOpen || !appointmentId) {
    return null;
  }

  // Get mapped values
  const patientName = appointment?.patient_name || appointment?.fullName || '';
  const appointmentDate = appointment?.appointment_date || appointment?.appointmentDate;
  const mobile = appointment?.mobile || appointment?.mobileNumber || '';
  const timeSlot = appointment?.time_slot || 
    (appointment?.startTime && appointment?.endTime 
      ? `${appointment.startTime} - ${appointment.endTime}` 
      : appointment?.startTime || '');
  
  const age = appointment?.age || (appointment?.date_of_birth 
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
    if (!appointmentId) return;

    try {
      await markAsDoneMutation.mutateAsync(appointmentId);
      toast.success('Success', {
        description: 'Appointment marked as done successfully',
      });
      // Optionally close the modal after marking as done
      // onClose();
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to mark appointment as done',
      });
    }
  };

  const handleCancelAppointment = async () => {
    if (!appointmentId) return;

    const res = await prompt({
      title: 'Cancel Appointment',
      description: 'Are you sure you want to cancel this appointment? This action cannot be undone.',
      confirmText: 'Cancel Appointment',
      cancelText: 'Keep Appointment',
    });

    if (!res) {
      return;
    }

    try {
      await cancelAppointmentMutation.mutateAsync({
        id: appointmentId,
        cancellationReason: 'Appointment cancelled by admin',
      });
      toast.success('Success', {
        description: 'Appointment cancelled successfully',
      });
      // Optionally close the modal after cancelling
      // onClose();
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to cancel appointment',
      });
    }
  };

  const isDone = appointment?.status === 'done' || appointment?.status === 'completed';
  const isCancelled = appointment?.status === 'cancelled' || (appointment?.status as string) === 'canceled';
  
  // Check if appointment date is today
  const isAppointmentToday = appointmentDate 
    ? isToday(new Date(appointmentDate))
    : false;

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <Drawer.Content className="h-full flex flex-col">
        <Drawer.Header className="flex-shrink-0">
          <Drawer.Title>Appointment Details</Drawer.Title>
          <Drawer.Description>
            View appointment information
          </Drawer.Description>
        </Drawer.Header>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="text-center py-8">Loading appointment details...</div>
          ) : !appointment ? (
            <div className="text-center py-8">Appointment not found</div>
          ) : (
            <>
              {/* Personal Information */}
              <div className="space-y-4">
                <Heading level="h3" className="mb-4">Personal Information</Heading>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Full Name</Label>
                    <Input
                      value={patientName}
                      disabled
                      readOnly
                    />
                  </div>
                  <div>
                    <Label>Gender</Label>
                    <Input
                      value={appointment.gender 
                        ? appointment.gender.charAt(0).toUpperCase() + appointment.gender.slice(1).toLowerCase()
                        : '-'}
                      disabled
                      readOnly
                    />
                  </div>
                  <div>
                    <Label>Date of Birth</Label>
                    <Input
                      type="date"
                      value={appointment.date_of_birth
                        ? format(new Date(appointment.date_of_birth), 'yyyy-MM-dd')
                        : ''}
                      disabled
                      readOnly
                    />
                  </div>
                  <div>
                    <Label>Age</Label>
                    <Input
                      value={age ? `${age} years` : '-'}
                      disabled
                      readOnly
                    />
                  </div>
                </div>
              </div>

              {/* Appointment Details */}
              <div className="space-y-4">
                <Heading level="h3" className="mb-4">Appointment Details</Heading>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Appointment Date</Label>
                    <Input
                      type="date"
                      value={appointmentDate
                        ? format(new Date(appointmentDate), 'yyyy-MM-dd')
                        : ''}
                      disabled
                      readOnly
                    />
                  </div>
                  <div>
                    <Label>Time Slot</Label>
                    <Input
                      value={timeSlot}
                      disabled
                      readOnly
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <Heading level="h3" className="mb-4">Contact Information</Heading>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Email ID</Label>
                    <Input
                      type="email"
                      value={appointment.email || ''}
                      disabled
                      readOnly
                    />
                  </div>
                  <div>
                    <Label>Mobile Number</Label>
                    <Input
                      type="tel"
                      value={mobile}
                      disabled
                      readOnly
                    />
                  </div>
                  <div>
                    <Label>State</Label>
                    <Input
                      value={appointment.state || ''}
                      disabled
                      readOnly
                    />
                  </div>
                  <div>
                    <Label>City</Label>
                    <Input
                      value={appointment.city || ''}
                      disabled
                      readOnly
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Address</Label>
                    <Input
                      value={appointment.address || ''}
                      disabled
                      readOnly
                    />
                  </div>
                  <div>
                    <Label>Pincode</Label>
                    <Input
                      value={appointment.pincode || ''}
                      disabled
                      readOnly
                    />
                  </div>
                </div>
              </div>

              {/* Health Information */}
              <div className="space-y-4">
                <Heading level="h3" className="mb-4">Health Information</Heading>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Symptoms / Health Issue</Label>
                    <Input
                      value={appointment.symptoms || ''}
                      disabled
                      readOnly
                    />
                  </div>
                  <div>
                    <Label>Duration of Symptoms</Label>
                    <Input
                      value={appointment.duration_of_symptoms || appointment.durationOfSymptoms || ''}
                      disabled
                      readOnly
                    />
                  </div>
                  <div>
                    <Label>Existing Conditions</Label>
                    <Input
                      value={appointment.existing_conditions || appointment.existingConditions || ''}
                      disabled
                      readOnly
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Current Medications</Label>
                    <Input
                      value={appointment.current_medications || appointment.currentMedications || ''}
                      disabled
                      readOnly
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Allergies</Label>
                    <Input
                      value={appointment.allergies || 'None'}
                      disabled
                      readOnly
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        {!isDone && !isCancelled && appointment && (
          <Drawer.Footer className="flex-shrink-0 border-t">
            <div className="flex justify-end gap-2">
              <Button
                onClick={handleCancelAppointment}
                disabled={cancelAppointmentMutation.isPending}
                variant="secondary"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                {cancelAppointmentMutation.isPending ? 'Cancelling...' : 'Cancel Appointment'}
              </Button>
              {isAppointmentToday && (
                <Button
                  onClick={handleMarkAsDone}
                  disabled={markAsDoneMutation.isPending}
                  variant="primary"
                >
                  {markAsDoneMutation.isPending ? 'Marking as Done...' : 'Mark as Done'}
                </Button>
              )}
            </div>
          </Drawer.Footer>
        )}
      </Drawer.Content>
    </Drawer>
  );
};


