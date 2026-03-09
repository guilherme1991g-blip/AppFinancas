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
    Zap
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
        features: ['2 contas bancárias', '1 cartão de crédito', '50 transações/mês', 'Sem WhatsApp'],
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
        features: ['Contas ilimitadas', 'Cartões ilimitados', 'Transações ilimitadas', 'Sem WhatsApp'],
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
        features: ['Contas ilimitadas', 'Cartões ilimitados', 'Transações ilimitadas', 'WhatsApp (Agente IA) ✅'],
    },
];

export default function UserDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [changingPlan, setChangingPlan] = useState<string | null>(null);

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
            await adminService.updateUserPlan(user.id, plan);
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

    const infoItems = [
        { icon: Mail, label: 'Email', value: user.email },
        { icon: Phone, label: 'Telefone', value: user.phone ? `${user.ddi || ''} ${user.phone}` : '—' },
        { icon: MapPin, label: 'Cidade/Estado', value: user.city ? `${user.city}/${user.state}` : '—' },
        { icon: Calendar, label: 'Data de nascimento', value: user.birth_date || '—' },
        { icon: User, label: 'CPF', value: user.cpf || '—' },
        { icon: Shield, label: 'Admin', value: user.is_admin ? 'Sim' : 'Não' },
    ];

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

            {/* Plano */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-2">Plano do Usuário</h2>
                <p className="text-sm text-slate-500 mb-6">Selecione o plano para este usuário. As permissões são aplicadas imediatamente.</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {PLANS.map((plan) => {
                        const isActive = user.plan === plan.id;
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
                                    disabled={isActive || isChanging}
                                    className={`w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${plan.btnClass}`}
                                >
                                    {isChanging ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : isActive ? (
                                        'Plano Atual'
                                    ) : (
                                        'Selecionar'
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
