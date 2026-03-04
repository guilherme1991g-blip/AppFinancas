import { } from 'react';
import {
    Database,
    Lock,
    Globe,
    Bell,
    Save,
    Server,
    Terminal
} from 'lucide-react';

const SettingSection = ({ title, description, children }: any) => (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-6">
        <div className="p-6 border-b bg-slate-50/50">
            <h3 className="font-bold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-500">{description}</p>
        </div>
        <div className="p-6 space-y-4">
            {children}
        </div>
    </div>
);

const SettingItem = ({ label, description, icon: Icon, action }: any) => (
    <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                <Icon className="w-5 h-5" />
            </div>
            <div>
                <p className="font-medium text-slate-900">{label}</p>
                <p className="text-xs text-slate-500">{description}</p>
            </div>
        </div>
        {action}
    </div>
);

export default function Settings() {
    return (
        <div className="max-w-4xl space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Configurações do Sistema</h1>
                <p className="text-slate-500">Gerencie os parâmetros globais da plataforma administrativa</p>
            </div>

            <SettingSection
                title="Geral"
                description="Configurações básicas de funcionamento do sistema."
            >
                <SettingItem
                    label="Nome da Plataforma"
                    description="O nome que aparece no topo do painel."
                    icon={Globe}
                    action={<input type="text" defaultValue="AdminFinanças" className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 ring-brand-500/20" />}
                />
                <SettingItem
                    label="Modo de Manutenção"
                    description="Bloqueia o acesso de usuários comuns ao aplicativo."
                    icon={Server}
                    action={
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                        </label>
                    }
                />
            </SettingSection>

            <SettingSection
                title="Banco de Dados & API"
                description="Monitoramento e conexão com os serviços de dados."
            >
                <SettingItem
                    label="URL da API Backend"
                    description="Endpoint principal de comunicação."
                    icon={Terminal}
                    action={<code className="text-xs bg-slate-100 px-2 py-1 rounded">http://localhost:8000</code>}
                />
                <SettingItem
                    label="Status do MongoDB"
                    description="Estado da conexão com o banco de dados."
                    icon={Database}
                    action={<span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full uppercase">Conectado</span>}
                />
            </SettingSection>

            <SettingSection
                title="Segurança"
                description="Políticas de acesso e autenticação de administradores."
            >
                <SettingItem
                    label="Expiração de Token"
                    description="Tempo de validade da sessão administrativa (em horas)."
                    icon={Lock}
                    action={<input type="number" defaultValue="24" className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 ring-brand-500/20" />}
                />
                <SettingItem
                    label="Logs Administrativos"
                    description="Registrar todas as ações realizadas via painel."
                    icon={Bell}
                    action={
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" defaultChecked className="sr-only peer" />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                        </label>
                    }
                />
            </SettingSection>

            <div className="flex justify-end pt-4">
                <button className="flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-200">
                    <Save className="w-5 h-5" />
                    Salvar Alterações
                </button>
            </div>
        </div>
    );
}
