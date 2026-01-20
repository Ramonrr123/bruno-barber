import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export default function DebugTelegram() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTest = async () => {
    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      // Criar função de teste isolada (mesma lógica da rota de API)
      const testTelegram = async () => {
        // 1. Verificar Variáveis de Ambiente (no cliente, são import.meta.env)
        const TELEGRAM_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
        const TELEGRAM_CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID;

        // Validar se as variáveis estão configuradas
        if (!TELEGRAM_TOKEN && !TELEGRAM_CHAT_ID) {
          return {
            success: false,
            error: 'Variáveis de ambiente faltando',
            details: {
              VITE_TELEGRAM_BOT_TOKEN: TELEGRAM_TOKEN ? '✅ Configurada' : '❌ FALTANDO',
              VITE_TELEGRAM_CHAT_ID: TELEGRAM_CHAT_ID ? '✅ Configurada' : '❌ FALTANDO',
            },
            message: 'Ambas as variáveis VITE_TELEGRAM_BOT_TOKEN e VITE_TELEGRAM_CHAT_ID estão faltando.',
          };
        }

        if (!TELEGRAM_TOKEN) {
          return {
            success: false,
            error: 'Variável de ambiente faltando',
            missing: 'VITE_TELEGRAM_BOT_TOKEN',
            details: {
              VITE_TELEGRAM_BOT_TOKEN: '❌ FALTANDO',
              VITE_TELEGRAM_CHAT_ID: TELEGRAM_CHAT_ID ? '✅ Configurada' : '❌ FALTANDO',
            },
            message: 'A variável VITE_TELEGRAM_BOT_TOKEN não está configurada no arquivo .env',
          };
        }

        if (!TELEGRAM_CHAT_ID) {
          const tokenPreview = TELEGRAM_TOKEN.length > 10 
            ? TELEGRAM_TOKEN.substring(0, 10) + '...' 
            : TELEGRAM_TOKEN;
          
          return {
            success: false,
            error: 'Variável de ambiente faltando',
            missing: 'VITE_TELEGRAM_CHAT_ID',
            details: {
              VITE_TELEGRAM_BOT_TOKEN: `✅ Configurada (primeiros 10 chars: ${tokenPreview})`,
              VITE_TELEGRAM_CHAT_ID: '❌ FALTANDO',
            },
            message: 'A variável VITE_TELEGRAM_CHAT_ID não está configurada no arquivo .env',
          };
        }

        // 2. Log no Console
        const tokenPreview = TELEGRAM_TOKEN.length > 10 
          ? TELEGRAM_TOKEN.substring(0, 10) + '...' 
          : TELEGRAM_TOKEN;
        
        console.log('🔍 [DEBUG TELEGRAM] Tentando enviar mensagem para ID:', TELEGRAM_CHAT_ID, 'com Token:', tokenPreview);

        // 3. Preparar dados para o teste
        const testPhone = '5511999999999';
        let cleanPhone = testPhone.replace(/\D/g, '');
        if (cleanPhone.length <= 11) cleanPhone = `55${cleanPhone}`;

        const whatsappMessage = encodeURIComponent(
          '🔔 Teste de Diagnóstico do Sistema - Agendamento para 20/01 às 14:30'
        );
        const whatsappLink = `https://wa.me/${cleanPhone}?text=${whatsappMessage}`;

        const testMessage = `🔔 *Teste de Diagnóstico do Sistema*\n\n` +
          `Este é um teste automatizado para verificar a conexão com o Telegram.\n\n` +
          `✅ Token configurado: Sim\n` +
          `✅ Chat ID configurado: Sim\n\n` +
          `📱 [Testar Link do WhatsApp](${whatsappLink})`;

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
            parse_mode: 'Markdown',
            disable_web_page_preview: true,
          }),
        });

        // 5. Tratamento de Erro Robusto
        if (!response.ok) {
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

          let errorMessage = `Erro HTTP ${response.status}: ${response.statusText}`;
          
          if (errorDetails.description) {
            errorMessage = errorDetails.description;
          } else if (errorDetails.error_code === 400) {
            errorMessage = 'Erro 400: Requisição inválida. Verifique se o chat_id está correto.';
          } else if (errorDetails.error_code === 401) {
            errorMessage = 'Erro 401: Token inválido ou não autorizado. Verifique se o VITE_TELEGRAM_BOT_TOKEN está correto.';
          } else if (errorDetails.error_code === 403) {
            errorMessage = 'Erro 403: Bot bloqueado pelo usuário ou sem permissão para enviar mensagens.';
          } else if (errorDetails.error_code === 404) {
            errorMessage = 'Erro 404: Chat não encontrado. Verifique se o VITE_TELEGRAM_CHAT_ID está correto e se o bot iniciou conversa com o usuário.';
          }

          console.error('❌ [DEBUG TELEGRAM] Erro na resposta do Telegram:', {
            status: response.status,
            statusText: response.statusText,
            errorDetails,
          });

          return {
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
          };
        }

        // 6. Resposta de Sucesso
        const responseData = await response.json().catch(() => ({}));

        console.log('✅ [DEBUG TELEGRAM] Mensagem enviada com sucesso!', {
          message_id: responseData.result?.message_id,
          chat_id: responseData.result?.chat?.id,
        });

        return {
          success: true,
          message: 'Mensagem de teste enviada com sucesso!',
          telegram_response: responseData,
          diagnostics: {
            token_preview: tokenPreview,
            chat_id: TELEGRAM_CHAT_ID,
            message_sent: testMessage.substring(0, 50) + '...',
          },
        };
      };

      const testResult = await testTelegram();
      setResult(testResult);
      
    } catch (error: any) {
      console.error('❌ [DEBUG TELEGRAM] Erro ao executar teste:', error);
      setError(error?.message || String(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full glass-card rounded-xl p-6 border border-white/10"
      >
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            🔍 Diagnóstico do Telegram
          </h1>
          <p className="text-muted-foreground">
            Teste isolado para verificar a conexão com a API do Telegram
          </p>
        </div>

        <button
          onClick={handleTest}
          disabled={isLoading}
          className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-6"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Testando...
            </>
          ) : (
            '▶️ Executar Teste de Diagnóstico'
          )}
        </button>

        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-center gap-2 text-destructive mb-2">
              <XCircle className="w-5 h-5" />
              <span className="font-semibold">Erro na Execução</span>
            </div>
            <pre className="text-sm text-destructive/80 whitespace-pre-wrap font-mono">
              {error}
            </pre>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.success ? (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center gap-2 text-green-500 mb-3">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-semibold text-lg">✅ Sucesso!</span>
                </div>
                <p className="text-foreground mb-4">{result.message}</p>
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground mb-2">
                    Ver detalhes técnicos
                  </summary>
                  <pre className="text-xs bg-card/50 p-3 rounded border border-border overflow-auto max-h-64 text-foreground">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </details>
              </div>
            ) : (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-center gap-2 text-destructive mb-3">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-semibold text-lg">❌ Erro</span>
                </div>
                <p className="text-foreground mb-2 font-semibold">{result.error}</p>
                {result.error_message && (
                  <p className="text-muted-foreground mb-4">{result.error_message}</p>
                )}
                {result.details && (
                  <div className="mb-4 space-y-2">
                    {Object.entries(result.details).map(([key, value]) => (
                      <div key={key} className="text-sm">
                        <span className="font-mono text-muted-foreground">{key}:</span>{' '}
                        <span className={String(value).includes('❌') ? 'text-destructive' : 'text-green-500'}>
                          {String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground mb-2">
                    Ver detalhes técnicos completos
                  </summary>
                  <pre className="text-xs bg-card/50 p-3 rounded border border-border overflow-auto max-h-64 text-foreground">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 p-4 bg-muted/30 rounded-lg text-sm text-muted-foreground">
          <p className="font-semibold mb-2">ℹ️ Instruções:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Certifique-se de que as variáveis <code className="bg-background px-1 rounded">VITE_TELEGRAM_BOT_TOKEN</code> e <code className="bg-background px-1 rounded">VITE_TELEGRAM_CHAT_ID</code> estão no arquivo <code className="bg-background px-1 rounded">.env</code></li>
            <li>Reinicie o servidor de desenvolvimento após adicionar/modificar as variáveis</li>
            <li>Abra o console do navegador (F12) para ver logs detalhados</li>
          </ul>
        </div>
      </motion.div>
    </div>
  );
}
