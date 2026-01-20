// Rota de API de Diagnóstico Isolada - Telegram
// Este arquivo é completamente autônomo e não importa nada de lib/ ou utils/

export async function GET() {
  try {
    // 1. Verificar Variáveis de Ambiente
    const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.VITE_TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || process.env.VITE_TELEGRAM_CHAT_ID;

    // Validar se as variáveis estão configuradas
    if (!TELEGRAM_TOKEN && !TELEGRAM_CHAT_ID) {
      return Response.json(
        {
          success: false,
          error: 'Variáveis de ambiente faltando',
          details: {
            TELEGRAM_BOT_TOKEN: TELEGRAM_TOKEN ? '✅ Configurada' : '❌ FALTANDO',
            TELEGRAM_CHAT_ID: TELEGRAM_CHAT_ID ? '✅ Configurada' : '❌ FALTANDO',
          },
          message: 'Ambas as variáveis TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID estão faltando.',
        },
        { status: 500 }
      );
    }

    if (!TELEGRAM_TOKEN) {
      return Response.json(
        {
          success: false,
          error: 'Variável de ambiente faltando',
          missing: 'TELEGRAM_BOT_TOKEN',
          details: {
            TELEGRAM_BOT_TOKEN: '❌ FALTANDO',
            TELEGRAM_CHAT_ID: TELEGRAM_CHAT_ID ? '✅ Configurada' : '❌ FALTANDO',
          },
          message: 'A variável TELEGRAM_BOT_TOKEN não está configurada. Configure process.env.TELEGRAM_BOT_TOKEN ou process.env.VITE_TELEGRAM_BOT_TOKEN',
        },
        { status: 500 }
      );
    }

    if (!TELEGRAM_CHAT_ID) {
      return Response.json(
        {
          success: false,
          error: 'Variável de ambiente faltando',
          missing: 'TELEGRAM_CHAT_ID',
          details: {
            TELEGRAM_BOT_TOKEN: TELEGRAM_TOKEN ? '✅ Configurada (primeiros 10 chars: ' + TELEGRAM_TOKEN.substring(0, 10) + '...)' : '❌ FALTANDO',
            TELEGRAM_CHAT_ID: '❌ FALTANDO',
          },
          message: 'A variável TELEGRAM_CHAT_ID não está configurada. Configure process.env.TELEGRAM_CHAT_ID ou process.env.VITE_TELEGRAM_CHAT_ID',
        },
        { status: 500 }
      );
    }

    // 2. Log no Console (servidor)
    const tokenPreview = TELEGRAM_TOKEN.length > 10 
      ? TELEGRAM_TOKEN.substring(0, 10) + '...' 
      : TELEGRAM_TOKEN;
    
    console.log('🔍 [DEBUG TELEGRAM] Tentando enviar mensagem para ID:', TELEGRAM_CHAT_ID, 'com Token:', tokenPreview);

    // 3. Preparar dados para o teste
    // Limpeza do Telefone (isolado neste arquivo)
    const testPhone = '5511999999999';
    let cleanPhone = testPhone.replace(/\D/g, '');
    if (cleanPhone.length <= 11) cleanPhone = `55${cleanPhone}`;

    // Mensagem Automática para o WhatsApp (URL Encoded)
    const whatsappMessage = encodeURIComponent(
      '🔔 Teste de Diagnóstico do Sistema - Agendamento para 20/01 às 14:30'
    );
    const whatsappLink = `https://wa.me/${cleanPhone}?text=${whatsappMessage}`;

    // Montar mensagem de teste com link do WhatsApp
    // Usando HTML parse mode para evitar problemas com links longos
    const testMessage = `🔔 <b>Teste de Diagnóstico do Sistema</b>\n\n` +
      `Este é um teste automatizado para verificar a conexão com o Telegram.\n\n` +
      `✅ Token configurado: ${TELEGRAM_TOKEN ? 'Sim' : 'Não'}\n` +
      `✅ Chat ID configurado: ${TELEGRAM_CHAT_ID ? 'Sim' : 'Não'}\n\n` +
      `📱 <a href="${whatsappLink}">Testar Link do WhatsApp</a>`;

    // 4. Teste de Envio Real
    const telegramApiUrl = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    
    console.log('📤 [DEBUG TELEGRAM] Enviando requisição para:', telegramApiUrl);

    const response = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: testMessage,
        parse_mode: 'HTML', // HTML é mais robusto para links longos
        disable_web_page_preview: true,
      }),
    });

    // 5. Tratamento de Erro Robusto
    if (!response.ok) {
      // Tentar ler o corpo da resposta para obter detalhes do erro
      let errorDetails: any = {};
      
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          errorDetails = await response.json();
        } else {
          const textResponse = await response.text();
          errorDetails = { raw_response: textResponse };
        }
      } catch (parseError) {
        errorDetails = { 
          parse_error: 'Não foi possível ler o corpo da resposta',
          status: response.status,
          statusText: response.statusText,
        };
      }

      // Mapear códigos de erro comuns
      let errorMessage = `Erro HTTP ${response.status}: ${response.statusText}`;
      
      if (errorDetails.description) {
        errorMessage = errorDetails.description;
      } else if (errorDetails.error_code === 400) {
        errorMessage = 'Erro 400: Requisição inválida. Verifique se o chat_id está correto.';
      } else if (errorDetails.error_code === 401) {
        errorMessage = 'Erro 401: Token inválido ou não autorizado. Verifique se o TELEGRAM_BOT_TOKEN está correto.';
      } else if (errorDetails.error_code === 403) {
        errorMessage = 'Erro 403: Bot bloqueado pelo usuário ou sem permissão para enviar mensagens.';
      } else if (errorDetails.error_code === 404) {
        errorMessage = 'Erro 404: Chat não encontrado. Verifique se o TELEGRAM_CHAT_ID está correto e se o bot iniciou conversa com o usuário.';
      }

      console.error('❌ [DEBUG TELEGRAM] Erro na resposta do Telegram:', {
        status: response.status,
        statusText: response.statusText,
        errorDetails,
      });

      return Response.json(
        {
          success: false,
          error: 'Erro ao enviar mensagem para o Telegram',
          http_status: response.status,
          http_status_text: response.statusText,
          telegram_error: errorDetails,
          error_message: errorMessage,
          diagnostics: {
            token_preview: tokenPreview,
            chat_id: TELEGRAM_CHAT_ID,
            api_url: telegramApiUrl,
          },
        },
        { status: response.status }
      );
    }

    // 6. Resposta de Sucesso
    const responseData = await response.json().catch(() => ({}));

    console.log('✅ [DEBUG TELEGRAM] Mensagem enviada com sucesso!', {
      message_id: responseData.result?.message_id,
      chat_id: responseData.result?.chat?.id,
    });

    return Response.json({
      success: true,
      message: 'Mensagem de teste enviada com sucesso!',
      telegram_response: responseData,
      diagnostics: {
        token_preview: tokenPreview,
        chat_id: TELEGRAM_CHAT_ID,
        message_sent: testMessage.substring(0, 50) + '...',
      },
    });

  } catch (error: any) {
    // Captura erros de rede, timeout, etc.
    console.error('❌ [DEBUG TELEGRAM] Erro ao executar teste:', error);

    return Response.json(
      {
        success: false,
        error: 'Erro ao executar teste de diagnóstico',
        error_type: error?.name || 'Unknown',
        error_message: error?.message || String(error),
        stack: error?.stack,
        diagnostics: {
          node_version: process.version,
          platform: process.platform,
        },
      },
      { status: 500 }
    );
  }
}
