import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  const steps = ['Serviço', 'Profissional', 'Horário', 'Dados', 'Pronto'];

  return (
    <div className="flex items-center justify-center gap-2 px-4 mb-6">
      {steps.slice(0, totalSteps).map((label, index) => {
        const stepNum = index + 1;
        const isCompleted = stepNum < currentStep;
        const isCurrent = stepNum === currentStep;

        return (
          <div key={stepNum} className="flex items-center">
            <motion.div
              initial={false}
              animate={{
                scale: isCurrent ? 1.1 : 1,
                backgroundColor: isCompleted || isCurrent 
                  ? 'hsl(var(--primary))' 
                  : 'hsl(0 0% 20%)',
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
              style={{
                color: isCompleted || isCurrent ? 'hsl(var(--primary-foreground))' : 'hsl(0 0% 60%)',
              }}
            >
              {isCompleted ? <Check className="w-4 h-4" /> : stepNum}
            </motion.div>
            {index < totalSteps - 1 && (
              <div 
                className="w-8 h-0.5 mx-1"
                style={{
                  backgroundColor: stepNum < currentStep 
                    ? 'hsl(var(--primary))' 
                    : 'hsl(0 0% 20%)',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
