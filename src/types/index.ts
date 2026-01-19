export interface CalendarEvent {
  id?: string;
  title: string;
  startDate: string;
  startTime?: string;
  endTime?: string;
  location?: string | null;
  description?: string | null;
  approved?: boolean;
}

export interface ScanResponse {
  events: CalendarEvent[];
}

export interface DeviceCalendar {
  id: string;
  name: string;
  accountName: string;
  accountType: string;
}

export type RootStackParamList = {
  Home: undefined;
  Camera: undefined;
  EventReview: {
    events: CalendarEvent[];
  };
};
