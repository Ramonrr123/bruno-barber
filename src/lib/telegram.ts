// lib/telegram.ts

const TELEGRAM_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID;

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
    `Fala ${clientName}, tranquilo? Passando pra confirmar teu corte (${serviceName}) agendado para ${date}!`
  );
  
  const whatsappLink = `https://wa.me/${cleanPhone}?text=${whatsappMessage}`;

  // 3. Montagem da Mensagem do Telegram
  // Usando HTML parse mode para evitar problemas com links longos
  const escapeHtml = (text: string) => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  };

  let messageText = '';

  if (type === 'NEW_APPOINTMENT') {
    messageText = `💰 <b>NOVO AGENDAMENTO!</b>\n\n` +
      `👤 <b>Cliente:</b> ${escapeHtml(clientName)}\n` +
      `✂️ <b>Serviço:</b> ${escapeHtml(serviceName)}\n` +
      `📅 <b>Data:</b> ${escapeHtml(date)}\n\n` +
      `👉 <a href="${whatsappLink}">CLIQUE AQUI PARA CONFIRMAR NO ZAP</a>`;
  } else {
    messageText = `⚠️ <b>AGENDAMENTO CANCELADO</b>\n\n` +
      `👤 <b>Cliente:</b> ${escapeHtml(clientName)}\n` +
      `📅 <b>Data Original:</b> ${escapeHtml(date)}\n` +
      `❌ <b>O horário está livre novamente.</b>\n\n` +
      `<a href="${whatsappLink}">Mandar Zap perguntando o motivo</a>`;
  }

  // 4. Envio Silencioso (Fire and Forget)
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: messageText,
        parse_mode: 'HTML', // HTML é mais robusto para links longos
        disable_web_page_preview: true // Deixa a mensagem mais limpa
      }),
    });
  } catch (error) {
    console.error('Erro ao enviar Telegram:', error);
    // Não damos "throw" para não quebrar o site se o Telegram falhar
  }
}
