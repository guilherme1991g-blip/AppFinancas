import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
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
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const showUpgrade = useCallback((msg: string) => {
        console.log('[UpgradeContext] showUpgrade called with:', msg);
        setMessage(msg);
        // Delay showing the modal to allow any native presentation modal
        // (e.g., account/new, transaction/new) to dismiss first.
        // React Native <Modal> cannot render above native iOS modals.
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            console.log('[UpgradeContext] Setting visible=true');
            setVisible(true);
        }, 600);
    }, []);

    useEffect(() => {
        setPlanLimitListener((msg: string) => {
            console.log('[UpgradeContext] Plan limit listener fired:', msg);
            showUpgrade(msg);
        });
    }, [showUpgrade]);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    const hideUpgrade = useCallback(() => {
        console.log('[UpgradeContext] hideUpgrade called');
        setVisible(false);
    }, []);

    return (
        <UpgradeContext.Provider value={{ showUpgrade, hideUpgrade, visible, message }}>
            {children}
        </UpgradeContext.Provider>
    );
}

export const useUpgrade = () => useContext(UpgradeContext);

