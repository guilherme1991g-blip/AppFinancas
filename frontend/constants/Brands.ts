export const BRANDS = [
    {
        value: 'visa',
        label: 'Visa',
        color: '#1A1F71',
        logo: require('../assets/images/visa.png')
    },
    {
        value: 'mastercard',
        label: 'Mastercard',
        color: '#EB001B',
        logo: require('../assets/images/mastercard.png')
    },
    {
        value: 'elo',
        label: 'Elo',
        color: '#00A4E0',
        logo: require('../assets/images/elo.png')
    },
    {
        value: 'amex',
        label: 'American Express',
        color: '#0070D2',
        logo: require('../assets/images/amex.png')
    },
    {
        value: 'hipercard',
        label: 'Hipercard',
        color: '#B01116',
        logo: require('../assets/images/hipercard.png')
    },
    {
        value: 'other',
        label: 'Outra',
        color: '#666',
        icon: 'card'
    },
];

export const getBrand = (value: string) => BRANDS.find(b => b.value === value) || BRANDS[BRANDS.length - 1];
