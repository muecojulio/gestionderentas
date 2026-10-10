import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  listBlacklist,
  listHolidays,
  listPortfolio,
} from "@/lib/rentals.functions";

export function useRentals() {
  const { user } = useCurrentUserState();
  const enabled = Boolean(user);
  const portfolio = useQuery({
    queryKey: ["portfolio"],
    queryFn: () => listPortfolio(),
    enabled,
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
  });
  return { portfolio, holidays, blacklist };
}

export function useRefreshRentals() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["portfolio"] });
    void qc.invalidateQueries({ queryKey: ["blacklist"] });
    void qc.invalidateQueries({ queryKey: ["history"] });
    void qc.invalidateQueries({ queryKey: ["month"] });
  };
}
