import { AnimatePresence } from 'framer-motion';
import { Header } from '@/components/booking/Header';
import { Footer } from '@/components/booking/Footer';
import { StepIndicator } from '@/components/booking/StepIndicator';
import { ServiceSelection } from '@/components/booking/ServiceSelection';
import { DateTimeSelection } from '@/components/booking/DateTimeSelection';
import { ClientInfoForm } from '@/components/booking/ClientInfoForm';
import { Confirmation } from '@/components/booking/Confirmation';
import { useBooking } from '@/hooks/useBooking';

const Index = () => {
  const {
    step,
    bookingData,
    selectService,
    selectDate,
    selectTime,
    setClientInfo,
    goToStep,
    reset,
    confirmBooking,
  } = useBooking();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      {step < 4 && <StepIndicator currentStep={step} totalSteps={4} />}

      <main className="max-w-lg mx-auto flex-1 w-full">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <ServiceSelection 
              key="step1"
              onSelect={selectService} 
            />
          )}

          {step === 2 && bookingData.service && (
            <DateTimeSelection
              key="step2"
              service={bookingData.service}
              selectedDate={bookingData.date}
              selectedTime={bookingData.time}
              onSelectDate={selectDate}
              onSelectTime={selectTime}
              onBack={() => goToStep(1)}
            />
          )}

          {step === 3 && bookingData.service && bookingData.date && bookingData.time && (
            <ClientInfoForm
              key="step3"
              service={bookingData.service}
              date={bookingData.date}
              time={bookingData.time}
              onBack={() => goToStep(2)}
              onConfirm={confirmBooking}
              onUpdateClientInfo={setClientInfo}
            />
          )}

          {step === 4 && (
            <Confirmation
              key="step4"
              bookingData={bookingData}
              onNewBooking={reset}
            />
          )}
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
