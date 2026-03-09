import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { UpgradeModal } from '@/components/UpgradeModal';
import { setPlanLimitListener } from '@/services/api';

interface UpgradeContextType {
    showUpgrade: (message: string) => void;
    hideUpgrade: () => void;
    visible: boolean;
    message: string;
}

const UpgradeContext = createContext<UpgradeContextType>({
    showUpgrade: () => { },
    hideUpgrade: () => { },
    visible: false,
    message: ''
});

export function UpgradeProvider({ children }: { children: React.ReactNode }) {
    const [visible, setVisible] = useState(false);
    const [message, setMessage] = useState('');

    const showUpgrade = useCallback((msg: string) => {
        setMessage(msg);
        setVisible(true);
    }, []);

    useEffect(() => {
        setPlanLimitListener((msg: string) => {
            showUpgrade(msg);
        });
    }, [showUpgrade]);

    const hideUpgrade = useCallback(() => {
        setVisible(false);
    }, []);

    return (
        <UpgradeContext.Provider value={{ showUpgrade, hideUpgrade, visible, message }}>
            {children}
        </UpgradeContext.Provider>
    );
}

export const useUpgrade = () => useContext(UpgradeContext);
