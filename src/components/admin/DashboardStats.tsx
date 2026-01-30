import { useEffect, useMemo, useState } from 'react';
import { DollarSign, Calendar, CalendarDays } from 'lucide-react';
import { addMonths, format, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

function formatBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function StatsSkeleton() {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="h-6 w-28 bg-zinc-800 rounded animate-pulse" />
        <div className="h-11 w-[140px] sm:w-[160px] bg-zinc-800 rounded-lg animate-pulse flex-shrink-0" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 animate-pulse">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3 flex-1 min-w-0">
              <div className="h-3 w-32 bg-zinc-800 rounded" />
              <div className="h-8 w-40 bg-zinc-800 rounded" />
            </div>
            <div className="w-10 h-10 bg-zinc-800 rounded-xl flex-shrink-0" />
          </div>
        </div>
        <div className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 animate-pulse">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3 flex-1 min-w-0">
              <div className="h-3 w-32 bg-zinc-800 rounded" />
              <div className="h-8 w-40 bg-zinc-800 rounded" />
            </div>
            <div className="w-10 h-10 bg-zinc-800 rounded-xl flex-shrink-0" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardStats() {
  const [isLoading, setIsLoading] = useState(true);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [dailyRevenue, setDailyRevenue] = useState(0);

  // Período selecionado (padrão: mês atual)
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());

  // Data de hoje para faturamento diário
  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const todayDisplay = useMemo(() => format(new Date(), "d 'de' MMMM", { locale: ptBR }), []);

  const { startDateStr, endDateStr, monthInputValue } = useMemo(() => {
    const start = startOfMonth(selectedDate);
    const end = addMonths(start, 1);
    return {
      startDateStr: format(start, 'yyyy-MM-dd'),
      endDateStr: format(end, 'yyyy-MM-dd'),
      monthInputValue: format(selectedDate, 'yyyy-MM'),
    };
  }, [selectedDate]);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      try {
        // 1) Buscar todos os serviços primeiro para fazer o join
        const { data: services, error: servicesError } = await supabase
          .from('services')
          .select('name, price');

        if (servicesError) throw servicesError;

        const priceByName = new Map<string, number>();
        (services ?? []).forEach((s) => {
          const price = typeof s.price === 'number' ? s.price : Number(s.price);
          priceByName.set(s.name, Number.isFinite(price) ? price : 0);
        });

        // 2) Buscar agendamentos do mês selecionado com status 'confirmed'
        const { data: monthlyAppts, error: monthlyError } = await supabase
          .from('appointments')
          .select('service_type')
          .eq('status', 'confirmed')
          .gte('appointment_date', startDateStr)
          .lt('appointment_date', endDateStr);

        if (monthlyError) throw monthlyError;

        const monthlyTotal = (monthlyAppts ?? []).reduce((sum, a) => {
          if (!a.service_type) return sum;
          const price = priceByName.get(a.service_type) ?? 0;
          return sum + price;
        }, 0);

        // 3) Buscar agendamentos do dia atual com status 'confirmed'
        const { data: dailyAppts, error: dailyError } = await supabase
          .from('appointments')
          .select('service_type')
          .eq('status', 'confirmed')
          .eq('appointment_date', todayStr);

        if (dailyError) throw dailyError;

        const dailyTotal = (dailyAppts ?? []).reduce((sum, a) => {
          if (!a.service_type) return sum;
          const price = priceByName.get(a.service_type) ?? 0;
          return sum + price;
        }, 0);

        if (!isMounted) return;
        setMonthlyRevenue(Number.isFinite(monthlyTotal) ? monthlyTotal : 0);
        setDailyRevenue(Number.isFinite(dailyTotal) ? dailyTotal : 0);
      } catch {
        // Falha silenciosa: dashboard não deve quebrar o /admin
        if (!isMounted) return;
        setMonthlyRevenue(0);
        setDailyRevenue(0);
      } finally {
        if (!isMounted) return;
        setIsLoading(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [startDateStr, endDateStr, todayStr]);

  if (isLoading) return <StatsSkeleton />;

  return (
    <div className="mb-6">
      {/* Header com título e seletor */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-lg md:text-2xl font-bold text-zinc-100 leading-tight">
          Financeiro
        </h2>

        {/* Seletor de período - Simples e direto (Mobile First) */}
        <label className="relative flex-shrink-0 cursor-pointer">
          <input
            type="month"
            value={monthInputValue}
            onChange={(e) => {
              const value = e.target.value; // yyyy-MM
              const [yearStr, monthStr] = value.split('-');
              const year = Number(yearStr);
              const month = Number(monthStr);
              if (!year || !month) return;
              setSelectedDate(new Date(year, month - 1, 1));
            }}
            className="h-11 min-w-[140px] sm:min-w-[160px] bg-zinc-800 border border-zinc-700 rounded-lg px-3 pr-10 text-sm text-zinc-100 cursor-pointer transition-colors hover:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-green-600/40 focus:border-green-600/40 appearance-none"
            aria-label="Selecionar mês e ano"
          />
          <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300 pointer-events-none" />
        </label>
      </div>

      {/* Cards de faturamento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Faturamento do Dia */}
        <div className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 md:p-5 hover:border-zinc-700 transition-colors">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-zinc-400 mb-1">Hoje ({todayDisplay})</p>
              <p className="text-2xl md:text-3xl font-bold text-emerald-400 tracking-tight">
                {formatBRL(dailyRevenue || 0)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-600/15 border border-emerald-600/25 flex items-center justify-center flex-shrink-0">
              <CalendarDays className="w-5 h-5 text-emerald-500" />
            </div>
          </div>
        </div>

        {/* Faturamento Mensal */}
        <div className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 md:p-5 hover:border-zinc-700 transition-colors">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-zinc-400 mb-1">Mês (confirmados)</p>
              <p className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                {formatBRL(monthlyRevenue || 0)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-green-600/15 border border-green-600/25 flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

