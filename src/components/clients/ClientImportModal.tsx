/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef } from 'react';
import { parseExcelFile, downloadImportTemplate } from '@/lib/excelExport';
import { X, FileSpreadsheet, AlertCircle, Check, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ImportedClient {
  ref: string;
  form: string;
  name: string;
  siren: string;
  code_ape: string;
  closing_date: string;
  regime: 'M' | 'T' | 'A' | 'N';
  day: string;
  // CRM fields
  manager_email?: string;
  phone?: string;
  address?: string;
  // Billing
  fee_compta?: number;
  fee_social?: number;
  fee_juridique?: number;
  annual_fee?: number;
  // Volume
  invoices_per_month?: number;
  entries_count?: number;
  establishments_count?: number;
}

interface ClientImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (clients: ImportedClient[]) => void;
}

export function ClientImportModal({ isOpen, onClose, onImport }: ClientImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<ImportedClient[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setData([]);
    setErrors([]);
    setStep('upload');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const parseRegime = (value: string): 'M' | 'T' | 'A' | 'N' => {
    const v = (value || '').toUpperCase().trim();
    if (v === 'M' || v === 'MENSUEL') return 'M';
    if (v === 'T' || v === 'TRIMESTRIEL') return 'T';
    if (v === 'A' || v === 'ANNUEL') return 'A';
    if (v === 'N' || v === 'NON ASSUJETTI') return 'N';
    return 'M';
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setErrors([]);

    try {
      const jsonData = await parseExcelFile(selectedFile);

      if (jsonData.length === 0) {
        setErrors(['Le fichier est vide ou mal formaté.']);
        return;
      }


      // Map columns
      const parsedClients: ImportedClient[] = jsonData.map((row: any) => {
        const values = Object.values(row) as string[];
        const keys = Object.keys(row).map(k => k.toLowerCase().trim().replace(/\s+/g, '_'));

        const getVal = (possible: string[]) => {
          for (const p of possible) {
            const idx = keys.findIndex(k => k.includes(p));
            if (idx !== -1) return String(values[idx] || '').trim();
          }
          return '';
        };

        const getNum = (possible: string[]) => {
          const val = getVal(possible);
          const num = parseFloat(val.replace(/[^\d.,]/g, '').replace(',', '.'));
          return isNaN(num) ? 0 : num;
        };

        return {
          ref: getVal(['code', 'dossier', 'ref']),
          form: getVal(['forme', 'juridique']),
          name: getVal(['nom', 'raison', 'sociale', 'name']),
          siren: getVal(['siren', 'siret']),
          code_ape: getVal(['ape', 'naf']),
          closing_date: getVal(['cloture', 'closing', 'date_cloture']),
          regime: parseRegime(getVal(['regime', 'tva'])),
          day: getVal(['echeance', 'jour']) || '15',
          // CRM fields
          manager_email: getVal(['email', 'mail', 'gerant']),
          phone: getVal(['telephone', 'tel', 'phone']),
          address: getVal(['adresse', 'address']),
          // Billing
          fee_compta: getNum(['compta', 'honoraires_compta', 'forfait_compta']),
          fee_social: getNum(['social', 'honoraires_social', 'forfait_social']),
          fee_juridique: getNum(['juridique', 'honoraires_juridique', 'forfait_juri']),
          annual_fee: getNum(['honoraires', 'annual_fee', 'autres']),
          // Volume
          invoices_per_month: getNum(['factures', 'invoices', 'nb_factures']),
          entries_count: getNum(['ecritures', 'entries', 'nb_ecritures']),
          establishments_count: getNum(['etablissements', 'establishments']) || 1,
        };
      });

      // Validate
      const validClients = parsedClients.filter((c, idx) => {
        if (!c.ref || !c.name) {
          setErrors(prev => [...prev, `Ligne ${idx + 2}: Code dossier ou nom manquant`]);
          return false;
        }
        return true;
      });

      setData(validClients);
      setStep('preview');
    } catch (err) {
      console.error('Error parsing file:', err);
      setErrors(['Erreur lors de la lecture du fichier. Vérifiez le format.']);
    }
  };

  const handleImport = () => {
    onImport(data);
    handleClose();
  };

  const downloadTemplate = async () => {
    const template = [
      {
        code_dossier: 'CLI001',
        forme_juridique: 'SAS',
        nom: 'Ma Société',
        siren: '123456789',
        code_ape: '6920Z',
        date_cloture: '12-31',
        regime_tva: 'M',
        echeance_tva: '24',
        // CRM
        email_gerant: 'gerant@example.com',
        telephone: '01 23 45 67 89',
        adresse: '123 rue Example, 75001 Paris',
        // Billing
        forfait_compta: 3000,
        forfait_social: 1500,
        forfait_juridique: 500,
        autres_honoraires: 0,
        // Volume
        nb_factures: 50,
        nb_ecritures: 500,
        nb_etablissements: 1
      }
    ];
    await downloadImportTemplate(template, 'modele_import_clients.xlsx');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-3xl w-full max-w-2xl p-8 shadow-2xl animate-scale-in max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-border">
          <div>
            <h2 className="text-xl font-bold">Importer des Clients</h2>
            <p className="text-sm text-muted-foreground">
              {step === 'upload' ? 'Sélectionnez un fichier Excel ou CSV' : `${data.length} clients détectés`}
            </p>
          </div>
          <button onClick={handleClose} className="p-2 rounded-xl hover:bg-muted">
            <X className="w-6 h-6" />
          </button>
        </div>

        {step === 'upload' && (
          <div className="flex-1">
            <div
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all",
                "hover:border-primary hover:bg-primary/5",
                file ? "border-success bg-success/5" : "border-border"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <FileSpreadsheet className={cn(
                "w-16 h-16 mx-auto mb-4",
                file ? "text-success" : "text-muted-foreground"
              )} />
              <p className="font-medium mb-2">
                {file ? file.name : 'Glissez votre fichier ici'}
              </p>
              <p className="text-sm text-muted-foreground">
                ou cliquez pour sélectionner (Excel, CSV)
              </p>
            </div>

            {errors.length > 0 && (
              <div className="mt-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                <div className="flex items-center gap-2 text-destructive font-medium mb-2">
                  <AlertCircle className="w-4 h-4" />
                  Erreurs détectées
                </div>
                <ul className="text-sm text-destructive space-y-1">
                  {errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
                  {errors.length > 5 && <li>... et {errors.length - 5} autres erreurs</li>}
                </ul>
              </div>
            )}

            <div className="mt-6 p-4 rounded-xl bg-muted/50">
              <p className="font-medium mb-2">Colonnes attendues :</p>
              <p className="text-sm text-muted-foreground">
                code_dossier, forme_juridique, nom, siren, code_ape, date_cloture, regime_tva, echeance_tva
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadTemplate}
                className="mt-3 gap-2"
              >
                <Download className="w-4 h-4" />
                Télécharger le modèle
              </Button>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    <th className="text-left p-3">Code</th>
                    <th className="text-left p-3">Nom</th>
                    <th className="text-left p-3">Forme</th>
                    <th className="text-left p-3">SIREN</th>
                    <th className="text-left p-3">Régime</th>
                  </tr>
                </thead>
                <tbody>
                  {data.slice(0, 50).map((client, idx) => (
                    <tr key={idx} className="border-b border-border/50 hover:bg-muted/50">
                      <td className="p-3 font-mono text-xs">{client.ref}</td>
                      <td className="p-3 font-medium truncate max-w-[200px]">{client.name}</td>
                      <td className="p-3">{client.form}</td>
                      <td className="p-3 font-mono text-xs">{client.siren}</td>
                      <td className="p-3">
                        <span className="badge-neutral">{client.regime}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.length > 50 && (
                <p className="text-center text-sm text-muted-foreground py-3">
                  Et {data.length - 50} autres clients...
                </p>
              )}
            </div>

            <div className="flex gap-4 pt-6 mt-4 border-t border-border">
              <Button variant="outline" onClick={reset} className="flex-1 rounded-2xl">
                Retour
              </Button>
              <Button onClick={handleImport} className="btn-primary flex-1">
                <Check className="w-4 h-4 mr-2" />
                Importer {data.length} clients
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
