import { useEffect, useState } from 'react';
import {
    Search,
    ArrowUpRight,
    ArrowDownRight,
    Filter,
    Loader2,
    User as UserIcon
} from 'lucide-react';
import { adminService } from '../services/api';

export default function TransactionMonitor() {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchTransactions = async () => {
            try {
                const response = await adminService.getTransactions();
                setTransactions(response.data);
            } catch (err) {
                console.error('Error fetching transactions:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchTransactions();
    }, []);

    const filteredTransactions = transactions.filter(t =>
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Monitor de Transações</h1>
                    <p className="text-slate-500">Acompanhe todas as movimentações financeiras da plataforma</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden text-sm">
                <div className="p-4 border-b bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por descrição, usuário ou categoria..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                        />
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 font-medium hover:bg-slate-50 transition-colors">
                        <Filter className="w-4 h-4" />
                        Filtros
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 border-b">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-slate-700">Usuário</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Descrição / Categoria</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Data</th>
                                <th className="px-6 py-4 font-semibold text-slate-700 text-right">Valor</th>
                                <th className="px-6 py-4 font-semibold text-slate-700 text-right">Tipo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y text-slate-900">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <Loader2 className="w-8 h-8 animate-spin text-brand-600 mx-auto mb-2" />
                                        <p className="text-slate-400">Carregando transações...</p>
                                    </td>
                                </tr>
                            ) : filteredTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                        Nenhuma transação encontrada.
                                    </td>
                                </tr>
                            ) : (
                                filteredTransactions.map((t) => (
                                    <tr key={t._id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4 font-medium">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center">
                                                    <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                                                </div>
                                                {t.user_name}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-medium text-slate-900">{t.description}</p>
                                            <p className="text-xs text-slate-400">{t.category}</p>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">
                                            {new Date(t.date).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className={`px-6 py-4 text-right font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-red-500'
                                            }`}>
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.amount)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {t.type === 'income' ? (
                                                <div className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                                                    Receita <ArrowUpRight className="w-4 h-4" />
                                                </div>
                                            ) : (
                                                <div className="inline-flex items-center gap-1 text-red-500 font-medium">
                                                    Despesa <ArrowDownRight className="w-4 h-4" />
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
