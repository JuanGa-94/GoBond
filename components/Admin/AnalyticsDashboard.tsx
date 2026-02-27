
import React, { useState, useEffect } from 'react';
import { analytics } from '../../services/analytics';

// Componentes de gráfico nativos (CSS/React) para reemplazar D3.js
const SimpleBarChart: React.FC<{ data: { name: string; value: number }[]; title: string }> = ({ data, title }) => {
    const maxValue = Math.max(...data.map(d => d.value), 1);

    if (data.length === 0) {
        return (
            <div className="bg-surface p-6 rounded-3xl border border-border-subtle">
                <h4 className="text-xs font-bold text-text/40 uppercase tracking-widest mb-4">{title}</h4>
                <div className="h-40 flex items-center justify-center border-2 border-dashed border-border-subtle rounded-2xl">
                    <p className="text-[10px] font-bold text-text/20 uppercase tracking-widest">Sin datos suficientes</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-surface p-6 rounded-3xl border border-border-subtle hover:shadow-lg transition-all duration-300">
            <h4 className="text-xs font-bold text-text/40 uppercase tracking-widest mb-6">{title}</h4>
            <div className="space-y-4">
                {data.map((item, i) => (
                    <div key={i} className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-text/60 uppercase">
                            <span>{item.name}</span>
                            <span>{item.value}</span>
                        </div>
                        <div className="h-2 w-full bg-surface-variant rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${(item.value / maxValue) * 100}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const SimpleFunnelChart: React.FC<{ data: { step: string; count: number }[] }> = ({ data }) => {
    // Definir orden estándar del embudo
    const order = ['session_start', 'search', 'frequency_click', 'countdown_activated'];
    const labels: Record<string, string> = {
        'session_start': 'Sesiones',
        'search': 'Búsquedas',
        'frequency_click': 'Interés',
        'countdown_activated': 'Confirmados'
    };

    const sortedData = order.map(step => {
        const item = data.find(d => d.step === step);
        return { step: labels[step] || step, count: item?.count || 0 };
    });

    const maxCount = Math.max(...sortedData.map(d => d.count), 1);

    if (maxCount === 0) {
        return (
            <div className="bg-surface p-6 rounded-3xl border border-border-subtle">
                <h4 className="text-xs font-bold text-text/40 uppercase tracking-widest mb-4">Embudo de Conversión</h4>
                <div className="h-64 flex items-center justify-center border-2 border-dashed border-border-subtle rounded-2xl">
                    <p className="text-[10px] font-bold text-text/20 uppercase tracking-widest">Esperando eventos...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-surface p-6 rounded-3xl border border-border-subtle hover:shadow-lg transition-all duration-300">
            <h4 className="text-xs font-bold text-text/40 uppercase tracking-widest mb-6">Embudo de Conversión</h4>
            <div className="flex flex-col items-center space-y-2">
                {sortedData.map((item, i) => {
                    const widthPercent = (item.count / maxCount) * 100;
                    const nextItem = sortedData[i + 1];
                    const nextWidthPercent = nextItem ? (nextItem.count / maxCount) * 100 : widthPercent;

                    return (
                        <React.Fragment key={i}>
                            <div
                                className="relative flex items-center justify-center h-12 bg-primary/10 border border-primary/20 rounded-xl transition-all duration-1000 overflow-hidden group hover:bg-primary/20"
                                style={{ width: `${Math.max(widthPercent, 20)}%` }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent"></div>
                                <div className="z-10 text-center">
                                    <p className="text-[10px] font-black text-primary uppercase">{item.step}</p>
                                    <p className="text-sm font-bold text-text">{item.count}</p>
                                </div>
                            </div>
                            {i < sortedData.length - 1 && (
                                <div className="w-px h-4 bg-border-subtle relative">
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary/30"></div>
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};

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
        <div className="space-y-10 animate-fade-in px-4 pb-20">
            <header className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-text">Métricas en Tiempo Real</h2>
                <button
                    onClick={() => {
                        setLoading(true);
                        analytics.getStats().then(setStats).finally(() => setLoading(false));
                    }}
                    className="p-3 bg-surface border border-border-subtle rounded-full hover:bg-primary-muted transition-colors group"
                    title="Refrescar datos"
                >
                    <svg className="w-4 h-4 text-text/40 group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </header>

            {/* Header / Stats Summary */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-surface p-8 rounded-3xl border border-border-subtle shadow-sm flex flex-col justify-between">
                    <div>
                        <p className="text-[10px] font-bold text-text/40 uppercase tracking-widest mb-1">Tiempo prom. uso</p>
                        <p className="text-4xl font-black text-primary">{Math.round(stats.average_usage?.avg_minutes || 0)} <span className="text-lg font-bold text-text/40">min</span></p>
                    </div>
                </div>
                <div className="bg-surface p-8 rounded-3xl border border-border-subtle shadow-sm flex flex-col justify-between">
                    <div>
                        <p className="text-[10px] font-bold text-text/40 uppercase tracking-widest mb-1">Usuarios Retenidos</p>
                        <p className="text-4xl font-black text-primary">{stats.retention?.[0]?.users || 0}</p>
                    </div>
                    <p className="text-[10px] font-bold text-text/20 uppercase mt-2">Esta semana</p>
                </div>
                <div className="bg-surface p-8 rounded-3xl border border-border-subtle shadow-sm flex flex-col justify-between">
                    <div>
                        <p className="text-[10px] font-bold text-text/40 uppercase tracking-widest mb-1">Total Sesiones (30d)</p>
                        <p className="text-4xl font-black text-primary">{stats.funnel?.find((f: any) => f.step === 'session_start')?.count || 0}</p>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <SimpleBarChart
                    title="Destinos más buscados"
                    data={stats.top_destinations || []}
                />
                <SimpleBarChart
                    title="Empresas más elegidas"
                    data={stats.top_companies?.map((c: any) => ({ name: c.id, value: c.value })) || []}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <SimpleFunnelChart data={stats.funnel || []} />
                <SimpleBarChart
                    title="Frecuencias Fantasma (Abandono)"
                    data={stats.ghost_frequencies?.map((g: any) => ({ name: `ID: ${g.schedule_id}`, value: g.count })) || []}
                />
            </div>
        </div>
    );
};
