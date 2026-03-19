/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, User, Link2, ArrowRight, ArrowLeft, Loader2, CheckCircle, Copy, Briefcase, MapPin, Users, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useToast } from '@/hooks/use-toast';
import { AppLogo } from '@/components/ui/AppLogo';
import { cn } from '@/lib/utils';

type SetupStep = 'choose' | 'create_cabinet' | 'join_cabinet';

const LEGAL_FORMS = ['SARL', 'SAS', 'SASU', 'SCI', 'EI', 'EURL', 'SA', 'SNC', 'Autre'];
const TEAM_SIZES = ['1-5', '6-15', '16-50', '50+'];
const SPECIALTIES = [
    { id: 'compta', label: 'Comptabilité Générale' },
    { id: 'social', label: 'Social / Paie' },
    { id: 'fiscal', label: 'Fiscalité' },
    { id: 'audit', label: 'Audit / CAC' },
    { id: 'juridique', label: 'Juridique' },
    { id: 'conseil', label: 'Conseil' },
];

export default function AccountSetup() {
    const navigate = useNavigate();
    const { createOrganization, joinOrganization, completeSetup } = useOrganization();
    const { toast } = useToast();

    const [step, setStep] = useState<SetupStep>('choose');
    const [loading, setLoading] = useState(false);

    // Cabinet form state
    const [cabinetName, setCabinetName] = useState('');
    const [legalForm, setLegalForm] = useState('');
    const [siret, setSiret] = useState('');
    const [address, setAddress] = useState('');
    const [establishmentsCount, setEstablishmentsCount] = useState(1);
    const [establishmentNames, setEstablishmentNames] = useState<string[]>([]);
    const [teamSize, setTeamSize] = useState('');
    const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);

    // Join form state
    const [inviteCode, setInviteCode] = useState('');


    // Created org state
    const [createdCode, setCreatedCode] = useState('');

    const handleSoloMode = async () => {
        setLoading(true);
        try {
            await completeSetup('solo');
            toast({ title: 'Bienvenue !', description: 'Votre espace personnel est prêt.' });
            navigate('/dashboard');
        } catch (err: any) {
            toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCabinet = async () => {
        if (!cabinetName.trim()) {
            toast({ title: 'Erreur', description: 'Le nom du cabinet est obligatoire.', variant: 'destructive' });
            return;
        }
        setLoading(true);
        try {
            const org = await createOrganization({
                name: cabinetName,
                legal_form: legalForm || undefined,
                siret: siret || undefined,
                address: address || undefined,
                establishments_count: establishmentsCount,
                establishment_names: establishmentNames.length > 0 ? establishmentNames : undefined,
                team_size_range: teamSize || undefined,
                specialties: selectedSpecialties.length > 0 ? selectedSpecialties : undefined,
            });
            setCreatedCode(org.invite_code);
            toast({ title: 'Cabinet créé !', description: `Votre cabinet "${cabinetName}" est prêt.` });
        } catch (err: any) {
            toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const handleJoinCabinet = async () => {
        if (!inviteCode.trim()) return;
        setLoading(true);
        try {
            const { orgName } = await joinOrganization(inviteCode.trim());
            toast({ title: 'Bienvenue !', description: `Vous avez rejoint "${orgName}".` });
            navigate('/dashboard');
        } catch (err: any) {
            toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const toggleSpecialty = (id: string) => {
        setSelectedSpecialties(prev =>
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        );
    };

    const copyCode = () => {
        navigator.clipboard.writeText(createdCode);
        toast({ title: 'Copié !', description: 'Code d\'invitation copié dans le presse-papiers.' });
    };

    // ============ SUCCESS SCREEN ============
    if (createdCode) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-6">
                <div className="max-w-lg w-full text-center animate-fade-in">
                    <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-10 h-10 text-success" />
                    </div>
                    <h1 className="text-3xl font-bold mb-2">Cabinet créé avec succès !</h1>
                    <p className="text-muted-foreground mb-8">
                        Partagez ce code avec vos collaborateurs pour qu'ils rejoignent votre cabinet.
                    </p>

                    <div className="bento-card p-6 mb-6">
                        <p className="text-sm text-muted-foreground mb-2">Code d'invitation</p>
                        <div className="flex items-center justify-center gap-3">
                            <span className="text-4xl font-mono font-bold tracking-[0.3em] text-primary">
                                {createdCode.toUpperCase()}
                            </span>
                            <Button variant="ghost" size="sm" onClick={copyCode} className="rounded-xl">
                                <Copy className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    <Button onClick={() => navigate('/dashboard')} className="w-full rounded-xl h-12 text-base gap-2">
                        Accéder au tableau de bord <ArrowRight className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
            <div className="max-w-2xl w-full animate-fade-in">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="flex justify-center mb-6">
                        <AppLogo size="lg" showSubtext />
                    </div>
                    <h1 className="text-3xl font-bold mb-2">
                        {step === 'choose' && 'Comment souhaitez-vous utiliser APPMATO ?'}
                        {step === 'create_cabinet' && 'Créer votre cabinet'}
                        {step === 'join_cabinet' && 'Rejoindre un cabinet'}
                    </h1>
                    <p className="text-muted-foreground">
                        {step === 'choose' && 'Choisissez le mode qui correspond à votre situation.'}
                        {step === 'create_cabinet' && 'Renseignez les informations de votre cabinet comptable.'}
                        {step === 'join_cabinet' && 'Entrez le code que votre gérant vous a communiqué.'}
                    </p>
                </div>

                {/* CHOOSE STEP */}
                {step === 'choose' && (
                    <div className="grid gap-4 md:grid-cols-3">
                        {/* Solo */}
                        <button
                            onClick={handleSoloMode}
                            disabled={loading}
                            className="bento-card p-6 text-left hover:border-primary/50 hover:shadow-lg transition-all group cursor-pointer"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                                <User className="w-7 h-7 text-primary" />
                            </div>
                            <h3 className="font-bold text-lg mb-2">Usage Personnel</h3>
                            <p className="text-sm text-muted-foreground">
                                Je gère mes dossiers seul, sans besoin d'équipe ni de partage.
                            </p>
                        </button>

                        {/* Create Cabinet */}
                        <button
                            onClick={() => setStep('create_cabinet')}
                            className="bento-card p-6 text-left hover:border-primary/50 hover:shadow-lg transition-all group cursor-pointer border-primary/30"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                                <Building2 className="w-7 h-7 text-primary" />
                            </div>
                            <h3 className="font-bold text-lg mb-2">Créer un Cabinet</h3>
                            <p className="text-sm text-muted-foreground">
                                Je suis gérant et veux inviter mes collaborateurs.
                            </p>
                            <span className="inline-flex items-center gap-1 mt-3 text-xs text-primary font-medium">
                                Recommandé <Sparkles className="w-3 h-3" />
                            </span>
                        </button>

                        {/* Join Cabinet */}
                        <button
                            onClick={() => setStep('join_cabinet')}
                            className="bento-card p-6 text-left hover:border-primary/50 hover:shadow-lg transition-all group cursor-pointer"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                                <Link2 className="w-7 h-7 text-primary" />
                            </div>
                            <h3 className="font-bold text-lg mb-2">Rejoindre un Cabinet</h3>
                            <p className="text-sm text-muted-foreground">
                                Mon gérant m'a donné un code d'accès pour rejoindre son cabinet.
                            </p>
                        </button>
                    </div>
                )}

                {/* CREATE CABINET STEP */}
                {step === 'create_cabinet' && (
                    <div className="bento-card p-8">
                        <button
                            onClick={() => setStep('choose')}
                            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" /> Retour
                        </button>

                        <div className="space-y-6">
                            {/* Nom + Forme juridique */}
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <Label className="flex items-center gap-2 mb-2">
                                        <Building2 className="w-4 h-4 text-primary" /> Nom du cabinet *
                                    </Label>
                                    <Input
                                        value={cabinetName}
                                        onChange={e => setCabinetName(e.target.value)}
                                        placeholder="Ex: Cabinet Amato & Associés"
                                        className="input-premium"
                                    />
                                </div>
                                <div>
                                    <Label className="flex items-center gap-2 mb-2">
                                        <Briefcase className="w-4 h-4 text-primary" /> Forme juridique *
                                    </Label>
                                    <select
                                        value={legalForm}
                                        onChange={e => setLegalForm(e.target.value)}
                                        className="input-premium w-full"
                                    >
                                        <option value="">Sélectionner...</option>
                                        {LEGAL_FORMS.map(f => (
                                            <option key={f} value={f}>{f}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* SIRET + Adresse */}
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <Label className="mb-2 block">SIRET</Label>
                                    <Input
                                        value={siret}
                                        onChange={e => setSiret(e.target.value)}
                                        placeholder="14 chiffres"
                                        maxLength={14}
                                        className="input-premium"
                                    />
                                </div>
                                <div>
                                    <Label className="flex items-center gap-2 mb-2">
                                        <MapPin className="w-4 h-4 text-primary" /> Adresse
                                    </Label>
                                    <Input
                                        value={address}
                                        onChange={e => setAddress(e.target.value)}
                                        placeholder="Adresse principale"
                                        className="input-premium"
                                    />
                                </div>
                            </div>

                            {/* Établissements */}
                            <div>
                                <Label className="mb-2 block">Nombre d'établissements *</Label>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map(n => (
                                        <button
                                            key={n}
                                            onClick={() => {
                                                setEstablishmentsCount(n);
                                                setEstablishmentNames(prev => {
                                                    if (n <= 1) return [];
                                                    return prev.slice(0, n);
                                                });
                                            }}
                                            className={cn(
                                                'w-12 h-12 rounded-xl border-2 font-bold transition-all',
                                                establishmentsCount === n
                                                    ? 'border-primary bg-primary text-primary-foreground'
                                                    : 'border-border hover:border-primary/50'
                                            )}
                                        >
                                            {n}{n === 5 ? '+' : ''}
                                        </button>
                                    ))}
                                </div>
                                {establishmentsCount > 1 && (
                                    <div className="mt-3 space-y-2">
                                        {Array.from({ length: establishmentsCount }, (_, i) => (
                                            <Input
                                                key={i}
                                                value={establishmentNames[i] || ''}
                                                onChange={e => {
                                                    const newNames = [...establishmentNames];
                                                    newNames[i] = e.target.value;
                                                    setEstablishmentNames(newNames);
                                                }}
                                                placeholder={`Nom de l'établissement ${i + 1}`}
                                                className="input-premium"
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Taille d'équipe */}
                            <div>
                                <Label className="flex items-center gap-2 mb-2">
                                    <Users className="w-4 h-4 text-primary" /> Nombre de collaborateurs *
                                </Label>
                                <div className="flex gap-2">
                                    {TEAM_SIZES.map(size => (
                                        <button
                                            key={size}
                                            onClick={() => setTeamSize(size)}
                                            className={cn(
                                                'px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all',
                                                teamSize === size
                                                    ? 'border-primary bg-primary text-primary-foreground'
                                                    : 'border-border hover:border-primary/50'
                                            )}
                                        >
                                            {size}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Spécialités */}
                            <div>
                                <Label className="mb-2 block">Spécialités du cabinet</Label>
                                <div className="flex flex-wrap gap-2">
                                    {SPECIALTIES.map(s => (
                                        <button
                                            key={s.id}
                                            onClick={() => toggleSpecialty(s.id)}
                                            className={cn(
                                                'px-3 py-1.5 rounded-xl border text-sm transition-all',
                                                selectedSpecialties.includes(s.id)
                                                    ? 'border-primary bg-primary/10 text-primary font-medium'
                                                    : 'border-border text-muted-foreground hover:border-primary/30'
                                            )}
                                        >
                                            {s.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Submit */}
                            <Button
                                onClick={handleCreateCabinet}
                                disabled={loading || !cabinetName.trim()}
                                className="w-full h-12 rounded-xl text-base gap-2"
                            >
                                {loading ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Création en cours...</>
                                ) : (
                                    <>Créer mon cabinet <ArrowRight className="w-4 h-4" /></>
                                )}
                            </Button>
                        </div>
                    </div>
                )}

                {/* JOIN CABINET STEP */}
                {step === 'join_cabinet' && (
                    <div className="bento-card p-8 max-w-md mx-auto">
                        <button
                            onClick={() => setStep('choose')}
                            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" /> Retour
                        </button>

                        <div className="text-center mb-6">
                            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                <Link2 className="w-8 h-8 text-primary" />
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Demandez le code à votre gérant. Il se trouve dans les paramètres de son cabinet.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <Label className="mb-2 block">Code d'invitation</Label>
                                <Input
                                    value={inviteCode}
                                    onChange={e => setInviteCode(e.target.value.toUpperCase())}
                                    placeholder="Ex: A3F8B2C1"
                                    maxLength={8}
                                    className="input-premium text-center text-2xl font-mono tracking-[0.3em] uppercase"
                                />
                            </div>

                            <Button
                                onClick={handleJoinCabinet}
                                disabled={loading || inviteCode.length < 4}
                                className="w-full h-12 rounded-xl text-base gap-2"
                            >
                                {loading ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Vérification...</>
                                ) : (
                                    <>Rejoindre <ArrowRight className="w-4 h-4" /></>
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
