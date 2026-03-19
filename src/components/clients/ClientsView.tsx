/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useCallback } from 'react';
import { Plus, X, Search, Users, Upload, Mail, Phone, MapPin, Download, Filter } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/hooks/useAuth';
import type { Client, RegimeType, BilanCycle, TVAHistory } from '@/lib/database.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTimer } from '@/contexts/TimerContext';
import { ClientDetailSheet } from './ClientDetailSheet';
import { ClientCard } from './ClientCard';
import { cn } from '@/lib/utils';

interface TimeEntryData {
  client_id: string;
  duration_hours: number;
  mission_type?: string;
  entry_date?: string;
}

interface ClientsViewProps {
  clients: Client[];
  onAdd: (client: Omit<Client, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => void;
  onUpdate: (id: string, client: Partial<Client>) => void;
  onDelete: (id: string) => void;
  onAssign?: (clientId: string, userId: string) => void;
  onOpenImport?: () => void;
  bilanCycles?: BilanCycle[];
  tvaHistories?: TVAHistory[];
  timeEntries?: TimeEntryData[];
}

interface FormData {
  ref: string;
  name: string;
  form: string;
  regime: RegimeType;
  day: string;
  siren?: string;
  code_ape?: string;
  closing_date?: string;
  annual_fee?: number;
  // CRM fields
  manager_email?: string;
  phone?: string;
  address?: string;
  // Billing
  fee_compta?: number;
  fee_social?: number;
  fee_juridique?: number;
  // Volume
  invoices_per_month?: number;
  entries_count?: number;
  establishments_count?: number;
}

const emptyForm: FormData = {
  ref: '',
  name: '',
  form: '',
  regime: 'M',
  day: '15',
  siren: '',
  code_ape: '',
  closing_date: '12-31',
  annual_fee: 0,
  manager_email: '',
  phone: '',
  address: '',
  fee_compta: 0,
  fee_social: 0,
  fee_juridique: 0,
  invoices_per_month: 0,
  entries_count: 0,
  establishments_count: 1,
};

export function ClientsView({
  clients,
  onAdd,
  onUpdate,
  onDelete,
  onAssign,
  onOpenImport,
  bilanCycles = [],
  tvaHistories = [],
  timeEntries = [],
}: ClientsViewProps) {
  const { user } = useAuth();
  const { userRole, members } = useOrganization();
  const { timerState, startTimer } = useTimer();
  const { isFavorite, toggleFavorite, sortWithFavorites } = useFavorites();
  const [search, setSearch] = useState('');
  const [filterRegime, setFilterRegime] = useState<string>('all');
  const [filterApe, setFilterApe] = useState('');
  const [filterScope, setFilterScope] = useState<'my' | 'all'>('my');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assignModalClient, setAssignModalClient] = useState<Client | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [selectedClientForDetail, setSelectedClientForDetail] = useState<Client | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [activeTab, setActiveTab] = useState('general');

  const filteredClients = useMemo(() => {
    return sortWithFavorites(
      clients.filter(c => {
        // Filtrage par périmètre de scope
        if (filterScope === 'my' && c.user_id !== user?.id) return false;

        const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.ref.toLowerCase().includes(search.toLowerCase());
        const matchRegime = filterRegime === 'all' || c.regime === filterRegime;
        const matchApe = !filterApe || (c.code_ape && c.code_ape.toLowerCase().includes(filterApe.toLowerCase()));
        return matchSearch && matchRegime && matchApe;
      })
    );
  }, [clients, filterScope, user?.id, search, filterRegime, filterApe, sortWithFavorites]);

  const handleExportCSV = () => {
    if (filteredClients.length === 0) return;
    const headers = ['Référence', 'Nom', 'Forme', 'Régime TVA', 'SIREN', 'Code APE', 'Email', 'Téléphone', 'Clôture'];
    const rows = filteredClients.map(c => [
      `"${c.ref}"`, `"${c.name}"`, `"${c.form || ''}"`, `"${getRegimeLabel(c.regime)}"`, `"${c.siren || ''}"`, `"${c.code_ape || ''}"`, `"${c.manager_email || ''}"`, `"${c.phone || ''}"`, `"${c.closing_date || ''}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF"
      + [headers.join(';'), ...rows.map(e => e.join(';'))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `export_clients_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openModal = (client?: Client) => {
    if (client) {
      setEditId(client.id);
      setFormData({
        ref: client.ref,
        name: client.name,
        form: client.form,
        regime: client.regime,
        day: client.day,
        siren: client.siren || '',
        code_ape: client.code_ape || '',
        closing_date: client.closing_date || '12-31',
        annual_fee: client.annual_fee || 0,
        manager_email: client.manager_email || '',
        phone: client.phone || '',
        address: client.address || '',
        fee_compta: client.fee_compta || 0,
        fee_social: client.fee_social || 0,
        fee_juridique: client.fee_juridique || 0,
        invoices_per_month: client.invoices_per_month || 0,
        entries_count: client.entries_count || 0,
        establishments_count: client.establishments_count || 1,
      });
    } else {
      setEditId(null);
      setFormData(emptyForm);
    }
    setActiveTab('general');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditId(null);
  };

  const handleSave = () => {
    if (!formData.ref || !formData.name) return;

    if (editId) {
      onUpdate(editId, formData);
    } else {
      onAdd(formData as any);
    }
    closeModal();
  };

  const handleDelete = (id: string) => {
    if (confirm('Supprimer ce client ? Toutes les données associées seront perdues.')) {
      onDelete(id);
    }
  };

  const getRegimeLabel = useCallback((regime: RegimeType) => {
    switch (regime) {
      case 'M': return 'Mensuel';
      case 'T': return 'Trimestriel';
      case 'A': return 'Annuel';
      case 'N': return 'Non assujetti';
    }
  }, []);

  const getTotalFee = useCallback((client: Client) => {
    return (client.fee_compta || 0) + (client.fee_social || 0) + (client.fee_juridique || 0) + (client.annual_fee || 0);
  }, []);

  return (
    <div className="p-6 lg:p-8 h-full overflow-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dossiers</h1>
          <p className="text-muted-foreground mt-1">Vue synthèse 360° de votre portefeuille</p>
        </div>
        <div className="flex gap-3">
          {onOpenImport && (
            <Button onClick={onOpenImport} variant="outline" className="gap-2 rounded-2xl">
              <Upload className="w-5 h-5" />
              Importer
            </Button>
          )}
          <Button onClick={() => openModal()} className="btn-primary gap-2">
            <Plus className="w-5 h-5" />
            Nouveau Client
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="mb-6 flex flex-col md:flex-row gap-3 items-end">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un client..."
            className="input-premium pl-12"
          />
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="flex bg-muted/50 p-1 rounded-xl">
            <button
              onClick={() => setFilterScope('my')}
              className={cn("px-4 py-1.5 rounded-lg text-sm font-medium transition-colors", filterScope === 'my' ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              Mes Dossiers
            </button>
            <button
              onClick={() => setFilterScope('all')}
              className={cn("px-4 py-1.5 rounded-lg text-sm font-medium transition-colors", filterScope === 'all' ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              Tous les Dossiers
            </button>
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <select
              value={filterRegime}
              onChange={(e) => setFilterRegime(e.target.value)}
              className="h-10 pl-9 pr-8 text-sm bg-background border border-input rounded-xl focus:ring-2 focus:ring-primary focus:outline-none appearance-none"
            >
              <option value="all">Tous Régimes</option>
              <option value="M">Mensuel</option>
              <option value="T">Trimestriel</option>
              <option value="A">Annuel</option>
              <option value="N">Non assujetti</option>
            </select>
          </div>

          <Input
            type="text"
            value={filterApe}
            onChange={(e) => setFilterApe(e.target.value)}
            placeholder="Code APE"
            className="w-28 input-premium"
          />

          <Button onClick={handleExportCSV} variant="outline" className="gap-2 rounded-xl" disabled={filteredClients.length === 0}>
            <Download className="w-4 h-4" />
            Exporter CSV
          </Button>
        </div>
      </div>

      {/* Grid */}
      {filteredClients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Users className="w-20 h-20 mb-4 opacity-30" />
          <p className="text-lg font-medium">
            {search ? 'Aucun résultat' : 'Aucun client'}
          </p>
          <p className="text-sm mt-1">
            {search ? 'Essayez une autre recherche' : 'Commencez par ajouter un client'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map(client => (
            <ClientCard
              key={client.id}
              client={client}
              isFavorite={isFavorite(client.id)}
              onToggleFavorite={() => toggleFavorite(client.id)}
              onSelectDetail={() => setSelectedClientForDetail(client)}
              onAssign={onAssign && (userRole === 'manager' || userRole === 'team_lead') ? () => setAssignModalClient(client) : undefined}
              onEdit={() => openModal(client)}
              onDelete={() => handleDelete(client.id)}
              timerState={timerState}
              startTimer={startTimer}
              getRegimeLabel={getRegimeLabel}
              getTotalFee={getTotalFee}
              userRole={userRole}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl w-full max-w-2xl p-8 shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-b border-border pb-6">
              <h2 className="text-2xl font-bold">
                {editId ? 'Modifier' : 'Nouveau'} Client
              </h2>
              <button onClick={closeModal} className="p-2 rounded-xl hover:bg-muted text-muted-foreground">
                <X className="w-6 h-6" />
              </button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-4 mb-6">
                <TabsTrigger value="general">Général</TabsTrigger>
                <TabsTrigger value="contact">Contact</TabsTrigger>
                <TabsTrigger value="billing">Facturation</TabsTrigger>
                <TabsTrigger value="volume">Volumétrie</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="stat-label">Référence *</Label>
                    <Input
                      type="text"
                      value={formData.ref}
                      onChange={(e) => setFormData({ ...formData, ref: e.target.value })}
                      placeholder="Ex: CLI001"
                      className="input-premium mt-2"
                    />
                  </div>
                  <div>
                    <Label className="stat-label">Forme Juridique</Label>
                    <Input
                      type="text"
                      value={formData.form}
                      onChange={(e) => setFormData({ ...formData, form: e.target.value })}
                      placeholder="SAS, SARL..."
                      className="input-premium mt-2"
                    />
                  </div>
                </div>

                <div>
                  <Label className="stat-label">Raison Sociale *</Label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nom du client"
                    className="input-premium mt-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="stat-label">SIREN</Label>
                    <Input
                      type="text"
                      value={formData.siren || ''}
                      onChange={(e) => setFormData({ ...formData, siren: e.target.value })}
                      placeholder="123 456 789"
                      className="input-premium mt-2"
                    />
                  </div>
                  <div>
                    <Label className="stat-label">Code APE</Label>
                    <Input
                      type="text"
                      value={formData.code_ape || ''}
                      onChange={(e) => setFormData({ ...formData, code_ape: e.target.value })}
                      placeholder="6920Z"
                      className="input-premium mt-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="stat-label">Régime TVA</Label>
                    <select
                      value={formData.regime}
                      onChange={(e) => setFormData({ ...formData, regime: e.target.value as RegimeType })}
                      className="input-premium mt-2"
                    >
                      <option value="M">Mensuel</option>
                      <option value="T">Trimestriel</option>
                      <option value="A">Annuel</option>
                      <option value="N">Non assujetti</option>
                    </select>
                  </div>
                  <div>
                    <Label className="stat-label">Jour échéance</Label>
                    <Input
                      type="text"
                      value={formData.day}
                      onChange={(e) => setFormData({ ...formData, day: e.target.value })}
                      placeholder="15"
                      className="input-premium mt-2"
                      disabled={formData.regime === 'N'}
                    />
                  </div>
                  <div>
                    <Label className="stat-label">Date clôture</Label>
                    <Input
                      type="text"
                      value={formData.closing_date || ''}
                      onChange={(e) => setFormData({ ...formData, closing_date: e.target.value })}
                      placeholder="12-31"
                      className="input-premium mt-2"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="contact" className="space-y-4">
                <div>
                  <Label className="stat-label">Email gérant</Label>
                  <div className="relative mt-2">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type="email"
                      value={formData.manager_email || ''}
                      onChange={(e) => setFormData({ ...formData, manager_email: e.target.value })}
                      placeholder="gerant@entreprise.com"
                      className="input-premium pl-12"
                    />
                  </div>
                </div>
                <div>
                  <Label className="stat-label">Téléphone</Label>
                  <div className="relative mt-2">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type="tel"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="01 23 45 67 89"
                      className="input-premium pl-12"
                    />
                  </div>
                </div>
                <div>
                  <Label className="stat-label">Adresse</Label>
                  <div className="relative mt-2">
                    <MapPin className="absolute left-4 top-3 w-5 h-5 text-muted-foreground" />
                    <textarea
                      value={formData.address || ''}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Adresse complète du client"
                      className="input-premium pl-12 min-h-[80px] resize-none"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="billing" className="space-y-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Renseignez les forfaits annuels HT par type de mission.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="stat-label">Forfait Comptabilité (€/an)</Label>
                    <Input
                      type="number"
                      value={formData.fee_compta || 0}
                      onChange={(e) => setFormData({ ...formData, fee_compta: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                      className="input-premium mt-2"
                    />
                  </div>
                  <div>
                    <Label className="stat-label">Forfait Social (€/an)</Label>
                    <Input
                      type="number"
                      value={formData.fee_social || 0}
                      onChange={(e) => setFormData({ ...formData, fee_social: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                      className="input-premium mt-2"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="stat-label">Forfait Juridique (€/an)</Label>
                    <Input
                      type="number"
                      value={formData.fee_juridique || 0}
                      onChange={(e) => setFormData({ ...formData, fee_juridique: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                      className="input-premium mt-2"
                    />
                  </div>
                  <div>
                    <Label className="stat-label">Autres forfaits (€/an)</Label>
                    <Input
                      type="number"
                      value={formData.annual_fee || 0}
                      onChange={(e) => setFormData({ ...formData, annual_fee: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                      className="input-premium mt-2"
                    />
                  </div>
                </div>
                <div className="p-4 bg-muted/50 rounded-xl mt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total forfait annuel</span>
                    <span className="text-2xl font-bold text-primary">
                      {((formData.fee_compta || 0) + (formData.fee_social || 0) + (formData.fee_juridique || 0) + (formData.annual_fee || 0)).toLocaleString('fr-FR')}€
                    </span>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="volume" className="space-y-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Indicateurs de volumétrie pour évaluer la charge de travail.
                </p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="stat-label">Factures / mois</Label>
                    <Input
                      type="number"
                      value={formData.invoices_per_month || 0}
                      onChange={(e) => setFormData({ ...formData, invoices_per_month: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                      className="input-premium mt-2"
                    />
                  </div>
                  <div>
                    <Label className="stat-label">Nb d'écritures</Label>
                    <Input
                      type="number"
                      value={formData.entries_count || 0}
                      onChange={(e) => setFormData({ ...formData, entries_count: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                      className="input-premium mt-2"
                    />
                  </div>
                  <div>
                    <Label className="stat-label">Établissements</Label>
                    <Input
                      type="number"
                      value={formData.establishments_count || 1}
                      onChange={(e) => setFormData({ ...formData, establishments_count: parseInt(e.target.value) || 1 })}
                      placeholder="1"
                      className="input-premium mt-2"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex gap-4 pt-6 mt-6 border-t border-border">
              <Button variant="outline" onClick={closeModal} className="flex-1 rounded-2xl">
                Annuler
              </Button>
              <Button onClick={handleSave} className="btn-primary flex-1">
                {editId ? 'Enregistrer' : 'Créer'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Client Detail Sheet (360° view) */}
      <ClientDetailSheet
        client={selectedClientForDetail}
        open={!!selectedClientForDetail}
        onClose={() => setSelectedClientForDetail(null)}
        bilanCycles={bilanCycles}
        tvaHistories={tvaHistories}
        timeEntries={timeEntries}
      />

      {/* Assign Modal */}
      {assignModalClient && onAssign && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-scale-in">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Assigner responsable</h3>
              <button onClick={() => setAssignModalClient(null)} className="p-2 rounded-xl hover:bg-muted text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Sélectionnez le collaborateur en charge du dossier <strong>{assignModalClient.name}</strong>.
            </p>

            <div className="space-y-2 mb-6 max-h-60 overflow-y-auto pr-2">
              {members.map(member => (
                <button
                  key={member.user_id}
                  onClick={() => {
                    onAssign(assignModalClient.id, member.user_id);
                    setAssignModalClient(null);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-xl border transition-colors text-left",
                    assignModalClient.user_id === member.user_id
                      ? "border-primary bg-primary/10"
                      : "border-border/50 hover:bg-muted/50"
                  )}
                >
                  <div>
                    <div className="font-semibold text-sm">
                      {member.profile?.full_name || member.profile?.email.split('@')[0]}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {member.role === 'manager' ? 'Gérant' : member.role === 'team_lead' ? 'Chef de mission' : 'Collaborateur'}
                    </div>
                  </div>
                  {assignModalClient.user_id === member.user_id && (
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </button>
              ))}
            </div>

            <Button variant="outline" className="w-full rounded-2xl" onClick={() => setAssignModalClient(null)}>
              Annuler
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
