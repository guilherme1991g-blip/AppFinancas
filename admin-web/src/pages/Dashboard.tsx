import { useEffect, useState } from 'react';
import {
    Users,
    ArrowLeftRight,
    TrendingUp,
    Activity,
    ArrowUpRight,
    ArrowDownRight,
    RotateCcw,
    Settings
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { adminService } from '../services/api';

const StatCard = ({ title, value, icon: Icon, trend, trendValue, loading }: any) => (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-brand-50 rounded-xl text-brand-600">
                <Icon className="w-6 h-6" />
            </div>
            {trend && (
                <div className={cn(
                    "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
                    trend === 'up' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                )}>
                    {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {trendValue}
                </div>
            )}
        </div>
        <div>
            <p className="text-sm text-slate-500 mb-1">{title}</p>
            {loading ? (
                <div className="h-8 w-24 bg-slate-100 animate-pulse rounded"></div>
            ) : (
                <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
            )}
        </div>
    </div>
);

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}

const data = [
    { name: 'Jan', value: 4000 },
    { name: 'Fev', value: 3000 },
    { name: 'Mar', value: 5000 },
    { name: 'Abr', value: 4500 },
    { name: 'Mai', value: 6000 },
    { name: 'Jun', value: 5500 },
];

export default function Dashboard() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await adminService.getStats();
                setStats(response.data);
            } catch (err) {
                console.error('Error fetching stats:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Visão Geral</h1>
                    <p className="text-slate-500">Acompanhe o desempenho do sistema em tempo real</p>
                </div>
                <button
                    onClick={() => { setLoading(true); window.location.reload(); }}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                    <RotateCcw className="w-4 h-4" />
                    Atualizar
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total de Usuários"
                    value={stats?.total_users || 0}
                    icon={Users}
                    trend="up"
                    trendValue="12%"
                    loading={loading}
                />
                <StatCard
                    title="Transações (Mês)"
                    value={stats?.total_transactions || 0}
                    icon={ArrowLeftRight}
                    trend="up"
                    trendValue="8%"
                    loading={loading}
                />
                <StatCard
                    title="Volume Financeiro"
                    value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats?.total_volume || 0)}
                    icon={TrendingUp}
                    trend="down"
                    trendValue="3%"
                    loading={loading}
                />
                <StatCard
                    title="Usuários Ativos"
                    value={stats?.active_users_recent || 0}
                    icon={Activity}
                    trend="up"
                    trendValue="15%"
                    loading={loading}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-900">Crescimento da Plataforma</h3>
                        <select className="bg-slate-50 border-none outline-none text-xs font-medium text-slate-500 rounded-lg px-2 py-1">
                            <option>Últimos 6 meses</option>
                        </select>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '12px',
                                        border: 'none',
                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                        fontSize: '12px'
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#0ea5e9"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorValue)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="font-bold text-slate-900 mb-6">Ações Rápidas</h3>
                    <div className="space-y-3">
                        <button className="w-full flex items-center gap-3 p-4 rounded-xl bg-slate-50 hover:bg-brand-50 hover:text-brand-600 transition-all text-slate-600 font-medium text-sm group text-left">
                            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center group-hover:border-brand-200">
                                <Users className="w-4 h-4" />
                            </div>
                            Gerenciar Usuários
                        </button>
                        <button className="w-full flex items-center gap-3 p-4 rounded-xl bg-slate-50 hover:bg-brand-50 hover:text-brand-600 transition-all text-slate-600 font-medium text-sm group text-left">
                            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center group-hover:border-brand-200">
                                <ArrowLeftRight className="w-4 h-4" />
                            </div>
                            Ver Transações
                        </button>
                        <button className="w-full flex items-center gap-3 p-4 rounded-xl bg-slate-50 hover:bg-brand-50 hover:text-brand-600 transition-all text-slate-600 font-medium text-sm group text-left">
                            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center group-hover:border-brand-200">
                                <Settings className="w-4 h-4" />
                            </div>
                            Configurações do Sistema
                        </button>
                    </div>

                    <div className="mt-8 p-4 bg-brand-600 rounded-xl text-white">
                        <h4 className="font-bold text-sm mb-1">Dica do Sistema</h4>
                        <p className="text-xs text-brand-100 leading-relaxed">
                            Você pode promover qualquer usuário a administrador na tela de gestão de usuários.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
