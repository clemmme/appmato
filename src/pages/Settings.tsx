/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { User, Building2, Mail, Save, Loader2, Clock, Palette, Copy, Shield, ArrowRight, Sparkles, Briefcase, Users, Link2, Paintbrush, RotateCcw } from 'lucide-react';
import { WorkScheduleSettings } from '@/components/profile/WorkScheduleSettings';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Link } from 'react-router-dom';
import type { Profile } from '@/lib/database.types';
import { AvatarBuilder } from '@/components/profile/AvatarBuilder';

export default function Settings() {
  const { user } = useAuth();
  const { theme, colorTheme, toggleTheme, setColorTheme } = useTheme();
  const { currentOrg, userRole, accountType, createOrganization, joinOrganization, updateBranding, refreshMembers } = useOrganization();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');

  // Upgrade to cabinet state
  const [showUpgradeForm, setShowUpgradeForm] = useState(false);
  const [upgradeName, setUpgradeName] = useState('');
  const [upgradeLegalForm, setUpgradeLegalForm] = useState('');
  const [upgradeTeamSize, setUpgradeTeamSize] = useState('');
  const [upgrading, setUpgrading] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  // Branding state
  const [brandPrimary, setBrandPrimary] = useState(currentOrg?.brand_primary_color || '');
  const [brandBg, setBrandBg] = useState(currentOrg?.brand_bg_color || '');
  const [savingBrand, setSavingBrand] = useState(false);

  // Avatar Builder state
  const [showAvatarBuilder, setShowAvatarBuilder] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile(data as Profile);
        setFullName(data.full_name || '');
        setCompanyName(data.company_name || '');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger le profil.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          company_name: companyName.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Profil mis à jour',
        description: 'Vos modifications ont été enregistrées.',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder les modifications.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-6 lg:p-8 max-w-3xl animate-fade-in">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Paramètres</h1>
          <p className="text-muted-foreground mt-1">Gérez votre profil et vos préférences</p>
        </div>

        <div className="space-y-6">
          {/* Profile Card */}
          <div className="bento-card space-y-6">
            <div className="flex items-center justify-between pb-6 border-b border-border">
              <div className="flex items-center gap-6">
                <div className="relative group">
                  <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-transparent group-hover:border-primary/50 transition-all">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 text-primary" />
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{fullName || 'Utilisateur'}</h3>
                  <p className="text-sm text-muted-foreground">{profile?.email}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAvatarBuilder(!showAvatarBuilder)}
                className="rounded-xl flex gap-2"
              >
                <Paintbrush className="w-4 h-4" />
                {showAvatarBuilder ? 'Fermer l\'éditeur' : 'Modifier l\'Avatar'}
              </Button>
            </div>

            {showAvatarBuilder && (
              <div className="pt-2 pb-6 border-b border-border/50">
                <h4 className="font-semibold mb-4 flex items-center gap-2 text-primary">
                  <Sparkles className="w-4 h-4" /> Personnalisez votre Avatar
                </h4>
                <AvatarBuilder
                  currentAvatarUrl={profile?.avatar_url}
                  onSave={async (newUrl) => {
                    setProfile(prev => prev ? { ...prev, avatar_url: newUrl } : null);
                    setShowAvatarBuilder(false);
                    await refreshMembers(); // Force refresh to update avatars in Chat widget immediately!
                  }}
                  onCancel={() => setShowAvatarBuilder(false)}
                />
              </div>
            )}

            {/* Form */}
            <div className="space-y-5">
              <div>
                <Label htmlFor="email" className="stat-label flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  className="input-premium mt-2 opacity-60"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  L'email ne peut pas être modifié
                </p>
              </div>

              <div>
                <Label htmlFor="fullName" className="stat-label flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Nom complet
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Votre nom et prénom"
                  className="input-premium mt-2"
                />
              </div>

              <div>
                <Label htmlFor="companyName" className="stat-label flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Nom du cabinet
                </Label>
                <Input
                  id="companyName"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Nom de votre cabinet"
                  className="input-premium mt-2"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Enregistrer le profil
              </Button>
            </div>
          </div>

          {/* Apparence Card */}
          <div className="bento-card">
            <h3 className="font-semibold text-lg flex items-center gap-2 mb-6">
              <Palette className="w-5 h-5 text-primary" />
              Apparence
            </h3>
            <div className="space-y-6">
              <div>
                <Label className="stat-label mb-3 block">Couleur Principale</Label>
                <div className="flex flex-wrap gap-4">
                  {[
                    { id: 'orange', name: 'Orange', bg: 'bg-[#f97316]' },
                    { id: 'blue', name: 'Bleu', bg: 'bg-[#3b82f6]' },
                    { id: 'green', name: 'Vert', bg: 'bg-[#22c55e]' },
                    { id: 'red', name: 'Rouge', bg: 'bg-[#ef4444]' },
                    { id: 'pink', name: 'Rose', bg: 'bg-[#ec4899]' },
                    { id: 'yellow', name: 'Jaune', bg: 'bg-[#eab308]' },
                  ].map((color) => (
                    <button
                      type="button"
                      key={color.id}
                      onClick={() => setColorTheme(color.id as any)}
                      className={`w-10 h-10 rounded-full ${color.bg} transition-all duration-300 border-[3px] shadow-sm flex items-center justify-center ${colorTheme === color.id ? 'border-foreground scale-110 shadow-md ring-2 ring-primary/20 ring-offset-2 ring-offset-background' : 'border-transparent hover:scale-105'
                        }`}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-border">
                <Label className="stat-label mb-3 block">Mode d'affichage</Label>
                <div className="flex items-center justify-between bg-muted/30 p-4 rounded-2xl border border-border/50">
                  <div>
                    <p className="font-medium text-sm">Thème {theme === 'dark' ? 'Sombre' : 'Clair'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Ajuste l'interface globale</p>
                  </div>
                  <Button
                    variant={theme === 'dark' ? "default" : "secondary"}
                    size="sm"
                    onClick={toggleTheme}
                    className="rounded-xl px-4"
                  >
                    Basculer le thème
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Work Schedule Card */}
          <div className="bento-card">
            <WorkScheduleSettings />
          </div>

          {/* Cabinet Card — visible ONLY for cabinet account type */}
          {accountType === 'cabinet' && currentOrg && (
            <div className="bento-card space-y-4">
              <h2 className="stat-label flex items-center gap-2 text-base">
                <Building2 className="w-5 h-5 text-primary" /> Mon Cabinet
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="stat-label">Nom du cabinet</Label>
                  <p className="font-medium mt-1">{currentOrg.name}</p>
                </div>
                <div>
                  <Label className="stat-label">Votre rôle</Label>
                  <p className="font-medium mt-1 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    {userRole === 'manager' ? 'Gérant' : userRole === 'team_lead' ? 'Chef de Mission' : 'Salarié'}
                  </p>
                </div>
              </div>
              {userRole === 'manager' && (
                <div className="pt-3 border-t border-border/50">
                  <Label className="stat-label mb-2 block">Code d'invitation</Label>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-lg font-bold tracking-[0.2em] text-primary">
                      {currentOrg.invite_code?.toUpperCase()}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(currentOrg.invite_code);
                        toast({ title: 'Copié !' });
                      }}
                      className="rounded-xl gap-1"
                    >
                      <Copy className="w-3 h-3" /> Copier
                    </Button>
                  </div>
                  <Link to="/team" className="text-sm text-primary hover:underline mt-3 inline-block">
                    Gérer l'équipe →
                  </Link>
                </div>
              )}
              {/* Branding Section — Manager only */}
              {userRole === 'manager' && (
                <div className="pt-4 border-t border-border/50 space-y-5">
                  <h3 className="font-bold flex items-center gap-2">
                    <Paintbrush className="w-4 h-4 text-primary" /> Personnaliser l'apparence
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Adaptez les couleurs de l'application à l'image de votre cabinet. Tous les membres verront ces couleurs.
                  </p>

                  {/* Primary Color */}
                  <div>
                    <Label className="stat-label mb-2 block">Couleur d'accent (thème)</Label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {[
                        { hex: '#F97316', name: 'Orange' },
                        { hex: '#3B82F6', name: 'Bleu' },
                        { hex: '#22C55E', name: 'Vert' },
                        { hex: '#EF4444', name: 'Rouge' },
                        { hex: '#EC4899', name: 'Rose' },
                        { hex: '#EAB308', name: 'Jaune' },
                        { hex: '#8B5CF6', name: 'Violet' },
                        { hex: '#06B6D4', name: 'Cyan' },
                        { hex: '#14B8A6', name: 'Teal' },
                        { hex: '#F59E0B', name: 'Ambre' },
                        { hex: '#6366F1', name: 'Indigo' },
                        { hex: '#84CC16', name: 'Lime' },
                      ].map(c => (
                        <button
                          key={c.hex}
                          onClick={() => setBrandPrimary(c.hex)}
                          title={c.name}
                          className={`w-9 h-9 rounded-xl border-2 transition-all hover:scale-110 ${brandPrimary === c.hex ? 'border-foreground scale-110 ring-2 ring-offset-2 ring-offset-background' : 'border-transparent'
                            }`}
                          style={{ backgroundColor: c.hex }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <input
                          type="color"
                          value={brandPrimary || '#F97316'}
                          onChange={e => setBrandPrimary(e.target.value)}
                          className="w-10 h-10 rounded-xl cursor-pointer border-2 border-border"
                        />
                      </div>
                      <Input
                        value={brandPrimary}
                        onChange={e => setBrandPrimary(e.target.value)}
                        placeholder="#F97316"
                        maxLength={7}
                        className="input-premium font-mono uppercase max-w-32"
                      />
                      <span className="text-xs text-muted-foreground">Code hex</span>
                    </div>
                  </div>

                  {/* Background Color */}
                  <div>
                    <Label className="stat-label mb-2 block">Couleur de fond</Label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {[
                        { hex: '#FAFAFA', name: 'Blanc (défaut)' },
                        { hex: '#F8FAFC', name: 'Slate' },
                        { hex: '#FFFBEB', name: 'Crème' },
                        { hex: '#FFF7ED', name: 'Orange pâle' },
                        { hex: '#F0FDF4', name: 'Vert pâle' },
                        { hex: '#EFF6FF', name: 'Bleu pâle' },
                        { hex: '#FDF4FF', name: 'Violet pâle' },
                        { hex: '#FFF1F2', name: 'Rose pâle' },
                      ].map(c => (
                        <button
                          key={c.hex}
                          onClick={() => setBrandBg(c.hex)}
                          title={c.name}
                          className={`w-9 h-9 rounded-xl border-2 transition-all hover:scale-110 ${brandBg === c.hex ? 'border-foreground scale-110 ring-2 ring-offset-2 ring-offset-background' : 'border-border'
                            }`}
                          style={{ backgroundColor: c.hex }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <input
                          type="color"
                          value={brandBg || '#FAFAFA'}
                          onChange={e => setBrandBg(e.target.value)}
                          className="w-10 h-10 rounded-xl cursor-pointer border-2 border-border"
                        />
                      </div>
                      <Input
                        value={brandBg}
                        onChange={e => setBrandBg(e.target.value)}
                        placeholder="#FAFAFA"
                        maxLength={7}
                        className="input-premium font-mono uppercase max-w-32"
                      />
                      <span className="text-xs text-muted-foreground">Code hex</span>
                    </div>
                  </div>

                  {/* Preview + Save */}
                  <div className="flex items-center gap-3 pt-2">
                    <Button
                      onClick={async () => {
                        setSavingBrand(true);
                        try {
                          await updateBranding(brandPrimary || undefined, brandBg || undefined);
                          toast({ title: 'Apparence sauvegardée', description: 'Les couleurs ont été appliquées pour tout le cabinet.' });
                        } catch (err: any) {
                          toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
                        } finally {
                          setSavingBrand(false);
                        }
                      }}
                      disabled={savingBrand}
                      className="rounded-xl gap-2"
                    >
                      {savingBrand ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Sauvegarde...</>
                      ) : (
                        <><Paintbrush className="w-4 h-4" /> Appliquer les couleurs</>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={async () => {
                        setBrandPrimary('');
                        setBrandBg('');
                        await updateBranding('', '');
                        toast({ title: 'Couleurs réinitialisées', description: 'L\'apparence par défaut a été restaurée.' });
                      }}
                      className="rounded-xl gap-2 text-muted-foreground"
                    >
                      <RotateCcw className="w-4 h-4" /> Réinitialiser
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Upgrade Solo → Cabinet (ONLY for solo users) */}
          {accountType === 'solo' && (
            <div className="bento-card space-y-4">
              <h2 className="stat-label flex items-center gap-2 text-base">
                <Sparkles className="w-5 h-5 text-primary" /> Passer en mode Cabinet
              </h2>

              <p className="text-sm text-muted-foreground">
                Vous utilisez APPMATO en mode personnel. Passez en mode Cabinet pour inviter des collaborateurs,
                gérer des équipes et avoir une vue d'ensemble de votre cabinet.
                <strong className="text-foreground"> Vos données existantes seront conservées.</strong>
              </p>

              {/* Two options side by side */}
              {!showUpgradeForm && !showJoinForm && (
                <div className="grid md:grid-cols-2 gap-4 pt-2">
                  <button
                    onClick={() => setShowUpgradeForm(true)}
                    className="bento-card p-5 text-left hover:border-primary/50 hover:shadow-lg transition-all group cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-bold mb-1">Créer un Cabinet</h3>
                    <p className="text-xs text-muted-foreground">Je suis gérant et veux inviter mes collaborateurs.</p>
                  </button>

                  <button
                    onClick={() => setShowJoinForm(true)}
                    className="bento-card p-5 text-left hover:border-primary/50 hover:shadow-lg transition-all group cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                      <Link2 className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-bold mb-1">Rejoindre un Cabinet</h3>
                    <p className="text-xs text-muted-foreground">Mon gérant m'a donné un code d'accès.</p>
                  </button>
                </div>
              )}

              {/* Create cabinet form */}
              {showUpgradeForm && (
                <div className="space-y-4 pt-2 border-t border-border/50">
                  <p className="text-sm text-muted-foreground">
                    Vos dossiers existants seront conservés. Vous deviendrez le gérant du nouveau cabinet.
                  </p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="flex items-center gap-2 mb-2">
                        <Building2 className="w-4 h-4 text-primary" /> Nom du cabinet *
                      </Label>
                      <Input
                        value={upgradeName}
                        onChange={e => setUpgradeName(e.target.value)}
                        placeholder="Ex: Cabinet Amato & Associés"
                        className="input-premium"
                      />
                    </div>
                    <div>
                      <Label className="flex items-center gap-2 mb-2">
                        <Briefcase className="w-4 h-4 text-primary" /> Forme juridique
                      </Label>
                      <select
                        value={upgradeLegalForm}
                        onChange={e => setUpgradeLegalForm(e.target.value)}
                        className="input-premium w-full"
                      >
                        <option value="">Sélectionner...</option>
                        {['SARL', 'SAS', 'SASU', 'SCI', 'EI', 'EURL', 'SA', 'Autre'].map(f => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-primary" /> Nombre de collaborateurs
                    </Label>
                    <div className="flex gap-2">
                      {['1-5', '6-15', '16-50', '50+'].map(size => (
                        <button
                          key={size}
                          onClick={() => setUpgradeTeamSize(size)}
                          className={`px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all ${upgradeTeamSize === size
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border hover:border-primary/50'
                            }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button
                      onClick={async () => {
                        if (!upgradeName.trim()) {
                          toast({ title: 'Erreur', description: 'Le nom du cabinet est obligatoire.', variant: 'destructive' });
                          return;
                        }
                        setUpgrading(true);
                        try {
                          await createOrganization({
                            name: upgradeName,
                            legal_form: upgradeLegalForm || undefined,
                            team_size_range: upgradeTeamSize || undefined,
                          });
                          toast({ title: 'Cabinet créé !', description: `"${upgradeName}" est prêt. Vos données ont été conservées.` });
                          setShowUpgradeForm(false);
                        } catch (err: any) {
                          toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
                        } finally {
                          setUpgrading(false);
                        }
                      }}
                      disabled={upgrading || !upgradeName.trim()}
                      className="rounded-xl gap-2"
                    >
                      {upgrading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Création...</>
                      ) : (
                        <><ArrowRight className="w-4 h-4" /> Créer et passer en mode Cabinet</>
                      )}
                    </Button>
                    <Button variant="ghost" onClick={() => setShowUpgradeForm(false)} className="rounded-xl">
                      Annuler
                    </Button>
                  </div>
                </div>
              )}

              {/* Join cabinet form */}
              {showJoinForm && (
                <div className="space-y-4 pt-2 border-t border-border/50">
                  <p className="text-sm text-muted-foreground">
                    Entrez le code que votre gérant vous a communiqué. Vos dossiers existants seront conservés.
                  </p>
                  <div>
                    <Label className="mb-2 block">Code d'invitation</Label>
                    <Input
                      value={joinCode}
                      onChange={e => setJoinCode(e.target.value.toUpperCase())}
                      placeholder="Ex: A3F8B2C1"
                      maxLength={8}
                      className="input-premium text-center text-2xl font-mono tracking-[0.3em] uppercase max-w-xs"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={async () => {
                        if (!joinCode.trim()) return;
                        setJoining(true);
                        try {
                          const { orgName } = await joinOrganization(joinCode.trim());
                          toast({ title: 'Bienvenue !', description: `Vous avez rejoint "${orgName}". Vos données ont été conservées.` });
                          setShowJoinForm(false);
                        } catch (err: any) {
                          toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
                        } finally {
                          setJoining(false);
                        }
                      }}
                      disabled={joining || joinCode.length < 4}
                      className="rounded-xl gap-2"
                    >
                      {joining ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Vérification...</>
                      ) : (
                        <><ArrowRight className="w-4 h-4" /> Rejoindre</>
                      )}
                    </Button>
                    <Button variant="ghost" onClick={() => setShowJoinForm(false)} className="rounded-xl">
                      Annuler
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
