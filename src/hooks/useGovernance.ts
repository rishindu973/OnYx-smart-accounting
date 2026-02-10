import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export type GovernanceDayStatus = 'BLUE' | 'YELLOW' | 'RED';

export interface GovernanceDaySummary {
  date: string; // YYYY-MM-DD
  limitAmount: number;
  currentSpending: number;
  remainingAmount: number;
  usedPercent: number;
  status: GovernanceDayStatus;
  blocked: boolean;
}

export interface GovernanceMonthCalendar {
  month: string;
  days: GovernanceDaySummary[];
}

export function useGovernanceMonth(month: string, companyId: string) {
  const [data, setData] = useState<GovernanceMonthCalendar | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchMonth = useCallback(async () => {
    if (!month || !companyId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/governance/calendar?month=${month}&companyId=${companyId}`);
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err?.error?.message || 'Failed to load calendar');
      }
      const result = await response.json();
      setData(result.data);
    } catch (err: any) {
      const message = err.message || 'Failed to load governance calendar';
      setError(message);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: message,
      });
    } finally {
      setLoading(false);
    }
  }, [month, companyId, toast]);

  useEffect(() => {
    fetchMonth();
  }, [fetchMonth]);

  return { data, loading, error, refetch: fetchMonth };
}

export function useGovernanceDay(date: string, companyId: string) {
  const [data, setData] = useState<GovernanceDaySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchDay = useCallback(async () => {
    if (!date || !companyId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/governance/day/${date}?companyId=${companyId}`);
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err?.error?.message || 'Failed to load day summary');
      }
      const result = await response.json();
      setData(result.data);
    } catch (err: any) {
      const message = err.message || 'Failed to load governance summary';
      setError(message);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: message,
      });
    } finally {
      setLoading(false);
    }
  }, [date, companyId, toast]);

  useEffect(() => {
    fetchDay();
  }, [fetchDay]);

  return { data, loading, error, refetch: fetchDay };
}

export function useSetDailyLimit() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const setLimit = useCallback(
    async (args: { date: string; limitAmount: number; companyId: string }) => {
      setLoading(true);

      try {
        const response = await fetch(`/api/governance/day/${args.date}/limit`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            limitAmount: args.limitAmount,
            companyId: args.companyId,
          }),
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err?.error?.message || 'Failed to set daily limit');
        }

        const result = await response.json();
        if (result.notification) {
          toast(result.notification);
        }
        return result.data;
      } catch (err: any) {
        const message = err.message || 'Failed to set daily limit';
        toast({
          variant: 'destructive',
          title: 'Error',
          description: message,
        });
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  return { setLimit, loading };
}

export function useValidateCheque() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const validate = useCallback(
    async (args: { date: string; amount: number; companyId: string }) => {
      setLoading(true);

      try {
        const response = await fetch('/api/governance/validate-cheque', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(args),
        });

        if (!response.ok) {
          const err = await response.json();
          if (err.notification) {
            toast(err.notification);
          }
          throw new Error(err?.error?.message || 'Cheque validation failed');
        }

        const result = await response.json();
        return result.data;
      } catch (err: any) {
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  return { validate, loading };
}
