export const BANKS = [
    { value: 'nubank', label: 'Nubank', color: '#8A05BE', logo: require('../assets/images/nubank.png') },
    { value: 'inter', label: 'Inter', color: '#FF7A00', logo: require('../assets/images/inter.png') },
    { value: 'itau', label: 'Itaú', color: '#EC7000', logo: require('../assets/images/itau.png') },
    { value: 'bradesco', label: 'Bradesco', color: '#CC092F', logo: require('../assets/images/bradesco.png') },
    { value: 'santander', label: 'Santander', color: '#EC0000', logo: require('../assets/images/santander.png') },
    { value: 'bb', label: 'Banco do Brasil', color: '#FCF100', logo: require('../assets/images/bb.png') },
    { value: 'caixa', label: 'Caixa', color: '#005CA5', logo: require('../assets/images/caixa.png') },
    { value: 'c6', label: 'C6 Bank', color: '#2D2D2D', logo: require('../assets/images/c6.png') },
    { value: 'btg', label: 'BTG Pactual', color: '#003153', logo: require('../assets/images/btg.png') },
    { value: 'xp', label: 'XP Investimentos', color: '#000000', logo: require('../assets/images/xp.png') },
    { value: 'picpay', label: 'PicPay', color: '#21C25E', logo: require('../assets/images/picpay.png') },
    { value: 'mercadopago', label: 'Mercado Pago', color: '#009EE3', logo: require('../assets/images/mercadopago.png') },
    { value: 'other', label: 'Outros', color: '#666', icon: 'ellipsis-horizontal-outline' },
];

export const getBank = (value: string) => BANKS.find(b => b.value === (value || '').toLowerCase()) || BANKS[BANKS.length - 1];
