import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getExchangeRate, type ExchangeRate } from "@/lib/exchange.functions";
import {
  listBlacklist,
  listHolidays,
  listIncomeTimeline,
  listPortfolio,
  type IncomePoint,
} from "@/lib/rentals.functions";

export function useRentals() {
  const { user } = useCurrentUserState();
  const enabled = Boolean(user);
  const portfolio = useQuery({
    queryKey: ["portfolio"],
    queryFn: () => listPortfolio(),
    enabled,
    // Caché de cliente: 30 s evitan reconsultar al volver a una pestaña,
    // sin castigar la frescura de los cobros del mes.
    staleTime: 30_000,
  });
  const holidays = useQuery({
    queryKey: ["holidays"],
    queryFn: () => listHolidays(),
    enabled,
    staleTime: 12 * 60 * 60 * 1000,
  });
  const blacklist = useQuery({
    queryKey: ["blacklist"],
    queryFn: () => listBlacklist(),
    enabled,
    staleTime: 30_000,
  });
  return { portfolio, holidays, blacklist };
}

/** Tipo de cambio USD→MXN (Banxico vía GitHub / BCE). Caché: 6 h. */
export function useExchangeRate() {
  const { user } = useCurrentUserState();
  return useQuery<ExchangeRate | null>({
    queryKey: ["exchange-rate"],
    queryFn: () => getExchangeRate(),
    enabled: Boolean(user),
    staleTime: 6 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });
}

/** Cobros por mes de los últimos 12 meses (gráfica de Ingresos). */
export function useIncomeTimeline() {
  const { user } = useCurrentUserState();
  return useQuery<IncomePoint[]>({
    queryKey: ["income-timeline"],
    queryFn: () => listIncomeTimeline(),
    enabled: Boolean(user),
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useRefreshRentals() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["portfolio"] });
    void qc.invalidateQueries({ queryKey: ["blacklist"] });
    void qc.invalidateQueries({ queryKey: ["history"] });
    void qc.invalidateQueries({ queryKey: ["month"] });
    void qc.invalidateQueries({ queryKey: ["adjustments"] });
    void qc.invalidateQueries({ queryKey: ["income-timeline"] });
  };
}
