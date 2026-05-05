import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { notification } from '@/hooks/useNotification';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Verificar se já está autenticado
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          navigate('/admin', { replace: true });
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setCheckingSession(false);
      }
    };

    checkSession();

    // Listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate('/admin', { replace: true });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    const finishWithSession = async (accessToken: string, refreshToken: string) => {
      const { error: setError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (setError) {
        notification.error(setError.message || 'Erro ao iniciar sessão.');
        return;
      }
      notification.success('Login realizado com sucesso!');
      navigate('/admin', { replace: true });
    };

    const loginDirect = async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });
      if (error) {
        notification.error(
          error.message === 'Invalid login credentials'
            ? 'Email ou senha incorretos.'
            : error.message
        );
        return;
      }
      if (data.session) {
        await finishWithSession(data.session.access_token, data.session.refresh_token);
      } else {
        notification.error('Sessão não criada. Tente novamente.');
      }
    };

    try {
      if (!supabaseUrl || !anonKey) {
        notification.error('Erro de configuração. Verifique as variáveis de ambiente do Supabase');
        return;
      }

      const loginUrl = `${supabaseUrl}/functions/v1/login`;
      let res: Response;
      try {
        res = await fetch(loginUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
          },
          body: JSON.stringify({ email: cleanEmail, password: cleanPassword }),
        });
      } catch {
        console.warn('[login] Edge Function indisponível ou CORS — usando Auth direto (sem rate limit na borda).');
        await loginDirect();
        return;
      }

      if (res.status === 404) {
        console.warn(
          '[login] Função Edge `login` não encontrada — faça `supabase functions deploy login`. Usando Auth direto.',
        );
        await loginDirect();
        return;
      }

      const body = await res.json().catch(() => ({}));

      if (res.status === 429) {
        notification.error(body?.error || 'Muitas tentativas. Por favor, aguarde 15 minutos.');
        return;
      }

      if (!res.ok) {
        notification.error(body?.error || 'Erro ao fazer login. Verifique suas credenciais.');
        return;
      }

      if (body?.session) {
        await finishWithSession(body.session.access_token, body.session.refresh_token);
      } else {
        notification.error('Sessão não criada. Tente novamente.');
      }
    } catch (error: unknown) {
      console.error('Login error:', error);
      notification.error('Erro de conexão. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img
            src="/brunologo.jpg"
            alt="Logo Kings Barber Shop"
            width={176}
            height={176}
            decoding="async"
            className="h-44 w-44 rounded-full object-cover object-center shadow-lg ring-2 ring-border/40"
            onError={(e) => {
              // Fallback se a imagem não existir
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        </div>

        {/* Form */}
        <div className="glass-card rounded-xl p-8 border border-border">
          <h1 className="text-2xl font-bold text-foreground mb-6 text-center">
            Login Administrativo
          </h1>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="seu@email.com"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
