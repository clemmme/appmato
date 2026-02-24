/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { X, Briefcase, CalendarDays, Eye, FileCheck, Clock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Client } from '@/lib/database.types';
import { cn } from '@/lib/utils';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/hooks/useAuth';

const MISSION_TYPES = ['Compta', 'Révision', 'Juridique', 'Social', 'Éval', 'Tableau de bord', 'Prévisionnel', 'Supervision'];

const EVENT_CATEGORIES = [
  { id: 'work', label: 'Travail de fond', icon: Briefcase, color: 'bg-rose-100 text-rose-600 border-rose-300' },
  { id: 'meeting', label: 'Rendez-vous Client', icon: CalendarDays, color: 'bg-violet-100 text-violet-600 border-violet-300' },
  { id: 'supervision', label: 'Supervision', icon: Eye, color: 'bg-primary/10 text-primary border-primary/30' },
  { id: 'revision', label: 'Révision', icon: FileCheck, color: 'bg-emerald-100 text-emerald-600 border-emerald-300' },
];

interface CalendarEvent {
  id?: string;
  entry_date: string;
  start_time?: string;
  end_time?: string;
  duration_hours: number;
  entry_type: 'client' | 'internal' | 'absence';
  event_category?: 'work' | 'meeting' | 'supervision' | 'revision';
  mission_type?: string | null;
  internal_type?: string | null;
  absence_type?: string | null;
  client_id?: string | null;
  comment?: string;
  guest_id?: string | null;
  guest_status?: 'pending' | 'accepted' | 'declined' | null;
  user_id?: string;
}

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  selectedHour?: number;
  clients: Client[];
  event?: CalendarEvent | null;
  onSave: (event: Omit<CalendarEvent, 'id'>) => void;
  onDelete?: (id: string) => void;
}

export function EventModal({
  isOpen,
  onClose,
  selectedDate,
  selectedHour = 9,
  clients,
  event,
  onSave,
  onDelete
}: EventModalProps) {
  const { user } = useAuth();
  const { members } = useOrganization();
  const [clientId, setClientId] = useState('');
  const [eventCategory, setEventCategory] = useState<'work' | 'meeting' | 'supervision' | 'revision'>('work');
  const [missionType, setMissionType] = useState('');
  const [guestId, setGuestId] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [duration, setDuration] = useState('1');
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (event) {
        setClientId(event.client_id || '');
        setEventCategory(event.event_category || 'work');
        setMissionType(event.mission_type || '');
        setGuestId(event.guest_id || '');
        setStartTime(event.start_time || '09:00');
        setDuration(String(event.duration_hours || 1));
        setComment(event.comment || '');
      } else {
        setClientId('');
        setEventCategory('work');
        setMissionType('');
        setGuestId('');
        setStartTime(`${String(selectedHour).padStart(2, '0')}:00`);
        setDuration('1');
        setComment('');
      }
    }
  }, [isOpen, event, selectedHour]);

  const handleSubmit = () => {
    if (!clientId) return;

    const durationNum = parseFloat(duration) || 1;

    onSave({
      entry_date: format(selectedDate, 'yyyy-MM-dd'),
      start_time: startTime,
      duration_hours: durationNum,
      entry_type: 'client',
      event_category: eventCategory,
      mission_type: missionType || null,
      client_id: clientId || null,
      comment: comment.trim(),
      ...(guestId ? {
        guest_id: guestId,
        guest_status: event?.guest_status || 'pending'
      } : {
        guest_id: null,
        guest_status: null
      })
    });

    onClose();
  };

  const handleGuestResponse = (status: 'accepted' | 'declined') => {
    if (!event) return;
    onSave({
      ...event,
      guest_status: status
    });
    onClose();
  };

  const handleDelete = () => {
    if (event?.id && onDelete) {
      onDelete(event.id);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card/95 backdrop-blur-xl rounded-3xl w-full max-w-lg shadow-2xl animate-scale-in border border-border/50">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-border/30">
          <div>
            <h2 className="text-xl font-bold">{event ? 'Modifier l\'événement' : 'Nouvel Événement'}</h2>
            <p className="text-sm text-muted-foreground">
              {format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Event Type Selection */}
          <div>
            <Label className="stat-label mb-3 block">Type d'événement</Label>
            <div className="grid grid-cols-2 gap-2">
              {EVENT_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setEventCategory(cat.id as any)}
                  className={cn(
                    "flex items-center gap-2 p-3 rounded-xl border-2 transition-all",
                    eventCategory === cat.id
                      ? cn(cat.color, "border-current")
                      : "border-border/50 hover:border-border"
                  )}
                >
                  <cat.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Client Selection */}
          <div>
            <Label className="stat-label">Dossier Concerné *</Label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="input-premium mt-2"
            >
              <option value="">Sélectionner un dossier</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.ref})</option>
              ))}
            </select>
          </div>

          {/* Mission Type & Guest */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="stat-label">Mission</Label>
              <select
                value={missionType}
                onChange={(e) => setMissionType(e.target.value)}
                className="input-premium mt-2"
              >
                <option value="">Sélectionner une mission</option>
                {MISSION_TYPES.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <Label className="stat-label">Inviter un collègue</Label>
              {event?.guest_status && event.guest_id && event.guest_id !== '' && event.id ? (
                <div className="mt-2 p-2 rounded-xl bg-card border flex items-center justify-between text-sm">
                  <span>{members.find(m => m.user_id === event.guest_id)?.profile?.full_name || 'Collaborateur'}</span>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full",
                    event.guest_status === 'accepted' ? "bg-success/10 text-success" :
                      event.guest_status === 'declined' ? "bg-destructive/10 text-destructive" :
                        "bg-warning/10 text-warning"
                  )}>
                    {event.guest_status === 'accepted' ? 'Accepté' : event.guest_status === 'declined' ? 'Refusé' : 'En attente'}
                  </span>
                </div>
              ) : (
                <select
                  value={guestId}
                  onChange={(e) => setGuestId(e.target.value)}
                  className="input-premium mt-2 w-full"
                >
                  <option value="">Aucun invité...</option>
                  {members.map(member => (
                    <option key={member.user_id} value={member.user_id}>
                      {member.profile?.full_name || member.profile?.email.split('@')[0]}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="stat-label flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Heure de début
              </Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="input-premium mt-2"
              />
            </div>
            <div>
              <Label className="stat-label">Durée (heures)</Label>
              <Input
                type="number"
                step="0.5"
                min="0.5"
                max="12"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="input-premium mt-2"
              />
            </div>
          </div>

          {/* Comment */}
          <div>
            <Label className="stat-label">Notes (optionnel)</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Détails sur cet événement..."
              className="input-premium mt-2 min-h-[80px]"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-border/30 flex justify-between">
          {event?.id && onDelete && (!event.guest_id || event.user_id === user?.id) ? (
            <Button variant="destructive" onClick={handleDelete} className="gap-2">
              <Trash2 className="w-4 h-4" />
              Supprimer
            </Button>
          ) : (
            <div />
          )}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            {event?.guest_id === user?.id && event.guest_status === 'pending' ? (
              <>
                <Button variant="destructive" onClick={() => handleGuestResponse('declined')}>Refuser</Button>
                <Button className="bg-success hover:bg-success/90" onClick={() => handleGuestResponse('accepted')}>Accepter</Button>
              </>
            ) : (
              <Button onClick={handleSubmit} disabled={!clientId} className="gap-2">
                <CalendarDays className="w-4 h-4" />
                {event ? 'Modifier' : 'Créer'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
