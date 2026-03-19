import React, { createContext, useContext, useState, useEffect } from 'react';

interface EasterEggContextType {
    isBatmanMode: boolean;
    unlockBatmanMode: () => void;
    lockBatmanMode: () => void;
}

const EasterEggContext = createContext<EasterEggContextType | undefined>(undefined);

export function EasterEggProvider({ children }: { children: React.ReactNode }) {
    const [isBatmanMode, setIsBatmanMode] = useState(false);

    useEffect(() => {
        if (isBatmanMode) {
            document.documentElement.classList.add('theme-batman');
        } else {
            document.documentElement.classList.remove('theme-batman');
        }
    }, [isBatmanMode]);

    const unlockBatmanMode = () => setIsBatmanMode(true);
    const lockBatmanMode = () => setIsBatmanMode(false);

    return (
        <EasterEggContext.Provider value={{ isBatmanMode, unlockBatmanMode, lockBatmanMode }}>
            {children}
        </EasterEggContext.Provider>
    );
}

export function useEasterEgg() {
    const context = useContext(EasterEggContext);
    if (!context) {
        throw new Error('useEasterEgg must be used within an EasterEggProvider');
    }
    return context;
}
