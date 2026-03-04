import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    ArrowLeftRight,
    Settings,
    LogOut,
    Bell,
    Search,
    Menu,
    X
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
    return twMerge(clsx(inputs));
}

const SidebarItem = ({ to, icon: Icon, label, active }: any) => (
    <Link
        to={to}
        className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group text-slate-600 hover:bg-brand-50 hover:text-brand-600",
            active && "bg-brand-50 text-brand-600 font-medium"
        )}
    >
        <Icon className={cn("w-5 h-5 transition-colors", active ? "text-brand-600" : "text-slate-400 group-hover:text-brand-600")} />
        <span>{label}</span>
    </Link>
);

export default function Layout() {
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    const menuItems = [
        { to: "/", icon: LayoutDashboard, label: "Dashboard" },
        { to: "/users", icon: Users, label: "Usuários" },
        { to: "/transactions", icon: ArrowLeftRight, label: "Transações" },
        { to: "/settings", icon: Settings, label: "Configurações" },
    ];

    const handleLogout = () => {
        localStorage.removeItem('admin_token');
        window.location.href = '/login';
    };

    return (
        <div className="flex min-h-screen bg-slate-50">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex flex-col w-64 border-r bg-white px-4 py-6">
                <div className="flex items-center gap-2 px-4 mb-8">
                    <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
                        <LayoutDashboard className="text-white w-5 h-5" />
                    </div>
                    <span className="text-xl font-bold bg-gradient-to-r from-brand-600 to-brand-800 bg-clip-text text-transparent">
                        AdminFinanças
                    </span>
                </div>

                <nav className="flex-1 space-y-1">
                    {menuItems.map((item) => (
                        <SidebarItem
                            key={item.to}
                            {...item}
                            active={location.pathname === item.to}
                        />
                    ))}
                </nav>

                <div className="pt-4 border-t mt-auto">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors group"
                    >
                        <LogOut className="w-5 h-5 text-slate-400 group-hover:text-red-600" />
                        <span>Sair</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0">
                <header className="h-16 border-b bg-white flex items-center justify-between px-4 lg:px-8 sticky top-0 z-10 glass">
                    <div className="flex items-center gap-4">
                        <button
                            className="lg:hidden p-2 hover:bg-slate-100 rounded-md"
                            onClick={() => setIsMobileMenuOpen(true)}
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <div className="hidden md:flex items-center bg-slate-100 px-3 py-2 rounded-lg w-64 lg:w-96 focus-within:ring-2 ring-brand-500/20 ring-offset-0 transition-all">
                            <Search className="w-4 h-4 text-slate-400 mr-2" />
                            <input
                                type="text"
                                placeholder="Pesquisar..."
                                className="bg-transparent border-none outline-none text-sm w-full"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-4">
                        <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg relative">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                        </button>
                        <div className="h-8 w-px bg-slate-200 mx-1"></div>
                        <div className="flex items-center gap-3 pl-1">
                            <div className="hidden sm:block text-right">
                                <p className="text-sm font-medium">Admin User</p>
                                <p className="text-xs text-slate-400">Administrador</p>
                            </div>
                            <div className="w-9 h-9 rounded-full bg-brand-100 border border-brand-200 flex items-center justify-center text-brand-700 font-bold">
                                AD
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 p-4 lg:p-8 animate-in fade-in duration-500">
                    <Outlet />
                </div>
            </main>

            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
                    <aside className="absolute inset-y-0 left-0 w-64 bg-white p-4 shadow-xl animate-in slide-in-from-left duration-300">
                        <div className="flex items-center justify-between mb-8 px-2">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center font-bold text-white">A</div>
                                <span className="font-bold">AdminFinanças</span>
                            </div>
                            <button onClick={() => setIsMobileMenuOpen(false)}>
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <nav className="space-y-1">
                            {menuItems.map((item) => (
                                <SidebarItem
                                    key={item.to}
                                    {...item}
                                    active={location.pathname === item.to}
                                />
                            ))}
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all mt-4"
                            >
                                <LogOut className="w-5 h-5" />
                                <span>Sair</span>
                            </button>
                        </nav>
                    </aside>
                </div>
            )}
        </div>
    );
}
