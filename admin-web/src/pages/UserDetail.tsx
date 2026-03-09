import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    User,
    Mail,
    Phone,
    MapPin,
    Calendar,
    CreditCard,
    Wallet,
    BarChart3,
    Shield,
    MessageCircle,
    Loader2,
    Check,
    Sparkles,
    Crown,
    Zap,
    Clock,
    AlertTriangle,
    Gift
} from 'lucide-react';
import { adminService } from '../services/api';

const PLANS = [
    {
        id: 'free',
        name: 'Grátis',
        price: 'R$ 0',
        icon: Zap,
        color: 'slate',
        bgGradient: 'from-slate-50 to-slate-100',
        borderColor: 'border-slate-200',
        textColor: 'text-slate-700',
        btnClass: 'bg-slate-600 hover:bg-slate-700',
        features: ['1 conta bancária', 'Sem cartão de crédito', '20 transações/mês', '2 agendamentos', 'Sem ferramentas extras', 'Sem WhatsApp'],
    },
    {
        id: 'basic',
        name: 'Básico',
        price: 'R$ 9,90',
        icon: Sparkles,
        color: 'blue',
        bgGradient: 'from-blue-50 to-indigo-50',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-700',
        btnClass: 'bg-blue-600 hover:bg-blue-700',
        features: ['Contas ilimitadas', 'Cartões ilimitados', 'Transações ilimitadas', 'Agendamentos ilimitados', 'Todas as ferramentas', 'Sem WhatsApp'],
    },
    {
        id: 'premium',
        name: 'Premium',
        price: 'R$ 19,90',
        icon: Crown,
        color: 'amber',
        bgGradient: 'from-amber-50 to-orange-50',
        borderColor: 'border-amber-200',
        textColor: 'text-amber-700',
        btnClass: 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600',
        features: ['Contas ilimitadas', 'Cartões ilimitados', 'Transações ilimitadas', 'Agendamentos ilimitados', 'Todas as ferramentas', 'WhatsApp (Agente IA) ✅'],
    },
];

export default function UserDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [changingPlan, setChangingPlan] = useState<string | null>(null);
    const [planDays, setPlanDays] = useState(30);

    const fetchUser = async () => {
        try {
            const response = await adminService.getUserDetail(id!);
            setUser(response.data);
        } catch (err) {
            console.error('Error fetching user:', err);
            alert('Erro ao carregar dados do usuário');
            navigate('/users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUser();
    }, [id]);

    const handleChangePlan = async (plan: string) => {
        if (plan === user?.plan) return;
        setChangingPlan(plan);
        try {
            await adminService.updateUserPlan(user.id, plan, plan === 'free' ? 30 : planDays);
            await fetchUser();
        } catch (err) {
            console.error('Error updating plan:', err);
            alert('Erro ao alterar plano');
        } finally {
            setChangingPlan(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-brand-600" />
            </div>
        );
    }

    if (!user) return null;

    const planInfo = user.plan_info || {};
    const effectivePlan = planInfo.plan || user.plan || 'free';
    const storedPlan = planInfo.stored_plan || user.plan || 'free';

    const infoItems = [
        { icon: Mail, label: 'Email', value: user.email },
        { icon: Phone, label: 'Telefone', value: user.phone ? `${user.ddi || ''} ${user.phone}` : '—' },
        { icon: MapPin, label: 'Cidade/Estado', value: user.city ? `${user.city}/${user.state}` : '—' },
        { icon: Calendar, label: 'Data de nascimento', value: user.birth_date || '—' },
        { icon: User, label: 'CPF', value: user.cpf || '—' },
        { icon: Shield, label: 'Admin', value: user.is_admin ? 'Sim' : 'Não' },
    ];

    const formatDate = (iso: string) => {
        try {
            return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
        } catch {
            return iso;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/users')}
                    className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-brand-100 border-2 border-brand-200 flex items-center justify-center font-bold text-brand-700 text-lg">
                        {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">{user.name}</h1>
                        <p className="text-sm text-slate-500">{user.email}</p>
                    </div>
                </div>
            </div>

            {/* Info + Usage */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Dados Pessoais */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">Dados Pessoais</h2>
                    <div className="space-y-4">
                        {infoItems.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                                    <item.icon className="w-4 h-4 text-slate-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400">{item.label}</p>
                                    <p className="text-sm font-medium text-slate-700">{item.value}</p>
                                </div>
                            </div>
                        ))}
                        {user.occupation && (
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                                    <BarChart3 className="w-4 h-4 text-slate-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400">Profissão</p>
                                    <p className="text-sm font-medium text-slate-700">{user.occupation}</p>
                                </div>
                            </div>
                        )}
                        {user.salary_range && (
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                                    <Wallet className="w-4 h-4 text-slate-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400">Faixa salarial</p>
                                    <p className="text-sm font-medium text-slate-700">{user.salary_range}</p>
                                </div>
                            </div>
                        )}
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                                <Calendar className="w-4 h-4 text-slate-400" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400">Cadastrado em</p>
                                <p className="text-sm font-medium text-slate-700">
                                    {new Date(user.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Uso Atual */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">Uso Atual</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <Wallet className="w-4 h-4 text-blue-500" />
                                <span className="text-xs text-slate-500">Contas</span>
                            </div>
                            <p className="text-2xl font-bold text-slate-900">{user.usage?.accounts ?? 0}</p>
                            <p className="text-xs text-slate-400">
                                Limite: {user.plan_limits?.max_accounts >= 999 ? '∞' : user.plan_limits?.max_accounts}
                            </p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <CreditCard className="w-4 h-4 text-purple-500" />
                                <span className="text-xs text-slate-500">Cartões</span>
                            </div>
                            <p className="text-2xl font-bold text-slate-900">{user.usage?.credit_cards ?? 0}</p>
                            <p className="text-xs text-slate-400">
                                Limite: {user.plan_limits?.max_credit_cards >= 999 ? '∞' : user.plan_limits?.max_credit_cards}
                            </p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <BarChart3 className="w-4 h-4 text-emerald-500" />
                                <span className="text-xs text-slate-500">Transações (mês)</span>
                            </div>
                            <p className="text-2xl font-bold text-slate-900">{user.usage?.transactions_this_month ?? 0}</p>
                            <p className="text-xs text-slate-400">
                                Limite: {user.plan_limits?.max_transactions_month >= 999 ? '∞' : user.plan_limits?.max_transactions_month}
                            </p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <MessageCircle className="w-4 h-4 text-green-500" />
                                <span className="text-xs text-slate-500">WhatsApp</span>
                            </div>
                            <p className="text-2xl font-bold text-slate-900">
                                {user.preferences?.whatsapp_enabled ? '✅' : '❌'}
                            </p>
                            <p className="text-xs text-slate-400">
                                {user.plan_limits?.whatsapp_enabled ? 'Disponível' : 'Não disponível'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Status do Plano (Expiração + Trial) ─── */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-slate-400" />
                    Status do Plano
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Plano Efetivo */}
                    <div className={`rounded-xl p-4 border ${effectivePlan === 'premium' ? 'bg-amber-50 border-amber-200' :
                            effectivePlan === 'basic' ? 'bg-blue-50 border-blue-200' :
                                'bg-slate-50 border-slate-200'
                        }`}>
                        <p className="text-xs font-medium text-slate-500 mb-1">Plano Efetivo</p>
                        <p className={`text-xl font-bold ${effectivePlan === 'premium' ? 'text-amber-700' :
                                effectivePlan === 'basic' ? 'text-blue-700' :
                                    'text-slate-700'
                            }`}>
                            {effectivePlan === 'premium' ? 'Premium' : effectivePlan === 'basic' ? 'Básico' : 'Grátis'}
                        </p>
                        {effectivePlan !== storedPlan && (
                            <p className="text-xs text-slate-400 mt-1">
                                Plano cadastrado: {storedPlan === 'premium' ? 'Premium' : storedPlan === 'basic' ? 'Básico' : 'Grátis'}
                                {planInfo.plan_expired && <span className="text-red-500 font-semibold"> (Expirado)</span>}
                            </p>
                        )}
                    </div>

                    {/* Vencimento do Plano */}
                    <div className={`rounded-xl p-4 border ${planInfo.plan_expired ? 'bg-red-50 border-red-200' :
                            planInfo.plan_expires_at ? 'bg-slate-50 border-slate-200' :
                                'bg-slate-50 border-slate-200'
                        }`}>
                        <p className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                            {planInfo.plan_expired && <AlertTriangle className="w-3 h-3 text-red-500" />}
                            Vencimento do Plano
                        </p>
                        {planInfo.plan_expires_at ? (
                            <>
                                <p className={`text-lg font-bold ${planInfo.plan_expired ? 'text-red-600' : 'text-slate-900'}`}>
                                    {formatDate(planInfo.plan_expires_at)}
                                </p>
                                {planInfo.plan_days_left !== undefined && !planInfo.plan_expired && (
                                    <p className={`text-xs mt-1 ${planInfo.plan_days_left <= 7 ? 'text-orange-500 font-semibold' : 'text-slate-400'}`}>
                                        {planInfo.plan_days_left} dias restantes
                                    </p>
                                )}
                                {planInfo.plan_expired && (
                                    <p className="text-xs text-red-500 font-semibold mt-1">Plano expirado</p>
                                )}
                            </>
                        ) : (
                            <p className="text-lg font-bold text-slate-400">
                                {user.is_admin ? 'Sem vencimento (Admin)' : 'Sem vencimento'}
                            </p>
                        )}
                    </div>

                    {/* Trial */}
                    <div className={`rounded-xl p-4 border ${planInfo.trial_active ? 'bg-purple-50 border-purple-200' :
                            planInfo.trial_used ? 'bg-slate-50 border-slate-200' :
                                'bg-emerald-50 border-emerald-200'
                        }`}>
                        <p className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                            <Gift className="w-3 h-3" />
                            Trial Premium (7 dias)
                        </p>
                        {planInfo.trial_active ? (
                            <>
                                <p className="text-lg font-bold text-purple-700">Ativo</p>
                                <p className="text-xs text-purple-500 mt-1">
                                    {planInfo.trial_days_left} dias restantes — expira {formatDate(planInfo.trial_expires_at)}
                                </p>
                            </>
                        ) : planInfo.trial_used ? (
                            <>
                                <p className="text-lg font-bold text-slate-500">Já utilizado</p>
                                <p className="text-xs text-slate-400 mt-1">Este usuário já consumiu o trial</p>
                            </>
                        ) : (
                            <>
                                <p className="text-lg font-bold text-emerald-700">Disponível</p>
                                <p className="text-xs text-emerald-500 mt-1">O usuário ainda pode ativar o trial</p>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Plano */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-2">Plano do Usuário</h2>
                <p className="text-sm text-slate-500 mb-4">Selecione o plano para este usuário. As permissões são aplicadas imediatamente.</p>

                {/* Days Input */}
                <div className="flex items-center gap-3 mb-6 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-600">Duração do plano:</span>
                    <input
                        type="number"
                        min={1}
                        max={365}
                        value={planDays}
                        onChange={(e) => setPlanDays(Math.max(1, Math.min(365, Number(e.target.value))))}
                        className="w-20 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-center font-semibold"
                    />
                    <span className="text-sm text-slate-400">dias</span>
                    {user.is_admin && (
                        <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-full">
                            Admin — sem vencimento
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {PLANS.map((plan) => {
                        const isActive = effectivePlan === plan.id;
                        const isStoredActive = storedPlan === plan.id;
                        const isChanging = changingPlan === plan.id;
                        const Icon = plan.icon;

                        return (
                            <div
                                key={plan.id}
                                className={`relative rounded-2xl border-2 p-6 transition-all ${isActive
                                    ? `${plan.borderColor} bg-gradient-to-br ${plan.bgGradient} shadow-md scale-[1.02]`
                                    : 'border-slate-150 hover:border-slate-300 hover:shadow-sm'
                                    }`}
                            >
                                {isActive && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold text-white ${plan.btnClass}`}>
                                            <Check className="w-3 h-3" /> Ativo
                                        </span>
                                    </div>
                                )}

                                <div className="text-center mb-4">
                                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white shadow-sm mb-3`}>
                                        <Icon className={`w-6 h-6 ${plan.textColor}`} />
                                    </div>
                                    <h3 className={`text-xl font-bold ${plan.textColor}`}>{plan.name}</h3>
                                    <p className="text-2xl font-extrabold text-slate-900 mt-1">{plan.price}<span className="text-sm font-normal text-slate-400">/mês</span></p>
                                </div>

                                <ul className="space-y-2 mb-6">
                                    {plan.features.map((f, i) => (
                                        <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                                            <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                            {f}
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    onClick={() => handleChangePlan(plan.id)}
                                    disabled={isStoredActive || isChanging}
                                    className={`w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${plan.btnClass}`}
                                >
                                    {isChanging ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : isStoredActive ? (
                                        'Plano Atual'
                                    ) : (
                                        `Selecionar (${planDays}d)`
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
