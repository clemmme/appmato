import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/contexts/OrganizationContext';
import { PennylaneService } from '@/lib/pennylane';
import { MicrosoftService } from '@/lib/microsoft';
import {
    Link2,
    Mail,
    ExternalLink,
    CheckCircle2,
    AlertCircle,
    Loader2,
    ArrowRight,
    Calendar,
    Settings2,
    Database,
    Shield,
    Trash2,
    RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface IntegrationCardProps {
    title: string;
    description: string;
    icon: React.ElementType;
    status: 'connected' | 'disconnected' | 'error';
    logoUrl?: string;
    children?: React.ReactNode;
}

function IntegrationCard({ title, description, icon: Icon, status, children }: IntegrationCardProps) {
    return (
        <div className="bento-card group hover:border-primary/30 transition-all duration-500 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4">
                {status === 'connected' ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider">
                        <CheckCircle2 className="w-3 h-3" /> Connecté
                    </div>
                ) : status === 'error' ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 text-red-600 border border-red-500/20 text-[10px] font-bold uppercase tracking-wider">
                        <AlertCircle className="w-3 h-3" /> Erreur
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20 text-[10px] font-bold uppercase tracking-wider">
                        Déconnecté
                    </div>
                )}
            </div>

            <div className="flex items-start gap-5 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent flex items-center justify-center border border-primary/20 group-hover:scale-110 transition-transform duration-500">
                    <Icon className="w-7 h-7 text-primary" />
                </div>
                <div className="flex-1 pr-20">
                    <h3 className="text-xl font-bold mb-1.5">{title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
                </div>
            </div>

            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-500">
                {children}
            </div>
        </div>
    );
}

export default function Integrations() {
    const { toast } = useToast();
    const { currentOrg, updateOrganization, userRole } = useOrganization();
    const [pennylaneKey, setPennylaneKey] = useState('');
    const [microsoftTenantId, setMicrosoftTenantId] = useState('');
    const [microsoftClientId, setMicrosoftClientId] = useState('');
    const [isPennylaneConnecting, setIsPennylaneConnecting] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isOutlookConnecting, setIsOutlookConnecting] = useState(false);

    useEffect(() => {
        if (currentOrg) {
            setPennylaneKey(currentOrg.pennylane_api_key || '');
            setMicrosoftTenantId(currentOrg.microsoft_tenant_id || '');
            setMicrosoftClientId(currentOrg.microsoft_client_id || '');
        }
    }, [currentOrg]);

    // Handle Microsoft OAuth Callback
    useEffect(() => {
        const handleCallback = async () => {
            const params = new URLSearchParams(window.location.search);
            const code = params.get('code');
            const error = params.get('error');

            if (error) {
                toast({ title: "Erreur Microsoft", description: params.get('error_description') || "L'authentification a échoué.", variant: "destructive" });
                window.history.replaceState({}, document.title, window.location.pathname);
                return;
            }

            if (code && currentOrg && microsoftTenantId && microsoftClientId) {
                setIsOutlookConnecting(true);
                try {
                    const verifier = localStorage.getItem('ms_code_verifier');
                    if (!verifier) throw new Error("Vérificateur de code (PKCE) manquant.");

                    const service = new MicrosoftService({
                        clientId: microsoftClientId,
                        tenantId: microsoftTenantId,
                        redirectUri: window.location.origin + window.location.pathname
                    });

                    const tokens = await service.exchangeCodeForTokens(code, verifier);

                    await updateOrganization({
                        microsoft_access_token: tokens.access_token,
                        microsoft_refresh_token: tokens.refresh_token,
                        microsoft_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString()
                    });

                    localStorage.removeItem('ms_code_verifier');
                    toast({ title: "Outlook Connecté", description: "Votre cabinet est maintenant lié à Microsoft Graph." });

                    // Nettoyer l'URL
                    window.history.replaceState({}, document.title, window.location.pathname);
                } catch (err: any) {
                    console.error("Callback Error:", err);
                    toast({ title: "Échec de connexion", description: err.message, variant: "destructive" });
                } finally {
                    setIsOutlookConnecting(false);
                }
            }
        };

        handleCallback();
    }, [currentOrg, microsoftTenantId, microsoftClientId, toast, updateOrganization]);

    const handleConnectPennylane = async () => {
        if (!pennylaneKey.trim()) {
            toast({ title: "Erreur", description: "Veuillez entrer une clé API valide.", variant: "destructive" });
            return;
        }
        if (!pennylaneKey.trim().startsWith('pk_')) {
            toast({ title: "Clé invalide", description: "La clé API Partner doit commencer par 'pk_'.", variant: "destructive" });
            return;
        }
        setIsPennylaneConnecting(true);
        try {
            await updateOrganization({ pennylane_api_key: pennylaneKey.trim() });
            toast({
                title: "Connexion Cabinet Activée",
                description: "La clé a été enregistrée. Tous les collaborateurs peuvent désormais synchroniser les dossiers."
            });
        } catch (error) {
            toast({ title: "Erreur", description: "Impossible de sauvegarder la clé.", variant: "destructive" });
        } finally {
            setIsPennylaneConnecting(false);
        }
    };

    const handleSyncClients = async () => {
        if (!currentOrg?.pennylane_api_key) return;
        setIsSyncing(true);
        try {
            const service = new PennylaneService(currentOrg.pennylane_api_key);
            const data = await service.getCustomers();

            // On gère à la fois le format réel (paginé) et le format mock
            const customers = data.customers || data;
            const count = Array.isArray(customers) ? customers.length : 0;

            toast({
                title: "Synchronisation réussie",
                description: `${count} dossiers clients récupérés${currentOrg.pennylane_api_key === 'pk_test_demo' ? ' (Mode Simulation)' : ''}.`
            });
        } catch (error: any) {
            toast({
                title: "Erreur de synchronisation",
                description: error.message || "Vérifiez votre clé API Pennylane.",
                variant: "destructive"
            });
        } finally {
            setIsSyncing(false);
        }
    };

    const handleDisconnectPennylane = async () => {
        if (!confirm("Voulez-vous vraiment déconnecter Pennylane ?")) return;
        setIsPennylaneConnecting(true);
        try {
            await updateOrganization({ pennylane_api_key: null as any });
            setPennylaneKey('');
            toast({ title: "Déconnecté", description: "L'intégration Pennylane a été désactivée." });
        } catch (error) {
            toast({ title: "Erreur", description: "Erreur lors de la déconnexion.", variant: "destructive" });
        } finally {
            setIsPennylaneConnecting(false);
        }
    };

    const handleConnectOutlook = async () => {
        if (!microsoftTenantId || !microsoftClientId) {
            toast({ title: "Champs requis", description: "Veuillez saisir le Tenant ID et le Client ID.", variant: "destructive" });
            return;
        }

        setIsOutlookConnecting(true);
        try {
            // Sauvegarder les ID d'abord pour référence (ils sont nécessaires pour le callback)
            await updateOrganization({
                microsoft_tenant_id: microsoftTenantId,
                microsoft_client_id: microsoftClientId
            });

            const service = new MicrosoftService({
                clientId: microsoftClientId,
                tenantId: microsoftTenantId,
                redirectUri: window.location.origin + window.location.pathname
            });

            const { verifier } = MicrosoftService.generatePKCE();
            localStorage.setItem('ms_code_verifier', verifier);

            // Rediriger vers l'URL d'autorisation Microsoft
            const authUrl = service.getAuthUrl();
            window.location.href = authUrl;
        } catch (error: any) {
            toast({ title: "Erreur", description: error.message || "La redirection a échoué.", variant: "destructive" });
        } finally {
            setIsOutlookConnecting(false);
        }
    };

    const handleDisconnectOutlook = async () => {
        if (!confirm("Voulez-vous vraiment déconnecter Microsoft Outlook ?")) return;
        setIsOutlookConnecting(true);
        try {
            await updateOrganization({
                microsoft_access_token: null as any,
                microsoft_expires_at: null as any
            });
            toast({ title: "Déconnecté", description: "L'intégration Outlook a été désactivée." });
        } catch (error) {
            toast({ title: "Erreur", description: "Erreur lors de la déconnexion.", variant: "destructive" });
        } finally {
            setIsOutlookConnecting(false);
        }
    };

    const outlookStatus = currentOrg?.microsoft_access_token ? 'connected' : 'disconnected';
    const pennylaneStatus = currentOrg?.pennylane_api_key ? 'connected' : 'disconnected';

    return (
        <MainLayout>
            <div className="p-6 lg:p-8 max-w-5xl mx-auto animate-fade-in mb-20">
                <div className="mb-10">
                    <div className="flex items-center gap-2 text-primary mb-2">
                        <Link2 className="w-5 h-5" />
                        <span className="text-xs font-bold uppercase tracking-[0.2em]">Espace API</span>
                    </div>
                    <h1 className="text-4xl font-extrabold text-foreground tracking-tight">Intégrations</h1>
                    <p className="text-muted-foreground mt-2 text-lg">
                        Connectez vos outils favoris pour automatiser votre cabinet.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Pennylane Integration */}
                    <IntegrationCard
                        title="Pennylane"
                        description="Synchronisez vos dossiers clients, factures et statuts de clôture directement depuis votre outil de production."
                        icon={Database}
                        status={pennylaneStatus}
                    >
                        <div className="pt-4 border-t border-border/50 space-y-4">
                            <div>
                                <Label htmlFor="pennylane-key" className="text-[11px] font-bold uppercase text-muted-foreground mb-2 block flex items-center gap-2">
                                    Clé API Partner (Cabinet)
                                    <Database className="w-3 h-3 text-indigo-500" />
                                </Label>
                                <Input
                                    id="pennylane-key"
                                    type="password"
                                    value={pennylaneKey}
                                    onChange={(e) => setPennylaneKey(e.target.value)}
                                    placeholder="pk_live_..."
                                    className="input-premium font-mono"
                                />
                                <button
                                    onClick={() => setPennylaneKey('pk_test_demo')}
                                    className="text-[9px] text-muted-foreground hover:text-indigo-500 mt-1 transition-colors italic"
                                >
                                    Mode Démo ? Cliquer ici pour utiliser la clé de test.
                                </button>
                            </div>
                            <div className="space-y-3">
                                <div className="flex gap-2">
                                    <Button
                                        onClick={handleConnectPennylane}
                                        disabled={isPennylaneConnecting || isSyncing}
                                        className="flex-1 btn-primary group rounded-2xl py-6"
                                    >
                                        {isPennylaneConnecting ? (
                                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                        ) : (
                                            <ExternalLink className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                                        )}
                                        {pennylaneStatus === 'connected' ? 'Mettre à jour' : 'Connecter le Cabinet'}
                                    </Button>
                                    {pennylaneStatus === 'connected' && (
                                        <Button
                                            onClick={handleDisconnectPennylane}
                                            disabled={isPennylaneConnecting || isSyncing}
                                            variant="outline"
                                            className="rounded-2xl py-6 px-4 border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 transition-all"
                                            title="Déconnecter"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </Button>
                                    )}
                                </div>

                                {pennylaneStatus === 'connected' && (
                                    <Button
                                        onClick={handleSyncClients}
                                        disabled={isSyncing || isPennylaneConnecting}
                                        variant="secondary"
                                        className="w-full rounded-2xl py-6 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-100 transition-all group"
                                    >
                                        {isSyncing ? (
                                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                        ) : (
                                            <RefreshCw className="w-5 h-5 mr-2 group-hover:rotate-180 transition-transform duration-700" />
                                        )}
                                        Synchroniser les dossiers clients
                                    </Button>
                                )}
                            </div>
                            <a href="https://pennylane.com/" target="_blank" rel="noopener noreferrer" className="text-center block text-[10px] text-muted-foreground hover:underline">
                                Comment obtenir une clé API par cabinet ?
                            </a>
                        </div>
                    </IntegrationCard>

                    {/* Microsoft Outlook Integration */}
                    <IntegrationCard
                        title="Microsoft Outlook"
                        description="Synchronisez votre calendrier et envoyez des relances automatiques par email à vos clients."
                        icon={Mail}
                        status={outlookStatus}
                    >
                        <div className="pt-4 border-t border-border/50 space-y-4">
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="ms-tenant" className="text-[11px] font-bold uppercase text-muted-foreground mb-2 block">
                                        Directory (Tenant) ID
                                    </Label>
                                    <Input
                                        id="ms-tenant"
                                        value={microsoftTenantId}
                                        onChange={(e) => setMicrosoftTenantId(e.target.value)}
                                        placeholder="00000000-0000-0000-0000-000000000000"
                                        className="input-premium font-mono"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="ms-client" className="text-[11px] font-bold uppercase text-muted-foreground mb-2 block">
                                        Application (Client) ID
                                    </Label>
                                    <Input
                                        id="ms-client"
                                        value={microsoftClientId}
                                        onChange={(e) => setMicrosoftClientId(e.target.value)}
                                        placeholder="00000000-0000-0000-0000-000000000000"
                                        className="input-premium font-mono"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex gap-2">
                                    <Button
                                        onClick={handleConnectOutlook}
                                        disabled={isOutlookConnecting || !microsoftTenantId || !microsoftClientId}
                                        className="flex-1 btn-secondary group flex items-center justify-center gap-2 rounded-2xl py-6"
                                    >
                                        {isOutlookConnecting ? (
                                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                        ) : (
                                            <div className="w-5 h-5 flex items-center justify-center mr-1">
                                                <svg className="w-4 h-4" viewBox="0 0 23 23">
                                                    <path fill="#f35325" d="M1 1h10v10H1z" />
                                                    <path fill="#81bc06" d="M12 1h10v10H12z" />
                                                    <path fill="#05a6f0" d="M1 12h10v10H1z" />
                                                    <path fill="#ffba08" d="M12 12h10v10H12z" />
                                                </svg>
                                            </div>
                                        )}
                                        {outlookStatus === 'connected' ? 'Mettre à jour' : 'Se connecter avec Microsoft'}
                                    </Button>

                                    {outlookStatus === 'connected' && (
                                        <Button
                                            onClick={handleDisconnectOutlook}
                                            disabled={isOutlookConnecting}
                                            variant="outline"
                                            className="rounded-2xl py-6 px-4 border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 transition-all"
                                            title="Déconnecter"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </IntegrationCard>

                    {/* Prochainement : Slack / Discord */}
                    <div className="md:col-span-2 bento-card border-dashed border-2 opacity-60 flex flex-col items-center justify-center py-12 text-center group">
                        <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4 group-hover:bg-muted/50 transition-colors">
                            <Settings2 className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-bold">D'autres intégrations arrivent bientôt</h3>
                        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                            Sellsy, MyUnisoft, Slack et plus encore sont sur notre feuille de route.
                        </p>
                    </div>
                </div>

                {/* Sécurité Notice */}
                <div className="mt-16 p-6 rounded-3xl bg-indigo-500/5 border border-indigo-500/10 flex items-start gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center shrink-0">
                        <Shield className="w-6 h-6 text-indigo-500" />
                    </div>
                    <div>
                        <h4 className="font-bold text-indigo-700 dark:text-indigo-400">Sécurité et Confidentialité</h4>
                        <p className="text-sm text-indigo-600/70 dark:text-indigo-400/60 mt-1">
                            APPMATO n'enregistre jamais vos mots de passe. Les connexions Microsoft utilisent des jetons OAuth sécurisés et les clés Pennylane sont chiffrées au repos dans nos serveurs sécurisés.
                        </p>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
