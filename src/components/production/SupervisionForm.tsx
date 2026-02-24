/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from 'react';
import { Eye, Calendar, AlertTriangle, MessageSquare, User, CheckCircle2, Wallet, Flag, FileQuestion, Truck, Lock, Save, CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Client, BilanCycle } from '@/lib/database.types';
import { CYCLES } from '@/lib/database.types';
import { useOrganization } from '@/contexts/OrganizationContext';
import { CommentWithMentions } from '@/components/chat/CommentWithMentions';
import { chatService } from '@/services/chatService';
import { useToast } from '@/hooks/use-toast';

// Critical point types - expanded
const CRITICAL_TYPES = [
  { id: 'caisse', label: 'Caisse', icon: Wallet },
  { id: 'impots', label: 'Impôts', icon: Flag },
  { id: 'pieces', label: 'Pièces manquantes', icon: FileQuestion },
  { id: 'fournisseurs', label: 'Fournisseurs', icon: Truck },
  { id: 'blocages', label: 'Blocages', icon: Lock },
];

// QCM Diagnostic checklist
const QCM_ITEMS = [
  { id: 'lettrage', label: 'Lettrage effectué' },
  { id: 'cadrage_tva', label: 'Cadrage TVA OK' },
  { id: 'justificatifs', label: 'Justificatifs reçus' },
  { id: 'banque_rapproche', label: 'Rapprochement bancaire fait' },
  { id: 'immobilisations', label: 'Immobilisations à jour' },
  { id: 'provisions', label: 'Provisions revues' },
  { id: 'stocks', label: 'Stocks valorisés' },
  { id: 'charges_constatees', label: 'CCA/PCA passées' },
  { id: 'salaires', label: 'Salaires conformes' },
  { id: 'is_calcule', label: 'IS calculé' },
];

interface SupervisionFormProps {
  client: Client;
  bilanCycles: BilanCycle[];
  onClose: () => void;
  onSave: (data: SupervisionData) => void;
  onCreateCalendarEvent: (clientId: string, date: string, clientName: string, guestId?: string) => void;
  initialData?: Partial<SupervisionData>;
}

export interface SupervisionData {
  supervisorName: string;
  supervisorId?: string;
  comments: string;
  criticalPoints: string[];
  qcmChecks: string[];
  rdvChefDate: string | null;
}

export function SupervisionForm({
  client,
  bilanCycles,
  onClose,
  onSave,
  onCreateCalendarEvent,
  initialData
}: SupervisionFormProps) {
  const { currentOrg, members } = useOrganization();
  const { toast } = useToast();
  const [supervisorId, setSupervisorId] = useState(initialData?.supervisorId || '');
  const [comments, setComments] = useState(initialData?.comments || '');
  const [criticalPoints, setCriticalPoints] = useState<string[]>(initialData?.criticalPoints || []);
  const [qcmChecks, setQcmChecks] = useState<string[]>(initialData?.qcmChecks || []);
  const [rdvChefDate, setRdvChefDate] = useState<string>(initialData?.rdvChefDate || '');
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);

  // Get all notes from cycles
  const notesFromCycles = useMemo(() => {
    return bilanCycles
      .filter(c => (c as any).notes && (c as any).notes.trim() !== '')
      .map(c => ({
        cycleName: CYCLES.find(cy => cy.id === c.cycle_id)?.label || c.cycle_id,
        notes: (c as any).notes
      }));
  }, [bilanCycles]);

  const toggleCriticalPoint = (id: string) => {
    setCriticalPoints(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const toggleQcm = (id: string) => {
    setQcmChecks(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const qcmProgress = Math.round((qcmChecks.length / QCM_ITEMS.length) * 100);

  const handleSave = async () => {
    const selectedMember = members.find(m => m.user_id === supervisorId);

    // Process mentions
    if (currentOrg && mentionedUserIds.length > 0) {
      let sentCount = 0;
      for (const userId of mentionedUserIds) {
        try {
          await chatService.sendSystemMessageToUser(
            currentOrg.id,
            userId,
            `Vous avez été mentionné dans le dossier **${client.name}** (Supervision).\n\n"${comments}"`
          );
          sentCount++;
        } catch (err) {
          console.error("Failed to notify user", userId, err);
        }
      }
      if (sentCount > 0) {
        toast({
          title: "Notifications envoyées",
          description: `${sentCount} collaborateur(s) ont été notifiés via le chat.`,
        });
      }
    }

    onSave({
      supervisorId,
      supervisorName: selectedMember?.profile?.full_name || selectedMember?.profile?.email.split('@')[0] || '',
      comments,
      criticalPoints,
      qcmChecks,
      rdvChefDate: rdvChefDate || null,
    });
  };

  const handleCreateEvent = () => {
    if (rdvChefDate) {
      onCreateCalendarEvent(client.id, rdvChefDate, client.name, supervisorId);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="bento-card mb-8 bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5 border-primary/20">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Eye className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-bold text-primary uppercase tracking-wider">Mode Supervision</span>
            </div>
            <h2 className="text-2xl font-bold">{client.name}</h2>
            <p className="text-sm text-muted-foreground mt-1">{client.ref} - {client.form}</p>
          </div>
          <Button
            variant="outline"
            onClick={onClose}
            className="rounded-xl"
          >
            Retour Révision
          </Button>
        </div>

        {/* Supervisor Name & RDV Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="p-4 bg-card/50 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-5 h-5 text-primary" />
              <Label className="font-medium">Chef Superviseur *</Label>
            </div>
            <select
              value={supervisorId}
              onChange={(e) => setSupervisorId(e.target.value)}
              className="input-premium w-full"
            >
              <option value="">Sélectionner un superviseur...</option>
              {members.map(member => (
                <option key={member.user_id} value={member.user_id}>
                  {member.profile?.full_name || member.profile?.email.split('@')[0]} ({member.role === 'manager' ? 'Gérant' : member.role === 'team_lead' ? 'Chef de mission' : 'Collaborateur'})
                </option>
              ))}
            </select>
          </div>

          <div className="p-4 bg-card/50 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-primary" />
              <Label className="font-medium">Date de RDV avec le Chef</Label>
            </div>
            <div className="flex gap-2">
              <Input
                type="date"
                value={rdvChefDate}
                onChange={(e) => setRdvChefDate(e.target.value)}
                className="input-premium flex-1"
              />
              {rdvChefDate && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCreateEvent}
                  className="gap-2 rounded-xl"
                  title="Créer dans le calendrier"
                >
                  <CalendarPlus className="w-4 h-4" />
                </Button>
              )}
            </div>
            {rdvChefDate && (
              <p className="text-sm font-medium text-primary mt-2">
                {format(new Date(rdvChefDate), 'EEEE d MMMM yyyy', { locale: fr })}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Critical Points */}
      <div className="bento-card mb-6">
        <h3 className="font-bold text-lg flex items-center gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          Points Critiques à Vérifier
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {CRITICAL_TYPES.map(type => {
            const Icon = type.icon;
            const isActive = criticalPoints.includes(type.id);

            return (
              <button
                key={type.id}
                onClick={() => toggleCriticalPoint(type.id)}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2",
                  isActive
                    ? "bg-destructive/10 border-destructive/30 text-destructive"
                    : "bg-muted/50 border-border hover:bg-muted"
                )}
              >
                <Icon className="w-6 h-6" />
                <span className="font-medium text-sm">{type.label}</span>
                {isActive && <CheckCircle2 className="w-4 h-4" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* QCM Diagnostic */}
      <div className="bento-card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-success" />
            QCM de Diagnostic
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{qcmChecks.length}/{QCM_ITEMS.length}</span>
            <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all",
                  qcmProgress === 100 ? "bg-success" : "bg-primary"
                )}
                style={{ width: `${qcmProgress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {QCM_ITEMS.map(item => {
            const isChecked = qcmChecks.includes(item.id);
            return (
              <label
                key={item.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                  isChecked
                    ? "bg-success/10 border-success/30"
                    : "bg-muted/30 border-border hover:bg-muted/50"
                )}
              >
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={() => toggleQcm(item.id)}
                  className="data-[state=checked]:bg-success data-[state=checked]:border-success"
                />
                <span className={cn("font-medium", isChecked && "text-success")}>
                  {item.label}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Notes Summary */}
      <div className="bento-card mb-6">
        <h3 className="font-bold text-lg flex items-center gap-3 mb-4">
          <MessageSquare className="w-5 h-5 text-primary" />
          Récapitulatif des Notes de Révision
        </h3>

        {notesFromCycles.length === 0 ? (
          <p className="text-muted-foreground text-center py-6">
            Aucune note de révision pour ce dossier.
          </p>
        ) : (
          <div className="space-y-3">
            {notesFromCycles.map((item, idx) => (
              <div key={idx} className="p-4 bg-muted/50 rounded-xl">
                <p className="text-sm font-bold text-primary mb-2">{item.cycleName}</p>
                <p className="text-sm whitespace-pre-wrap">{item.notes}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Comments */}
      <div className="bento-card mb-6">
        <h3 className="font-bold text-lg flex items-center gap-3 mb-4">
          <MessageSquare className="w-5 h-5 text-muted-foreground" />
          Commentaires pour le Chef
        </h3>
        <CommentWithMentions
          value={comments}
          onChange={setComments}
          placeholder="Notes additionnelles, remarques, points d'attention... (@ pour taguer un collègue)"
          className="input-premium min-h-[120px]"
          onMentionDetected={(userIds) => {
            // We can optionally store these IDs in state if we want to explicitly track who was mentioned,
            // or handle it upstream during onSave.
            console.log("Mentioned in supervision:", userIds);
          }}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <Button variant="outline" onClick={onClose} className="flex-1 rounded-2xl">
          Annuler
        </Button>
        <Button onClick={handleSave} className="btn-primary flex-1 gap-2">
          <Save className="w-4 h-4" />
          Valider la Supervision
        </Button>
      </div>
    </div>
  );
}
