import { useState } from 'react';
import { BookingData, Service } from '@/types/booking';

const initialBookingData: BookingData = {
  service: null,
  professionalName: null,
  date: null,
  time: null,
  clientName: '',
  clientPhone: '',
};

export function useBooking() {
  const [step, setStep] = useState(1);
  const [bookingData, setBookingData] = useState<BookingData>(initialBookingData);

  const selectService = (service: Service) => {
    setBookingData((prev) => ({ ...prev, service, professionalName: null }));
    setStep(2);
  };

  const selectProfessional = (professionalName: string) => {
    setBookingData((prev) => ({ ...prev, professionalName }));
    setStep(3);
  };

  const selectDate = (date: Date) => {
    setBookingData((prev) => ({ ...prev, date }));
  };

  const selectTime = (time: string) => {
    setBookingData((prev) => ({ ...prev, time }));
    setStep(4);
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
    setStep(5);
  };

  return {
    step,
    bookingData,
    selectService,
    selectProfessional,
    selectDate,
    selectTime,
    setClientInfo,
    goToStep,
    reset,
    confirmBooking,
  };
}
