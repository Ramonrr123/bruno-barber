import { useEffect, useMemo, useState } from 'react';
import { DollarSign, Calendar } from 'lucide-react';
import { addMonths, format, startOfMonth } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

function formatBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function StatsSkeleton() {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="h-6 w-28 bg-zinc-800 rounded animate-pulse" />
        <div className="h-11 w-[140px] sm:w-[160px] bg-zinc-800 rounded-lg animate-pulse flex-shrink-0" />
      </div>
      <div className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 md:p-6 animate-pulse">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3 flex-1 min-w-0">
            <div className="h-3 w-44 bg-zinc-800 rounded" />
            <div className="h-10 w-64 bg-zinc-800 rounded" />
          </div>
          <div className="w-11 h-11 bg-zinc-800 rounded-xl flex-shrink-0" />
        </div>
      </div>
    </div>
  );
}

export function DashboardStats() {
  const [isLoading, setIsLoading] = useState(true);
  const [revenue, setRevenue] = useState(0);

  // Período selecionado (padrão: mês atual)
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());

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
        // 1) Buscar agendamentos do mês atual com status EXATAMENTE 'confirmed'
        const { data: appts, error: apptError } = await supabase
          .from('appointments')
          .select('service_type')
          .eq('status', 'confirmed')
          .gte('appointment_date', startDateStr)
          .lt('appointment_date', endDateStr);

        if (apptError) throw apptError;

        const appointments = appts ?? [];
        if (appointments.length === 0) {
          if (!isMounted) return;
          setRevenue(0);
          return;
        }

        // 2) "JOIN" com services via service_type (nome do serviço)
        // OBS: como appointments não tem FK para services, fazemos o join no frontend por nome.
        const serviceNames = Array.from(
          new Set(appointments.map((a) => a.service_type).filter(Boolean))
        );

        const { data: services, error: servicesError } = await supabase
          .from('services')
          .select('name, price')
          .in('name', serviceNames);

        if (servicesError) throw servicesError;

        const priceByName = new Map<string, number>();
        (services ?? []).forEach((s) => {
          const price = typeof s.price === 'number' ? s.price : Number(s.price);
          priceByName.set(s.name, Number.isFinite(price) ? price : 0);
        });

        const revenue = appointments.reduce((sum, a) => {
          if (!a.service_type) return sum;
          const price = priceByName.get(a.service_type) ?? 0;
          return sum + price;
        }, 0);

        if (!isMounted) return;
        setRevenue(Number.isFinite(revenue) ? revenue : 0);
      } catch {
        // Falha silenciosa: dashboard não deve quebrar o /admin
        if (!isMounted) return;
        setRevenue(0);
      } finally {
        if (!isMounted) return;
        setIsLoading(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [startDateStr, endDateStr]);

  if (isLoading) return <StatsSkeleton />;

  return (
    <div className="mb-6">
      {/* Header com título e seletor */}
      <div className="flex items-center justify-between gap-3 mb-6">
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

      {/* Hero metric - Faturamento Real */}
      <div className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 md:p-6 hover:border-zinc-700 transition-colors">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-zinc-400 mb-2">Faturamento real (confirmados)</p>
            <p className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
              {formatBRL(revenue || 0)}
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-green-600/15 border border-green-600/25 flex items-center justify-center flex-shrink-0">
            <DollarSign className="w-5 h-5 text-green-500" />
          </div>
        </div>
      </div>
    </div>
  );
}

