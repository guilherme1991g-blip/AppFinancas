
const Footer: React.FC = () => {
    return (
        <footer style={{ padding: '4rem 1.5rem', borderTop: '1px solid var(--glass-border)', textAlign: 'center' }}>
            <div className="container">
                <p style={{ fontWeight: 800, fontSize: '1.5rem', marginBottom: '1rem' }}>Meu Otto</p>
                <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', marginBottom: '2rem' }}>
                    <a href="#" style={{ color: 'var(--text-muted)' }}>Termos de Uso</a>
                    <a href="#" style={{ color: 'var(--text-muted)' }}>Privacidade</a>
                    <a href="mailto:contato@integrareplus.com" style={{ color: 'var(--text-muted)' }}>Suporte</a>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    © {new Date().getFullYear()} Meu Otto by Integrare Plus. Todos os direitos reservados.
                </p>
            </div>
        </footer>
    );
};

export default Footer;
