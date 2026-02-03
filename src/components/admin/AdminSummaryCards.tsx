import { useEffect, useState } from 'react';
import { CalendarDays, CalendarRange, Calendar } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

function formatBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export interface AdminSummaryCardsProps {
  /** Data usada para calcular a semana (a semana que contém esta data) */
  weekAnchor: Date;
}

export function AdminSummaryCards({ weekAnchor }: AdminSummaryCardsProps) {
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [weekRevenue, setWeekRevenue] = useState(0);
  const [weekCount, setWeekCount] = useState(0);
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [monthCount, setMonthCount] = useState(0);
  const [loading, setLoading] = useState(true);
  // Mês escolhido para o card "Mês" (yyyy-MM); padrão = mês atual
  const [selectedMonthValue, setSelectedMonthValue] = useState(() =>
    format(new Date(), 'yyyy-MM')
  );

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const weekStart = startOfWeek(weekAnchor, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekAnchor, { weekStartsOn: 1 });
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const weekEndStr = format(weekEnd, 'yyyy-MM-dd');
  const [year, month] = selectedMonthValue.split('-').map(Number);
  const monthStart = startOfMonth(new Date(year, month - 1, 1));
  const monthEnd = endOfMonth(new Date(year, month - 1, 1));
  const monthStartStr = format(monthStart, 'yyyy-MM-dd');
  const monthEndStr = format(monthEnd, 'yyyy-MM-dd');

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const { data: services, error: servicesError } = await supabase
          .from('services')
          .select('name, price');

        if (servicesError) throw servicesError;

        const priceByName = new Map<string, number>();
        (services ?? []).forEach((s) => {
          const price = typeof s.price === 'number' ? s.price : Number(s.price);
          priceByName.set(s.name, Number.isFinite(price) ? price : 0);
        });

        // Faturamento: agendamentos confirmados + concluídos
        const { data: todayAppts, error: todayError } = await supabase
          .from('appointments')
          .select('service_type')
          .in('status', ['confirmed', 'completed'])
          .eq('appointment_date', todayStr);

        if (todayError) throw todayError;

        const todayTotal = (todayAppts ?? []).reduce((sum, a) => {
          if (!a.service_type) return sum;
          return sum + (priceByName.get(a.service_type) ?? 0);
        }, 0);

        const { data: weekAppts, error: weekError } = await supabase
          .from('appointments')
          .select('service_type')
          .in('status', ['confirmed', 'completed'])
          .gte('appointment_date', weekStartStr)
          .lte('appointment_date', weekEndStr);

        if (weekError) throw weekError;

        const weekTotal = (weekAppts ?? []).reduce((sum, a) => {
          if (!a.service_type) return sum;
          return sum + (priceByName.get(a.service_type) ?? 0);
        }, 0);

        const { data: monthAppts, error: monthError } = await supabase
          .from('appointments')
          .select('service_type')
          .in('status', ['confirmed', 'completed'])
          .gte('appointment_date', monthStartStr)
          .lte('appointment_date', monthEndStr);

        if (monthError) throw monthError;

        const monthTotal = (monthAppts ?? []).reduce((sum, a) => {
          if (!a.service_type) return sum;
          return sum + (priceByName.get(a.service_type) ?? 0);
        }, 0);

        if (!isMounted) return;
        setTodayRevenue(Number.isFinite(todayTotal) ? todayTotal : 0);
        setTodayCount((todayAppts ?? []).length);
        setWeekRevenue(Number.isFinite(weekTotal) ? weekTotal : 0);
        setWeekCount((weekAppts ?? []).length);
        setMonthRevenue(Number.isFinite(monthTotal) ? monthTotal : 0);
        setMonthCount((monthAppts ?? []).length);
      } catch {
        if (!isMounted) return;
        setTodayRevenue(0);
        setTodayCount(0);
        setWeekRevenue(0);
        setWeekCount(0);
        setMonthRevenue(0);
        setMonthCount(0);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [todayStr, weekStartStr, weekEndStr, monthStartStr, monthEndStr, selectedMonthValue]);

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="glass-card rounded-lg p-2.5 animate-pulse h-[72px]" />
        <div className="glass-card rounded-lg p-2.5 animate-pulse h-[72px]" />
        <div className="glass-card rounded-lg p-2.5 animate-pulse h-[72px]" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 mb-4">
      <div className="glass-card rounded-lg p-2.5 border border-border flex flex-col min-w-0">
        <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 truncate">Hoje</p>
        <p className="text-sm sm:text-base font-bold text-primary tracking-tight leading-tight">
          {formatBRL(todayRevenue)}
        </p>
        <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{todayCount}</p>
        <div className="mt-auto pt-1 flex justify-end">
          <CalendarDays className="w-7 h-7 text-primary/70" />
        </div>
      </div>
      <div className="glass-card rounded-lg p-2.5 border border-border flex flex-col min-w-0">
        <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 truncate">Semana</p>
        <p className="text-sm sm:text-base font-bold text-foreground tracking-tight leading-tight">
          {formatBRL(weekRevenue)}
        </p>
        <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{weekCount}</p>
        <div className="mt-auto pt-1 flex justify-end">
          <CalendarRange className="w-7 h-7 text-muted-foreground" />
        </div>
      </div>
      <div className="glass-card rounded-lg p-2.5 border border-border flex flex-col min-w-0">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Mês</p>
          <label className="flex-shrink-0 cursor-pointer" title="Escolher mês">
            <input
              type="month"
              value={selectedMonthValue}
              onChange={(e) => setSelectedMonthValue(e.target.value)}
              className="w-[min(100%,88px)] min-w-0 h-6 text-[10px] sm:text-xs bg-muted/80 border border-border rounded px-1 text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label="Escolher mês"
            />
          </label>
        </div>
        <p className="text-sm sm:text-base font-bold text-foreground tracking-tight leading-tight">
          {formatBRL(monthRevenue)}
        </p>
        <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{monthCount}</p>
        <div className="mt-auto pt-1 flex justify-end">
          <Calendar className="w-7 h-7 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}
