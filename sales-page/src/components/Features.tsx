
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
                <h2 className="section-title">O que o Otto faz por você</h2>
                <p className="section-sub">Deixe o trabalho pesado com o Otto e foque no que importa.</p>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '2rem'
                }}>
                    <FeatureCard
                        icon="💬"
                        title="Fale com o Otto no Zap"
                        desc="Envie áudios ou textos com seus gastos e o Otto anota tudo pra você instantaneamente."
                    />
                    <FeatureCard
                        icon="🤖"
                        title="Inteligência Autêntica"
                        desc="O Otto aprende seus hábitos e sugere onde você pode economizar de verdade."
                    />
                    <FeatureCard
                        icon="🏦"
                        title="Conexão Bancária Real"
                        desc="Sincronize com os principais bancos brasileiros com segurança máxima e zero esforço."
                    />
                    <FeatureCard
                        icon="📊"
                        title="Relatórios Sem Complicação"
                        desc="Nada de planilhas chatas. O Otto te mostra sua saúde financeira com gráficos simples."
                    />
                    <FeatureCard
                        icon="🔔"
                        title="Alertas Inteligentes"
                        desc="O Otto te avisa sobre contas a vencer e se você estiver gastando mais que o planejado."
                    />
                    <FeatureCard
                        icon="🔒"
                        title="Segurança Integrare"
                        desc="Seus dados protegidos pela infraestrutura robusta da Integrare Plus."
                    />
                </div>
            </div>
        </section>
    );
};

export default Features;
