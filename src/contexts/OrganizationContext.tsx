/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useEasterEgg } from '@/contexts/EasterEggContext';


type SupabaseRecord = Record<string, unknown>;

interface RpcMemberRow {
    member_id: string;
    member_org_id: string;
    member_user_id: string;
    member_role: string;
    member_created_at: string;
    profile_full_name: string | null;
    profile_email: string;
}

// Types
export interface Organization {
    id: string;
    name: string;
    legal_form?: string;
    siret?: string;
    address?: string;
    establishments_count: number;
    establishment_names?: string[];
    team_size_range?: string;
    specialties?: string[];
    logo_url?: string;
    brand_primary_color?: string;
    brand_bg_color?: string;
    invite_code: string;
    // Integration fields
    pennylane_api_key?: string;
    microsoft_tenant_id?: string;
    microsoft_client_id?: string;
    microsoft_access_token?: string;
    microsoft_refresh_token?: string;
    microsoft_expires_at?: string;
    created_by: string;
    created_at: string;
}

export interface OrganizationMember {
    id: string;
    organization_id: string;
    user_id: string;
    role: 'manager' | 'team_lead' | 'collaborator';
    created_at: string;
    // Joined fields
    profile?: {
        full_name: string | null;
        email: string;
        avatar_url: string | null;
    };
}

export type UserRole = 'manager' | 'team_lead' | 'collaborator' | 'solo';
export type AccountType = 'solo' | 'cabinet';

interface OrganizationContextType {
    currentOrg: Organization | null;
    userRole: UserRole;
    accountType: AccountType;
    members: OrganizationMember[];
    organizations: Organization[];
    hasCompletedSetup: boolean;
    loading: boolean;
    createOrganization: (data: Partial<Organization>) => Promise<Organization>;
    joinOrganization: (code: string) => Promise<{ orgName: string }>;
    switchOrganization: (orgId: string) => Promise<void>;
    completeSetup: (type: AccountType) => Promise<void>;
    refreshMembers: () => Promise<void>;
    updateMemberRole: (memberId: string, role: 'manager' | 'team_lead' | 'collaborator') => Promise<void>;
    removeMember: (memberId: string) => Promise<void>;
    updateBranding: (primaryColor?: string, bgColor?: string) => Promise<void>;
    updateOrganization: (updates: Partial<Organization>) => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const { setCabinetBranding } = useTheme();
    const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
    const [userRole, setUserRole] = useState<UserRole>('solo');
    const [accountType, setAccountType] = useState<AccountType>('solo');
    const [members, setMembers] = useState<OrganizationMember[]>([]);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [hasCompletedSetup, setHasCompletedSetup] = useState(true); // default true to avoid flash
    const [loading, setLoading] = useState(true);

    // Load user's organization data
    const loadOrgData = useCallback(async () => {
        if (!user) {
            setCurrentOrg(null);
            setUserRole('solo');
            setAccountType('solo');
            setMembers([]);
            setOrganizations([]);
            setCabinetBranding(null);
            setLoading(false);
            return;
        }

        try {
            // Get profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('account_type, current_organization_id, has_completed_setup')
                .eq('id', user.id)
                .single();

            if (profile) {
                const p = profile as SupabaseRecord;
                setAccountType(((p.account_type as string) || 'solo') as AccountType);
                setHasCompletedSetup((p.has_completed_setup as boolean) ?? false);

                if (p.account_type === 'cabinet') {
                    // Get all orgs the user is a member of
                    const { data: memberData } = await supabase
                        .from('organization_members')
                        .select('organization_id, role')
                        .eq('user_id', user.id);

                    if (memberData && memberData.length > 0) {
                        const orgIds = memberData.map((m) => (m as SupabaseRecord).organization_id as string);
                        const { data: orgsData } = await supabase
                            .from('organizations')
                            .select('*')
                            .in('id', orgIds);

                        if (orgsData) {
                            setOrganizations(orgsData as Organization[]);

                            // Set current org
                            const currentOrgId = (p.current_organization_id as string) || orgIds[0];
                            const org = orgsData.find((o) => (o as SupabaseRecord).id === currentOrgId) || orgsData[0];
                            if (org) {
                                setCurrentOrg(org as Organization);
                                // Apply branding
                                const o = org as Organization;
                                if (o.brand_primary_color || o.brand_bg_color) {
                                    setCabinetBranding({ primaryColor: o.brand_primary_color, bgColor: o.brand_bg_color });
                                } else {
                                    setCabinetBranding(null);
                                }
                                // Find role for this org
                                const membership = memberData.find((m) => (m as SupabaseRecord).organization_id === (org as SupabaseRecord).id);
                                setUserRole(((membership as SupabaseRecord)?.role as UserRole) || 'collaborator');
                            }
                        }
                    } else {
                        // Fallback si on est 'cabinet' mais sans organisation: Reset l'état org
                        setCurrentOrg(null);
                        setOrganizations([]);
                        setUserRole('solo');
                        setCabinetBranding(null);
                    }
                } else {
                    // C'est un utilisateur Solo : S'assurer que le branding et l'org sont réinitialisés
                    setCurrentOrg(null);
                    setOrganizations([]);
                    setUserRole('solo');
                    setCabinetBranding(null);
                }
            }
        } catch (err) {
            console.error('Error loading org data:', err);
        } finally {
            setLoading(false);
        }
    }, [user, setCabinetBranding]);

    useEffect(() => {
        loadOrgData();
    }, [loadOrgData]);

    const refreshMembers = useCallback(async () => {
        if (!currentOrg) return;

        // Utilise la fonction RPC qui bypass les RLS
        const { data, error } = await supabase.rpc('get_cabinet_members', {
            p_org_id: currentOrg.id
        });

        if (error) {
            console.error('Erreur RPC get_cabinet_members:', error.message);
            // Fallback : essayer la requête directe
            const { data: fallbackData, error: fallbackError } = await supabase
                .from('organization_members')
                .select('*, profile:profiles(full_name, email)')
                .eq('organization_id', currentOrg.id);
            if (fallbackError) {
                console.error('Erreur fallback membres:', fallbackError.message);
                return;
            }
            if (fallbackData) setMembers(fallbackData as unknown as OrganizationMember[]);
            return;
        }

        if (data) {
            // Transformer le résultat RPC en format OrganizationMember
            const mapped = (data as RpcMemberRow[]).map((row) => ({
                id: row.member_id,
                organization_id: row.member_org_id,
                user_id: row.member_user_id,
                role: row.member_role,
                created_at: row.member_created_at,
                profile: {
                    full_name: row.profile_full_name,
                    email: row.profile_email,
                },
            }));
            setMembers(mapped as OrganizationMember[]);
        }
    }, [currentOrg]);

    useEffect(() => {
        if (currentOrg) refreshMembers();
    }, [currentOrg, refreshMembers]);

    const createOrganization = useCallback(async (data: Partial<Organization>): Promise<Organization> => {
        if (!user) throw new Error('Non connecté');

        const { data: org, error } = await supabase
            .from('organizations')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .insert({ ...data, created_by: user.id } as any)
            .select()
            .single();

        if (error) throw error;
        const newOrg = org as Organization;

        // Add creator as manager
        await supabase.from('organization_members').insert({
            organization_id: newOrg.id,
            user_id: user.id,
            role: 'manager',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);

        // Update profile
        await supabase.from('profiles').update({
            account_type: 'cabinet',
            current_organization_id: newOrg.id,
            has_completed_setup: true,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any).eq('id', user.id);

        setCurrentOrg(newOrg);
        setUserRole('manager');
        setAccountType('cabinet');
        setHasCompletedSetup(true);
        setOrganizations(prev => [...prev, newOrg]);

        return newOrg;
    }, [user]);

    const joinOrganization = useCallback(async (code: string): Promise<{ orgName: string }> => {
        if (!user) throw new Error('Non connecté');

        // Find org by code
        const { data: orgData, error: findErr } = await supabase
            .rpc('find_organization_by_code', { code });

        if (findErr || !orgData || (orgData as SupabaseRecord[]).length === 0) {
            throw new Error('Code d\'invitation invalide');
        }

        const org = (orgData as SupabaseRecord[])[0];
        const orgId = org.id as string;

        // Check not already a member
        const { data: existing } = await supabase
            .from('organization_members')
            .select('id')
            .eq('organization_id', orgId)
            .eq('user_id', user.id)
            .single();

        if (existing) throw new Error('Vous êtes déjà membre de ce cabinet');

        // Join as collaborator

        await supabase.from('organization_members').insert({
            organization_id: orgId,
            user_id: user.id,
            role: 'collaborator',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);

        // Update profile
        await supabase.from('profiles').update({
            account_type: 'cabinet',
            current_organization_id: org.id,
            has_completed_setup: true,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any).eq('id', user.id);

        setAccountType('cabinet');
        setHasCompletedSetup(true);
        setUserRole('collaborator');

        // Reload org data
        const { data: fullOrg } = await supabase.from('organizations').select('*').eq('id', orgId).single();
        if (fullOrg) {
            setCurrentOrg(fullOrg as Organization);
            setOrganizations(prev => [...prev, fullOrg as Organization]);
        }

        return { orgName: org.name as string };
    }, [user]);

    const switchOrganization = useCallback(async (orgId: string) => {
        if (!user) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await supabase.from('profiles').update({ current_organization_id: orgId } as any).eq('id', user.id);
        const org = organizations.find(o => o.id === orgId);
        if (org) setCurrentOrg(org);

        // Update role for this org
        const { data: membership } = await supabase
            .from('organization_members')
            .select('role')
            .eq('organization_id', orgId)
            .eq('user_id', user.id)
            .single();
        if (membership) setUserRole((membership as SupabaseRecord).role as UserRole);
    }, [user, organizations]);

    const completeSetup = useCallback(async (type: AccountType) => {
        if (!user) return;
        await supabase.from('profiles').update({
            account_type: type,
            has_completed_setup: true,
        } as SupabaseRecord).eq('id', user.id);
        setAccountType(type);
        setHasCompletedSetup(true);
    }, [user]);

    const updateMemberRole = useCallback(async (memberId: string, role: 'manager' | 'team_lead' | 'collaborator') => {
        await supabase.from('organization_members').update({ role }).eq('id', memberId);
        await refreshMembers();
    }, [refreshMembers]);

    const removeMember = useCallback(async (memberId: string) => {
        await supabase.from('organization_members').delete().eq('id', memberId);
        await refreshMembers();
    }, [refreshMembers]);

    const updateBranding = useCallback(async (primaryColor?: string, bgColor?: string) => {
        if (!currentOrg) return;
        const updates: SupabaseRecord = {};
        if (primaryColor !== undefined) updates.brand_primary_color = primaryColor || null;
        if (bgColor !== undefined) updates.brand_bg_color = bgColor || null;

        await supabase.from('organizations').update(updates).eq('id', currentOrg.id);

        const updatedOrg = { ...currentOrg, ...updates };
        setCurrentOrg(updatedOrg);

        // Apply instantly
        setCabinetBranding({
            primaryColor: updatedOrg.brand_primary_color || undefined,
            bgColor: updatedOrg.brand_bg_color || undefined,
        });
    }, [currentOrg, setCabinetBranding]);

    const updateOrganization = useCallback(async (updates: Partial<Organization>) => {
        if (!currentOrg) return;
        const { error } = await supabase.from('organizations').update(updates as SupabaseRecord).eq('id', currentOrg.id);
        if (error) throw error;
        setCurrentOrg({ ...currentOrg, ...updates });
    }, [currentOrg]);

    return (
        <OrganizationContext.Provider value={{
            currentOrg,
            userRole,
            accountType,
            members,
            organizations,
            hasCompletedSetup,
            loading,
            createOrganization,
            joinOrganization,
            switchOrganization,
            completeSetup,
            refreshMembers,
            updateMemberRole,
            removeMember,
            updateBranding,
            updateOrganization,
        }}>
            {children}
        </OrganizationContext.Provider>
    );
}

export function useOrganization() {
    const context = useContext(OrganizationContext);
    const { isBatmanMode } = useEasterEgg();

    if (!context) throw new Error('useOrganization must be used within OrganizationProvider');

    if (isBatmanMode) {
        return {
            ...context,
            userRole: 'manager' as UserRole,
        };
    }

    return context;
}
