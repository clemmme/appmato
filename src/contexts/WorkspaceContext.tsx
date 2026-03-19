import React, { createContext, useContext, useState, useEffect } from 'react';

type WorkspaceType = 'gestion' | 'pulse';

interface WorkspaceContextType {
    activeWorkspace: WorkspaceType;
    setActiveWorkspace: (workspace: WorkspaceType) => void;
    toggleWorkspace: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
    // Optionnel: Sauvegarder dans le localStorage pour mémoriser le dernier espace visité
    const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceType>(() => {
        const saved = localStorage.getItem('appmato_active_workspace');
        return (saved as WorkspaceType) || 'pulse';
    });

    useEffect(() => {
        localStorage.setItem('appmato_active_workspace', activeWorkspace);
    }, [activeWorkspace]);

    const toggleWorkspace = () => {
        setActiveWorkspace((prev) => (prev === 'gestion' ? 'pulse' : 'gestion'));
    };

    return (
        <WorkspaceContext.Provider value={{ activeWorkspace, setActiveWorkspace, toggleWorkspace }}>
            {children}
        </WorkspaceContext.Provider>
    );
}

export function useWorkspace() {
    const context = useContext(WorkspaceContext);
    if (context === undefined) {
        throw new Error('useWorkspace must be used within a WorkspaceProvider');
    }
    return context;
}
