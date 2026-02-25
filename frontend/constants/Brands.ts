export const BRANDS = [
    {
        value: 'visa',
        label: 'Visa',
        color: '#1A1F71',
        logo: 'https://logo.clearbit.com/visa.com'
    },
    {
        value: 'mastercard',
        label: 'Mastercard',
        color: '#EB001B',
        logo: 'https://logo.clearbit.com/mastercard.us'
    },
    {
        value: 'elo',
        label: 'Elo',
        color: '#00A4E0',
        logo: 'https://logo.clearbit.com/elo.com.br'
    },
    {
        value: 'amex',
        label: 'Amex',
        color: '#0070D2',
        logo: 'https://logo.clearbit.com/americanexpress.com'
    },
    {
        value: 'hipercard',
        label: 'Hipercard',
        color: '#B01116',
        logo: 'https://logo.clearbit.com/hipercard.com.br'
    },
    {
        value: 'other',
        label: 'Outra',
        color: '#666',
        icon: 'card'
    },
];

export const getBrand = (value: string) => BRANDS.find(b => b.value === value) || BRANDS[BRANDS.length - 1];
