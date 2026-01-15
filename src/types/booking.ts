export interface Service {
  id: string;
  name: string;
  duration: number; // em minutos
  price: number;
  description: string;
  icon: string;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface BookingData {
  service: Service | null;
  date: Date | null;
  time: string | null;
  clientName: string;
  clientPhone: string;
}

export interface Appointment {
  id: string;
  created_at: string;
  client_name: string;
  client_phone: string;
  service_type: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'blocked' | 'no_show';
}
