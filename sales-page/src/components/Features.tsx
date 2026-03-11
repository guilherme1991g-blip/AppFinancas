

const FeatureCard = ({ icon, title, desc }: { icon: string, title: string, desc: string }) => (
    <div className="glass" style={{ padding: '2rem', borderRadius: '24px', textAlign: 'left' }}>
        <div style={{
            fontSize: '2rem',
            marginBottom: '1rem',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            width: '60px',
            height: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '16px'
        }}>
            {icon}
        </div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>{title}</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>{desc}</p>
    </div>
);

const Features: React.FC = () => {
    return (
        <section id="features" style={{ padding: '6rem 1.5rem', backgroundColor: '#0f172a' }}>
            <div className="container">
                <h2 className="section-title">O que o AppFinancas faz por você</h2>
                <p className="section-sub">Tudo o que você precisa para dominar suas finanças, sem esforço.</p>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '2rem'
                }}>
                    <FeatureCard
                        icon="🤖"
                        title="Agente IA no WhatsApp"
                        desc="Envie transações e consulte seu saldo direto pelo Zap. Sem precisar abrir o app."
                    />
                    <FeatureCard
                        icon="🏦"
                        title="Sincronização Bancária"
                        desc="Conecte suas contas e cartões com segurança e veja tudo em um só lugar."
                    />
                    <FeatureCard
                        icon="📈"
                        title="Insights Inteligentes"
                        desc="Gráficos claros e relatórios que mostram exatamente para onde seu dinheiro está indo."
                    />
                    <FeatureCard
                        icon="📅"
                        title="Metas de Gastos"
                        desc="Crie limites para categorias e receba avisos antes de estourar o orçamento."
                    />
                    <FeatureCard
                        icon="☁️"
                        title="Sincronização na Nuvem"
                        desc="Acesse seus dados de qualquer lugar, com segurança de nível bancário."
                    />
                    <FeatureCard
                        icon="📱"
                        title="Interface Premium"
                        desc="Uma experiência visual moderna e fluida, pensada em cada detalhe."
                    />
                </div>
            </div>
        </section>
    );
};

export default Features;
