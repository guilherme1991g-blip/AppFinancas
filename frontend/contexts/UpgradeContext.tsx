import React, { createContext, useContext, useState, useCallback } from 'react';
import { UpgradeModal } from '@/components/UpgradeModal';

interface UpgradeContextType {
    showUpgrade: (message: string) => void;
}

const UpgradeContext = createContext<UpgradeContextType>({ showUpgrade: () => { } });

export function UpgradeProvider({ children }: { children: React.ReactNode }) {
    const [visible, setVisible] = useState(false);
    const [message, setMessage] = useState('');

    const showUpgrade = useCallback((msg: string) => {
        setMessage(msg);
        setVisible(true);
    }, []);

    const hideUpgrade = useCallback(() => {
        setVisible(false);
    }, []);

    return (
        <UpgradeContext.Provider value={{ showUpgrade }}>
            {children}
            <UpgradeModal visible={visible} message={message} onClose={hideUpgrade} />
        </UpgradeContext.Provider>
    );
}

export const useUpgrade = () => useContext(UpgradeContext);
