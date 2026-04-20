import { useState } from 'react';
import { Container, Heading, Text, Tabs } from "@shopenup/ui";
import { Calendar } from "@shopenup/icons";
import { AppointmentMasterForm } from './components/appointment-master-form';
import { OverrideSettingsForm } from './components/override-settings-form';
import { OverrideHistory } from './components/override-history';
import { AppointmentCancellation } from './components/appointment-cancellation';

export const DoctorAppointments = () => {
  const [activeTab, setActiveTab] = useState<'master' | 'overrides' | 'history' | 'cancellation'>('master');

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-6 w-6 text-ui-fg-base" />
          <div>
            <Heading>Doctor Appointment</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Manage doctor appointment slot settings and availability
            </Text>
          </div>
        </div>
      </div>

      <div className="px-6 py-4">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'master' | 'overrides' | 'history' | 'cancellation')}>
          <Tabs.List className="overflow-x-auto">
            <Tabs.Trigger value="master" className="whitespace-nowrap">Appointment Master</Tabs.Trigger>
            <Tabs.Trigger value="overrides" className="whitespace-nowrap">Override Settings</Tabs.Trigger>
            <Tabs.Trigger value="history" className="whitespace-nowrap">Override History</Tabs.Trigger>
            <Tabs.Trigger value="cancellation" className="whitespace-nowrap">Cancelled Appointments</Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="master" className="mt-6">
            <AppointmentMasterForm />
          </Tabs.Content>

          <Tabs.Content value="overrides" className="mt-6">
            <OverrideSettingsForm />
          </Tabs.Content>

          <Tabs.Content value="history" className="mt-6">
            <OverrideHistory />
          </Tabs.Content>

          <Tabs.Content value="cancellation" className="mt-6">
            <AppointmentCancellation />
          </Tabs.Content>
        </Tabs>
      </div>
    </Container>
  );
};

