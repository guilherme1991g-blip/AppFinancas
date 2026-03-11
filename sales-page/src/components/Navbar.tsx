

const Navbar: React.FC = () => {
    return (
        <nav className="glass" style={{
            position: 'fixed',
            top: '1rem',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '90%',
            maxWidth: '1200px',
            padding: '1rem 2rem',
            borderRadius: '99px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 1000,
        }}>
            <div style={{ fontWeight: 800, fontSize: '1.5rem', color: '#fff' }}>AppFinancas</div>
            <div style={{ display: 'flex', gap: '2rem' }}>
                <a href="#features" style={{ fontWeight: 500 }}>Funcionalidades</a>
                <a href="#pricing" style={{ fontWeight: 500 }}>Preços</a>
            </div>
            <a href="https://app.appfinancas.com" className="btn-primary" style={{ padding: '0.6rem 1.2rem' }}>
                Entrar
            </a>
        </nav>
    );
};

export default Navbar;
