
const Hero: React.FC = () => {
    return (
        <header style={{
            padding: '10rem 1.5rem 6rem',
            textAlign: 'center',
            background: 'radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.15) 0%, transparent 50%)',
        }}>
            <div className="container">
                <span style={{
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    color: 'var(--primary)',
                    padding: '0.5rem 1rem',
                    borderRadius: '99px',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    marginBottom: '1.5rem',
                    display: 'inline-block'
                }}>
                    Meu Otto: Seu assistente pessoal de finanças 🤖
                </span>
                <h1 className="section-title" style={{ fontSize: '4.5rem', maxWidth: '900px', margin: '0 auto 1.5rem' }}>
                    Sua vida financeira, organizada pelo Otto.
                </h1>
                <p className="section-sub" style={{ maxWidth: '600px', margin: '0 auto 2.5rem', fontSize: '1.25rem' }}>
                    O Otto controla seus gastos, sincroniza seus bancos e te dá conselhos inteligentes via WhatsApp. Simples, rápido e inteligente.
                </p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '4rem' }}>
                    <a href="https://app.integrareplus.com/register" className="btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
                        Conhecer o Otto — Grátis
                    </a>
                    <a href="#features" className="glass" style={{
                        padding: '1rem 2rem',
                        borderRadius: '99px',
                        fontWeight: 600,
                        color: '#fff',
                        display: 'inline-flex',
                        alignItems: 'center'
                    }}>
                        Como funciona
                    </a>
                </div>
                <div style={{ position: 'relative' }}>
                    <img
                        src="/src/assets/hero-visual.png"
                        alt="Meu Otto Dashboard"
                        style={{
                            width: '100%',
                            maxWidth: '1000px',
                            borderRadius: '32px',
                            boxShadow: '0 50px 100px -20px rgba(0,0,0,0.5)',
                            border: '1px solid var(--glass-border)'
                        }}
                    />
                </div>
            </div>
        </header>
    );
};

export default Hero;
