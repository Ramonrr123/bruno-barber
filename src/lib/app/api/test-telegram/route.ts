import { NextResponse } from 'next/server';
import { sendTelegramNotification } from '@/lib/telegram'; // Ajuste o caminho se necessário

export async function GET() {
  try {
    // Simulando um agendamento
    await sendTelegramNotification({
      type: 'NEW_APPOINTMENT',
      clientName: 'Teste da Silva',
      phone: '47997074833', // Teste com formatação suja pra ver se limpa
      serviceName: 'Corte Blindado',
      date: 'Hoje às 20:00'
    });

    return NextResponse.json({ success: true, message: '🔔 Notificação enviada!' });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Erro ao enviar' }, { status: 500 });
  }
}