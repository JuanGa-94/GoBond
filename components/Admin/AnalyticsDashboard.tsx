
import React, { useState, useEffect } from 'react';
import { analytics } from '../../services/analytics';
import { BarChart, FunnelChart } from './AnalyticsCharts';

export const AnalyticsDashboard: React.FC = () => {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true);
                const data = await analytics.getStats();
                setStats(data);
            } catch (err: any) {
                console.error('Fetch stats error:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) return (
        <div className="flex items-center justify-center p-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
    );

    if (error) return (
        <div className="p-10 bg-red-50 dark:bg-red-900/20 rounded-3xl text-red-500 font-bold">
            Error al cargar métricas: {error}
        </div>
    );

    if (!stats) return null;

    return (
        <div className="space-y-10 animate-fade-in">
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-surface p-8 rounded-3xl border border-border-subtle">
                    <p className="text-[10px] font-bold text-text/40 uppercase tracking-widest mb-2">Tiempo prom. uso</p>
                    <p className="text-3xl font-black text-primary">{Math.round(stats.average_usage?.avg_minutes || 0)} min</p>
                </div>
                {/* Retention placeholder / Summary */}
                <div className="bg-surface p-8 rounded-3xl border border-border-subtle">
                    <p className="text-[10px] font-bold text-text/40 uppercase tracking-widest mb-2">Usuarios Retenidos</p>
                    <p className="text-3xl font-black text-primary">{stats.retention?.[0]?.users || 0}</p>
                    <p className="text-[10px] font-bold text-text/20 uppercase">Esta semana</p>
                </div>
                <div className="bg-surface p-8 rounded-3xl border border-border-subtle">
                    <p className="text-[10px] font-bold text-text/40 uppercase tracking-widest mb-2">Total Sesiones (30d)</p>
                    <p className="text-3xl font-black text-primary">{stats.funnel?.find((f: any) => f.step === 'session_start')?.count || 0}</p>
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <BarChart
                    title="Destinos más buscados"
                    data={stats.top_destinations || []}
                />
                <BarChart
                    title="Empresas más elegidas"
                    data={stats.top_companies?.map((c: any) => ({ name: c.id, value: c.value })) || []}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <FunnelChart data={stats.funnel || []} />
                <BarChart
                    title="Frecuencias Fantasma (Abandono)"
                    data={stats.ghost_frequencies?.map((g: any) => ({ name: `ID: ${g.schedule_id}`, value: g.count })) || []}
                />
            </div>
        </div>
    );
};
