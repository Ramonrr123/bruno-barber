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

    try {
      // Debug: verificar se as variáveis de ambiente estão configuradas
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        console.error('Variáveis de ambiente não configuradas:', {
          url: !!supabaseUrl,
          key: !!supabaseKey
        });
        notification.error('Erro de configuração: Verifique as variáveis de ambiente do Supabase');
        return;
      }

      // Limpar email de espaços e converter para lowercase
      const cleanEmail = email.trim().toLowerCase();
      
      console.log('Tentando fazer login com:', { email: cleanEmail });
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password.trim(),
      });

      if (error) {
        console.error('Erro do Supabase:', {
          message: error.message,
          status: error.status,
          name: error.name
        });
        throw error;
      }

      console.log('Login bem-sucedido:', { session: !!data.session });

      if (data.session) {
        notification.success('Login realizado com sucesso!');
        navigate('/admin', { replace: true });
      } else {
        notification.error('Sessão não criada. Tente novamente.');
      }
    } catch (error: any) {
      console.error('Login error completo:', error);
      
      // Mensagem de erro mais clara e específica
      let errorMessage = 'Erro ao fazer login. Verifique suas credenciais.';
      
      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = 'Email ou senha incorretos. No Supabase Dashboard → Authentication → Users, edite o usuário e defina uma nova senha, ou use "Send Password Reset Email".';
      } else if (error.message?.includes('Email not confirmed')) {
        errorMessage = 'Email não confirmado. Verifique seu email ou ative "Auto Confirm User" no Supabase.';
      } else if (error.message?.includes('User not found')) {
        errorMessage = 'Usuário não encontrado. Verifique se o usuário foi criado corretamente no Supabase.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      notification.error(errorMessage);
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
            src="/logo.png"
            alt="Logo Barbearia"
            className="h-24 w-24 object-contain"
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
