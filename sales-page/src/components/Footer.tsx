

const Footer: React.FC = () => {
    return (
        <footer style={{ padding: '4rem 1.5rem', borderTop: '1px solid var(--glass-border)', textAlign: 'center' }}>
            <div className="container">
                <p style={{ fontWeight: 700, fontSize: '1.2rem', marginBottom: '1rem' }}>AppFinancas</p>
                <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', marginBottom: '2rem' }}>
                    <a href="#" className="hover-link">Termos de Uso</a>
                    <a href="#" className="hover-link">Privacidade</a>
                    <a href="mailto:contato@appfinancas.com" className="hover-link">Contato</a>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    © {new Date().getFullYear()} AppFinancas. Todos os direitos reservados.
                </p>
            </div>
        </footer>
    );
};

export default Footer;
