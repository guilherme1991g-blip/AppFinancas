

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
                    Novo: Agente IA via WhatsApp 🤖
                </span>
                <h1 className="section-title" style={{ fontSize: '4rem', maxWidth: '800px', margin: '0 auto 1.5rem' }}>
                    Sua vida financeira, organizada por IA.
                </h1>
                <p className="section-sub" style={{ maxWidth: '600px', margin: '0 auto 2.5rem', fontSize: '1.25rem' }}>
                    Controle seus gastos, sincronize seus bancos e receba insights inteligentes. Tudo em um lugar só, agora com integração total via WhatsApp.
                </p>
                <div style={{ position: 'relative', marginTop: '4rem' }}>
                    <img
                        src="/src/assets/hero-visual.png"
                        alt="AppFinancas Dashboard"
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
