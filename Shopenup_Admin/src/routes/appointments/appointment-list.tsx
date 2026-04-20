import { useState } from 'react';
import { Container, Heading, Text } from "@shopenup/ui";
import { Calendar } from "@shopenup/icons";
// import { AppointmentTableView } from './components/appointment-table-view';
import { AppointmentCalendarView } from './components/appointment-calendar-view';
import { AppointmentFilters } from './components/appointment-filters';

export const AppointmentList = () => {
  // const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<{
    dateRange?: { from?: string; to?: string };
    search?: string;
  }>({
    search: undefined,
    dateRange: undefined
  });

  const handleSearchChange = (search: string) => {
    setSearchTerm(search);
    setFilters(prev => ({ ...prev, search: search || undefined }));
  };

  const handleFiltersChange = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilters({
      search: undefined,
      dateRange: undefined
    });
  };

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-6 w-6 text-ui-fg-base" />
          <div>
            <Heading>All Appointments</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Manage and monitor all booked appointments
            </Text>
          </div>
        </div>
        {/* Table/Calendar View Toggle - Commented out for now */}
        {/* <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'table' ? 'primary' : 'secondary'}
            size="small"
            onClick={() => setViewMode('table')}
          >
            <SquaresPlus className="h-4 w-4 mr-2" />
            Table View
          </Button>
          <Button
            variant={viewMode === 'calendar' ? 'primary' : 'secondary'}
            size="small"
            onClick={() => setViewMode('calendar')}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Calendar View
          </Button>
        </div> */}
      </div>

      <div className="px-6 py-4">
        <AppointmentFilters
          filters={filters}
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
          onFiltersChange={handleFiltersChange}
          onClearFilters={handleClearFilters}
        />
      </div>

      <div className="px-6 py-4">
        {/* Table View - Commented out for now */}
        {/* {viewMode === 'table' ? (
          <AppointmentTableView filters={filters} />
        ) : (
          <AppointmentCalendarView filters={filters} />
        )} */}
        <AppointmentCalendarView filters={filters} />
      </div>
    </Container>
  );
};

