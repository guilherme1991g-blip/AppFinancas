
const PriceCard = ({ title, price, features, highlighted = false }: { title: string, price: string, features: string[], highlighted?: boolean }) => (
    <div className={`glass ${highlighted ? 'highlighted-card' : ''}`} style={{
        padding: '2.5rem',
        borderRadius: '24px',
        textAlign: 'center',
        position: 'relative',
        transform: highlighted ? 'scale(1.05)' : 'none',
        zIndex: highlighted ? 2 : 1,
        border: highlighted ? '2px solid var(--primary)' : '1px solid var(--glass-border)',
    }}>
        {highlighted && (
            <span style={{
                position: 'absolute',
                top: '-15px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'var(--primary)',
                color: 'white',
                padding: '0.4rem 1rem',
                borderRadius: '99px',
                fontSize: '0.8rem',
                fontWeight: 700
            }}>
                O MELHOR DO OTTO
            </span>
        )}
        <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>{title}</h3>
        <div style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>
            {price}<span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--text-muted)' }}>/mês</span>
        </div>
        <ul style={{ listStyle: 'none', textAlign: 'left', marginBottom: '2.5rem', padding: 0 }}>
            {features.map((f, i) => (
                <li key={i} style={{ marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: 'var(--primary)', fontWeight: 800 }}>✓</span> {f}
                </li>
            ))}
        </ul>
        <a href="https://app.integrareplus.com/register" className={highlighted ? 'btn-primary' : 'glass'} style={{
            display: 'block',
            padding: '1rem',
            borderRadius: '99px',
            fontWeight: 700,
            width: '100%',
            textAlign: 'center'
        }}>
            {title === 'Gratuito' ? 'Começar com Otto' : 'Otto Premium'}
        </a>
    </div>
);

const Pricing: React.FC = () => {
    return (
        <section id="pricing" style={{ padding: '6rem 1.5rem', background: '#0f172a' }}>
            <div className="container">
                <h2 className="section-title">Escolha como o Otto vai te ajudar</h2>
                <p className="section-sub">Planos simples para todos os perfis financeiros.</p>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '3rem',
                    paddingTop: '3rem',
                    alignItems: 'center'
                }}>
                    <PriceCard
                        title="Gratuito"
                        price="R$ 0"
                        features={['Até 1 conta bancária', 'Até 50 transações/mês', 'Relatórios básicos']}
                    />
                    <PriceCard
                        title="Premium"
                        price="R$ 29,90"
                        highlighted={true}
                        features={[
                            'Contas ilimitadas',
                            'Transações ilimitadas',
                            'Otto no WhatsApp (Full)',
                            'Sincronização Automática',
                            'Conselhos Financeiros IA'
                        ]}
                    />
                    <PriceCard
                        title="Básico"
                        price="R$ 14,90"
                        features={['Até 5 contas bancárias', 'Transações ilimitadas', 'Relatórios completos']}
                    />
                </div>
            </div>
        </section>
    );
};

export default Pricing;
