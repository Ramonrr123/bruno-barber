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
  admin_notes?: string;
}

export interface Exception {
  id: string;
  date: string; // YYYY-MM-DD
  start_time: string | null; // HH:MM (null se is_all_day = true)
  end_time: string | null; // HH:MM (null se is_all_day = true)
  is_all_day: boolean;
  note: string | null;
  created_at: string;
  updated_at: string;
}