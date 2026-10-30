import { useCallback, useEffect, useState } from 'react';
import {
    getDashboardCharts,
    getDashboardSummary,
    type DashboardCharts,
    type DashboardSummary,
} from '../api/analytics';

export function useAnalytics() {
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [charts, setCharts] = useState<DashboardCharts | null>(null);
    const [summaryLoading, setSummaryLoading] = useState(true);
    const [chartsLoading, setChartsLoading] = useState(true);
    const [summaryError, setSummaryError] = useState('');
    const [chartsError, setChartsError] = useState('');

    const refresh = useCallback(async () => {
        setSummaryLoading(true);
        setChartsLoading(true);
        setSummaryError('');
        setChartsError('');
        const summaryRequest = getDashboardSummary()
            .then(setSummary)
            .catch((loadError: unknown) => setSummaryError(
                loadError instanceof Error ? loadError.message : 'Could not load analytics summary.',
            ))
            .finally(() => setSummaryLoading(false));
        const chartsRequest = getDashboardCharts()
            .then(setCharts)
            .catch((loadError: unknown) => setChartsError(
                loadError instanceof Error ? loadError.message : 'Could not load analytics charts.',
            ))
            .finally(() => setChartsLoading(false));
        await Promise.all([summaryRequest, chartsRequest]);
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => void refresh(), 0);
        return () => window.clearTimeout(timer);
    }, [refresh]);

    return {
        summary,
        charts,
        summaryLoading,
        chartsLoading,
        summaryError,
        chartsError,
        refresh,
    };
}
