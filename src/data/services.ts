import { Service } from '@/types/booking';

export const services: Service[] = [
  {
    id: 'corte-social',
    name: 'Corte Social',
    duration: 30,
    price: 45,
    description: 'Corte clássico e elegante para o dia a dia',
    icon: '✂️',
  },
  {
    id: 'corte-degrade',
    name: 'Corte Degradê',
    duration: 40,
    price: 55,
    description: 'Degradê moderno com acabamento perfeito',
    icon: '💈',
  },
  {
    id: 'combo-sapo',
    name: 'Combo Bruno',
    duration: 70,
    price: 85,
    description: 'Cabelo + Barba completa - O pacote premium',
    icon: '💇',
  },
];
