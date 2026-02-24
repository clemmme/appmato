import { useState } from 'react';
import { Clock, MessageSquare, Plus, Minus, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface TimeRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecord: (missionType: string, comment: string, adjustedDuration: number) => void;
  clientName: string;
  elapsedSeconds: number;
}

const MISSION_TYPES = [
  { value: 'Compta', label: 'Comptabilité' },
  { value: 'Révision', label: 'Révision' },
  { value: 'Juridique', label: 'Juridique' },
  { value: 'Social', label: 'Social' },
  { value: 'Éval', label: 'Évaluation' },
  { value: 'Tableau de bord', label: 'Tableau de bord' },
  { value: 'Prévisionnel', label: 'Prévisionnel' },
  { value: 'Supervision', label: 'Supervision' },
  { value: 'Autre', label: 'Autre' },
];

export function TimeRecordModal({
  isOpen,
  onClose,
  onRecord,
  clientName,
  elapsedSeconds,
}: TimeRecordModalProps) {
  const [missionType, setMissionType] = useState('Compta');
  const [comment, setComment] = useState('');
  const [adjustedSeconds, setAdjustedSeconds] = useState(elapsedSeconds);

  // Format time display
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatHours = (seconds: number) => {
    const hours = seconds / 3600;
    const rounded = Math.round(hours * 4) / 4;
    return `${rounded.toFixed(2)}h`;
  };

  // Adjust time by 15 min increments
  const adjustTime = (delta: number) => {
    const newSeconds = Math.max(60, adjustedSeconds + delta * 60 * 15);
    setAdjustedSeconds(newSeconds);
  };

  const handleRecord = () => {
    onRecord(missionType, comment, adjustedSeconds);
    setComment('');
    setMissionType('Compta');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Enregistrer le temps
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Client Name */}
          <div className="p-4 bg-muted/50 rounded-2xl">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Dossier
            </p>
            <p className="font-bold text-lg">{clientName}</p>
          </div>

          {/* Time Display with Adjustments */}
          <div>
            <Label className="stat-label mb-2">Durée enregistrée</Label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => adjustTime(-1)}
                className="rounded-xl"
              >
                <Minus className="w-4 h-4" />
              </Button>

              <div className="flex-1 text-center">
                <p className={cn(
                  "font-mono text-3xl font-bold",
                  adjustedSeconds !== elapsedSeconds && "text-primary"
                )}>
                  {formatTime(adjustedSeconds)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  ≈ {formatHours(adjustedSeconds)} (arrondi au 1/4h)
                </p>
                {adjustedSeconds !== elapsedSeconds && (
                  <p className="text-xs text-primary mt-1">
                    Temps original: {formatTime(elapsedSeconds)}
                  </p>
                )}
              </div>

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => adjustTime(1)}
                className="rounded-xl"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Ajuster par tranches de 15 min si vous avez oublié de lancer le chrono
            </p>
          </div>

          {/* Mission Type */}
          <div>
            <Label className="stat-label mb-2">Type de mission</Label>
            <Select value={missionType} onValueChange={setMissionType}>
              <SelectTrigger className="input-premium">
                <SelectValue placeholder="Sélectionner une mission" />
              </SelectTrigger>
              <SelectContent>
                {MISSION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Comment */}
          <div>
            <Label className="stat-label mb-2 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Commentaire (optionnel)
            </Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Décrivez brièvement le travail effectué..."
              className="input-premium min-h-[80px] resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            <X className="w-4 h-4 mr-2" />
            Annuler
          </Button>
          <Button onClick={handleRecord} className="btn-primary">
            <Save className="w-4 h-4 mr-2" />
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
