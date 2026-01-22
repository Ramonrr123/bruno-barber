// lib/telegram.ts

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

interface NotificationProps {
  type: 'NEW_APPOINTMENT' | 'CANCELED';
  clientName: string;
  phone: string;
  serviceName: string;
  date: string; // Ex: "20/01 às 14:30"
}

export async function sendTelegramNotification({
  type,
  clientName,
  phone,
  serviceName,
  date,
}: NotificationProps) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error('⚠️ Telegram Env Vars faltando!');
    return;
  }

  // 1. Limpeza do Telefone (Remove tudo que não é número)
  let cleanPhone = phone.replace(/\D/g, '');
  // Adiciona DDI 55 se não tiver (assumindo Brasil)
  if (cleanPhone.length <= 11) cleanPhone = `55${cleanPhone}`;

  // 2. Mensagem Automática para o WhatsApp (URL Encoded)
  const whatsappMessage = encodeURIComponent(
    `Fala ${clientName}! 🐸 Passando pra confirmar teu corte (${serviceName}) agendado para ${date}. Tudo certo, meu patrão?`
  );
  
  const whatsappLink = `https://wa.me/${cleanPhone}?text=${whatsappMessage}`;

  // 3. Montagem da Mensagem do Telegram
  let messageText = '';

  if (type === 'NEW_APPOINTMENT') {
    messageText = `💰 *NOVO AGENDAMENTO!*\n\n` +
      `👤 *Cliente:* ${clientName}\n` +
      `✂️ *Serviço:* ${serviceName}\n` +
      `📅 *Data:* ${date}\n\n` +
      `👉 [CLIQUE AQUI PARA CONFIRMAR NO ZAP](${whatsappLink})`;
  } else {
    messageText = `⚠️ *AGENDAMENTO CANCELADO*\n\n` +
      `👤 *Cliente:* ${clientName}\n` +
      `📅 *Data Original:* ${date}\n` +
      `❌ *O horário está livre novamente.*\n\n` +
      `[Mandar Zap perguntando o motivo](${whatsappLink})`;
  }

  // 4. Envio Silencioso (Fire and Forget)
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: messageText,
        parse_mode: 'Markdown', // Importante para o link funcionar
        disable_web_page_preview: true // Deixa a mensagem mais limpa
      }),
    });
  } catch (error) {
    console.error('Erro ao enviar Telegram:', error);
    // Não damos "throw" para não quebrar o site se o Telegram falhar
  }
}