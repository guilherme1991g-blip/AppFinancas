export const IndigoTheme = {
    light: {
        background: '#F8FAFC',
        surface: '#FFFFFF',
        surfaceLight: '#F1F5F9',
        card: '#FFFFFF',
        border: '#E2E8F0',
        primary: '#6366F1', // Indigo
        primaryDark: '#4F46E5',
        secondary: '#8B5CF6', // Violet
        danger: '#EF4444',
        warning: '#F59E0B',
        income: '#10B981',
        expense: '#EF4444',
        text: '#1E293B',
        textSecondary: '#64748B',
        textMuted: '#94A3B8',
        white: '#FFFFFF',
        overlay: 'rgba(0,0,0,0.4)',
    },
    dark: {
        background: '#0F172A', // Slate-900
        surface: '#1E293B', // Slate-800
        surfaceLight: '#334155', // Slate-700
        card: 'rgba(255,255,255,0.03)',
        border: 'rgba(255,255,255,0.08)',
        primary: '#818CF8', // Indigo-400
        primaryDark: '#6366F1',
        secondary: '#A78BFA', // Violet-400
        danger: '#F87171',
        warning: '#FBBF24',
        income: '#34D399',
        expense: '#F87171',
        text: '#F8FAFC',
        textSecondary: '#94A3B8',
        textMuted: '#64748B',
        white: '#FFFFFF',
        overlay: 'rgba(0,0,0,0.6)',
    }
};

export const Colors = IndigoTheme.dark; // Default for now

export const Fonts = {
    regular: 'System',
    medium: 'System',
    bold: 'System',
};

export const Spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

export const Radius = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 999,
};

export const Shadow = {
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    md: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
    },
};
