import { useState } from 'react';
import { BookingData, Service } from '@/types/booking';

const initialBookingData: BookingData = {
  service: null,
  date: null,
  time: null,
  clientName: '',
  clientPhone: '',
};

export function useBooking() {
  const [step, setStep] = useState(1);
  const [bookingData, setBookingData] = useState<BookingData>(initialBookingData);

  const selectService = (service: Service) => {
    setBookingData((prev) => ({ ...prev, service }));
    setStep(2);
  };

  const selectDate = (date: Date) => {
    setBookingData((prev) => ({ ...prev, date }));
  };

  const selectTime = (time: string) => {
    setBookingData((prev) => ({ ...prev, time }));
    setStep(3);
  };

  const setClientInfo = (name: string, phone: string) => {
    setBookingData((prev) => ({ ...prev, clientName: name, clientPhone: phone }));
  };

  const goToStep = (newStep: number) => {
    setStep(newStep);
  };

  const reset = () => {
    setBookingData(initialBookingData);
    setStep(1);
  };

  const confirmBooking = () => {
    setStep(4);
  };

  return {
    step,
    bookingData,
    selectService,
    selectDate,
    selectTime,
    setClientInfo,
    goToStep,
    reset,
    confirmBooking,
  };
}
