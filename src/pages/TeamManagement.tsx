/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Users, Shield, UserCheck, UserMinus, Crown, Copy, Search,
    ArrowRight, RefreshCw, UserPlus
} from 'lucide-react';
import { cn } from '@/lib/utils';

type TabId = 'members' | 'teams';

const ROLE_LABELS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    manager: { label: 'Gérant', icon: Crown, color: 'text-yellow-500' },
    team_lead: { label: 'Chef de Mission', icon: Shield, color: 'text-primary' },
    collaborator: { label: 'Salarié', icon: UserCheck, color: 'text-muted-foreground' },
};

export default function TeamManagement() {
    const { user } = useAuth();
    const { currentOrg, userRole, members, refreshMembers, updateMemberRole, removeMember } = useOrganization();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState<TabId>('members');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState<string | null>(null);
    const [showDebug, setShowDebug] = useState(false);
    const [debugInfo, setDebugInfo] = useState<string>('');

    // Debug : appeler directement la RPC et loguer le résultat
    useEffect(() => {
        if (!currentOrg || !showDebug) return;
        const runDebug = async () => {
            const info: string[] = [];
            info.push(`👤 User ID: ${user?.id}`);
            info.push(`🏢 Org ID: ${currentOrg.id}`);
            info.push(`🏷️ Org Name: ${currentOrg.name}`);
            info.push(`🎭 User Role: ${userRole}`);
            info.push(`📊 Members dans le contexte: ${members.length}`);
            members.forEach((m, i) => {
                info.push(`  [${i}] ${m.profile?.email || 'pas d\'email'} — ${m.role} — user_id: ${m.user_id}`);
            });

            // Test direct RPC
            info.push(`\n--- Test RPC get_cabinet_members ---`);
            const { data: rpcData, error: rpcError } = await supabase.rpc('get_cabinet_members', {
                p_org_id: currentOrg.id
            });
            if (rpcError) {
                info.push(`❌ Erreur RPC : ${rpcError.message}`);
                info.push(`   Code: ${rpcError.code}`);
                info.push(`   Details: ${rpcError.details}`);
                info.push(`   Hint: ${rpcError.hint}`);
            } else {
                info.push(`✅ RPC OK — ${(rpcData as any[])?.length || 0} résultats`);
                (rpcData as any[])?.forEach((r: any, i: number) => {
                    info.push(`  [${i}] ${r.profile_email} — ${r.member_role}`);
                });
            }

            // Test direct table
            info.push(`\n--- Test SELECT direct organization_members ---`);
            const { data: directData, error: directErr } = await supabase
                .from('organization_members')
                .select('id, user_id, role, organization_id')
                .eq('organization_id', currentOrg.id);
            if (directErr) {
                info.push(`❌ Erreur SELECT direct: ${directErr.message}`);
            } else {
                info.push(`✅ SELECT OK — ${directData?.length || 0} résultats`);
                directData?.forEach((r: any, i: number) => {
                    info.push(`  [${i}] user_id: ${r.user_id} — ${r.role}`);
                });
            }

            setDebugInfo(info.join('\n'));
        };
        runDebug();
    }, [currentOrg, showDebug, user, userRole, members]);

    // Team assignments state
    const [teamAssignments, setTeamAssignments] = useState<{ id: string; team_lead_id: string; collaborator_id: string }[]>([]);

    const filteredMembers = useMemo(() => {
        if (!searchQuery) return members;
        const q = searchQuery.toLowerCase();
        return members.filter(m =>
            (m.profile?.full_name?.toLowerCase() || '').includes(q) ||
            (m.profile?.email?.toLowerCase() || '').includes(q)
        );
    }, [members, searchQuery]);

    const teamLeads = useMemo(() => members.filter(m => m.role === 'team_lead'), [members]);
    const collaborators = useMemo(() => members.filter(m => m.role === 'collaborator'), [members]);

    const loadTeamAssignments = async () => {
        if (!currentOrg) return;
        try {
            const { data, error } = await supabase.rpc('get_cabinet_assignments', {
                p_org_id: currentOrg.id
            });

            if (error) {
                console.error('Erreur RPC team_assignments:', error);
                // Fallback
                const { data: fallbackData, error: fallbackErr } = await supabase
                    .from('team_assignments')
                    .select('*')
                    .eq('organization_id', currentOrg.id);
                if (fallbackErr) throw fallbackErr;
                if (fallbackData) setTeamAssignments(fallbackData as any[]);
                return;
            }
            if (data) setTeamAssignments(data as any[]);
        } catch (err) {
            console.error(err);
        }
    };

    const handleRoleChange = async (memberId: string, newRole: 'manager' | 'team_lead' | 'collaborator') => {
        setLoading(memberId);
        try {
            await updateMemberRole(memberId, newRole);
            toast({ title: 'Rôle modifié', description: `Le rôle a été mis à jour.` });
        } catch (err: any) {
            toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
        } finally {
            setLoading(null);
        }
    };

    const handleRemove = async (memberId: string, email?: string) => {
        if (!confirm(`Êtes-vous sûr de vouloir retirer ${email || 'ce membre'} du cabinet ?`)) return;
        setLoading(memberId);
        try {
            await removeMember(memberId);
            toast({ title: 'Membre retiré', description: `${email || 'Le membre'} a été retiré du cabinet.` });
        } catch (err: any) {
            toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
        } finally {
            setLoading(null);
        }
    };

    const handleAssign = async (teamLeadId: string, collaboratorId: string) => {
        if (!currentOrg) return;
        try {
            await supabase.from('team_assignments').insert({
                organization_id: currentOrg.id,
                team_lead_id: teamLeadId,
                collaborator_id: collaboratorId,
            } as any);
            toast({ title: 'Assignation réussie' });
            loadTeamAssignments();
        } catch (err: any) {
            toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
        }
    };

    const handleUnassign = async (assignmentId: string) => {
        try {
            await supabase.from('team_assignments').delete().eq('id', assignmentId);
            toast({ title: 'Assignation retirée' });
            loadTeamAssignments();
        } catch (err: any) {
            toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
        }
    };

    const copyInviteCode = () => {
        if (!currentOrg) return;
        navigator.clipboard.writeText(currentOrg.invite_code);
        toast({ title: 'Copié !', description: 'Code d\'invitation copié.' });
    };

    if (userRole !== 'manager') {
        return (
            <MainLayout>
                <div className="p-8 text-center">
                    <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <h1 className="text-2xl font-bold mb-2">Accès restreint</h1>
                    <p className="text-muted-foreground">Seuls les gérants peuvent accéder à la gestion d'équipe.</p>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="p-6 lg:p-8 max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                            <Users className="w-6 h-6 text-primary" />
                        </div>
                        Gestion de l'Équipe
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        {currentOrg?.name} — {members.length} membre{members.length > 1 ? 's' : ''}
                    </p>
                </div>

                {/* Debug Panel Toggle */}
                <div className="mb-6 flex justify-end">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDebug(!showDebug)}
                        className="text-xs gap-2"
                    >
                        <RefreshCw className={cn("w-3 h-3", showDebug && "animate-spin")} />
                        {showDebug ? 'Masquer le Diagnostic' : 'Ouvrir le Diagnostic (Debug)'}
                    </Button>
                </div>

                {showDebug && (
                    <div className="bento-card mb-6 bg-slate-950 text-slate-50 p-6 font-mono text-xs overflow-auto max-h-96 whitespace-pre border-red-500/50 border-2">
                        <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-2">
                            <span className="text-red-400 font-bold">🛠️ DIAGNOSTIC TEMPS RÉEL</span>
                            <div className="flex gap-2">
                                <Button variant="secondary" size="sm" onClick={() => refreshMembers()} className="h-6 text-[10px]">Actualiser Contexte</Button>
                                <Button variant="destructive" size="sm" onClick={() => setShowDebug(false)} className="h-6 text-[10px]">Fermer</Button>
                            </div>
                        </div>
                        {debugInfo || 'Chargement des données de diagnostic...'}
                    </div>
                )}

                {/* Invite Card */}
                <div className="bento-card p-6 mb-6 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <UserPlus className="w-5 h-5 text-primary" />
                                Inviter des collaborateurs
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Partagez ce code pour que vos collaborateurs rejoignent votre cabinet.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="px-4 py-2 rounded-xl bg-card border-2 border-primary/30">
                                <span className="font-mono text-xl font-bold tracking-[0.2em] text-primary">
                                    {currentOrg?.invite_code?.toUpperCase()}
                                </span>
                            </div>
                            <Button variant="outline" size="sm" onClick={copyInviteCode} className="rounded-xl gap-2">
                                <Copy className="w-4 h-4" /> Copier
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setActiveTab('members')}
                        className={cn(
                            'px-4 py-2 rounded-xl text-sm font-medium transition-all',
                            activeTab === 'members'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                        )}
                    >
                        <Users className="w-4 h-4 inline mr-2" />
                        Membres ({members.length})
                    </button>
                    <button
                        onClick={() => { setActiveTab('teams'); loadTeamAssignments(); }}
                        className={cn(
                            'px-4 py-2 rounded-xl text-sm font-medium transition-all',
                            activeTab === 'teams'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                        )}
                    >
                        <Shield className="w-4 h-4 inline mr-2" />
                        Équipes
                    </button>
                </div>

                {/* Members Tab */}
                {activeTab === 'members' && (
                    <div className="space-y-4">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Rechercher un membre..."
                                className="pl-10 input-premium"
                            />
                        </div>

                        {/* Refresh */}
                        <div className="flex justify-end">
                            <Button variant="ghost" size="sm" onClick={refreshMembers} className="gap-2 text-muted-foreground">
                                <RefreshCw className="w-4 h-4" /> Actualiser
                            </Button>
                        </div>

                        {/* Members List */}
                        <div className="space-y-2">
                            {filteredMembers.map(member => {
                                const roleInfo = ROLE_LABELS[member.role] || ROLE_LABELS.collaborator;
                                const RoleIcon = roleInfo.icon;
                                const isCurrentUser = member.user_id === user?.id;

                                return (
                                    <div key={member.id} className="bento-card p-4 flex items-center gap-4">
                                        {/* Avatar */}
                                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                                            <span className="text-sm font-bold text-muted-foreground">
                                                {(member.profile?.full_name || member.profile?.email || '?').charAt(0).toUpperCase()}
                                            </span>
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate">
                                                {member.profile?.full_name || member.profile?.email}
                                                {isCurrentUser && <span className="text-xs text-muted-foreground ml-2">(vous)</span>}
                                            </p>
                                            <p className="text-sm text-muted-foreground truncate">{member.profile?.email}</p>
                                        </div>

                                        {/* Role Badge */}
                                        <div className={cn('flex items-center gap-1.5 px-3 py-1 rounded-xl bg-muted text-sm font-medium', roleInfo.color)}>
                                            <RoleIcon className="w-3.5 h-3.5" />
                                            {roleInfo.label}
                                        </div>

                                        {/* Actions */}
                                        {!isCurrentUser && (
                                            <div className="flex items-center gap-1">
                                                <select
                                                    value={member.role}
                                                    onChange={e => handleRoleChange(member.id, e.target.value as any)}
                                                    disabled={loading === member.id}
                                                    className="text-xs border rounded-lg px-2 py-1.5 bg-background"
                                                >
                                                    <option value="collaborator">Salarié</option>
                                                    <option value="team_lead">Chef de Mission</option>
                                                    <option value="manager">Gérant</option>
                                                </select>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRemove(member.id, member.profile?.email)}
                                                    disabled={loading === member.id}
                                                    className="text-destructive hover:bg-destructive/10 rounded-xl p-2 h-auto"
                                                    title="Retirer du cabinet"
                                                >
                                                    <UserMinus className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {filteredMembers.length === 0 && (
                                <div className="text-center py-10 text-muted-foreground">
                                    <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                    <p>Aucun membre trouvé.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Teams Tab */}
                {activeTab === 'teams' && (
                    <div className="space-y-6">
                        {teamLeads.length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground bento-card">
                                <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p className="font-medium">Aucun Chef de Mission</p>
                                <p className="text-sm mt-1">Promouvez un salarié en Chef de Mission dans l'onglet Membres.</p>
                            </div>
                        ) : (
                            teamLeads.map(lead => {
                                const assignedIds = teamAssignments
                                    .filter(a => a.team_lead_id === lead.user_id)
                                    .map(a => a.collaborator_id);
                                const assignedMembers = members.filter(m => assignedIds.includes(m.user_id));
                                const unassignedCollabs = collaborators.filter(c => !assignedIds.includes(c.user_id));

                                return (
                                    <div key={lead.id} className="bento-card p-6">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                <Shield className="w-5 h-5 text-primary" />
                                            </div>
                                            <div>
                                                <p className="font-bold">{lead.profile?.full_name || lead.profile?.email}</p>
                                                <p className="text-xs text-muted-foreground">Chef de Mission — {assignedMembers.length} salarié(s)</p>
                                            </div>
                                        </div>

                                        {/* Assigned collaborators */}
                                        {assignedMembers.length > 0 && (
                                            <div className="space-y-2 mb-4">
                                                {assignedMembers.map(collab => {
                                                    const assignment = teamAssignments.find(
                                                        a => a.team_lead_id === lead.user_id && a.collaborator_id === collab.user_id
                                                    );
                                                    return (
                                                        <div key={collab.id} className="flex items-center gap-3 pl-4 py-2 bg-muted/50 rounded-xl">
                                                            <ArrowRight className="w-3 h-3 text-muted-foreground" />
                                                            <span className="text-sm flex-1">{collab.profile?.full_name || collab.profile?.email}</span>
                                                            {assignment && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleUnassign(assignment.id)}
                                                                    className="text-destructive text-xs h-7 rounded-lg"
                                                                >
                                                                    Retirer
                                                                </Button>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Add collaborator */}
                                        {unassignedCollabs.length > 0 && (
                                            <div className="border-t border-border/50 pt-3">
                                                <p className="text-xs text-muted-foreground mb-2">Assigner un salarié :</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {unassignedCollabs.map(collab => (
                                                        <Button
                                                            key={collab.id}
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleAssign(lead.user_id, collab.user_id)}
                                                            className="text-xs rounded-xl gap-1"
                                                        >
                                                            <UserPlus className="w-3 h-3" />
                                                            {collab.profile?.full_name || collab.profile?.email}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>
        </MainLayout>
    );
}
