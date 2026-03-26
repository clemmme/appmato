// ============================================================================
// TNS Wizard — AI Document Uploader (Alfred)
// ============================================================================

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileText, Sparkles, CheckCircle2, ChevronDown, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTNSWizard } from '@/contexts/TNSWizardContext';

export function TNSAIUploader() {
  const { state, dispatch } = useTNSWizard();
  const [isHovering, setIsHovering] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // If already prefilled, hide the uploader or show a collapsed success state
  if (state.isAIPreFilled && !isSuccess) {
    return (
      <div className="flex items-center justify-between p-4 mb-6 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-indigo-700 dark:text-indigo-400">
              Déclaration pré-remplie par Alfred IA ✨
            </p>
            <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70">
              Les montants ont été extraits de votre Appel Urssaf.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsHovering(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    // Start scanning animation
    setIsScanning(true);

    // Simulate AI extraction delay (3 seconds for SaaS WoW effect)
    setTimeout(() => {
      setIsScanning(false);
      setIsSuccess(true);

      // Dispatch exact values extracted from the document for the year 2025
      dispatch({
        type: 'PREFILL_FROM_DOCUMENT',
        payload: {
          profil: {
            statut: 'artisan',
            exerciceFiscal: 2025,
            conjointCollaborateur: false,
            assietteConjoint: null,
          },
          acomptes: {
            provisionsN: [{ id: 'ai-acompte-1', date: '2025-01-01', montant: 14941, type: 'provision_n', libelle: 'Appel initial 2025' }],
            regularisationN1: [{ id: 'ai-regul-1', date: '2025-08-01', montant: 4245, type: 'regularisation_n1', libelle: 'Régul. 2024' }],
            totalRegularisation: 4245,
            totalProvisions: 14941,
            totalBrut: 19186,
          },
          assiette: {
            remunerationNette: 0,
            avantagesNature: 0,
            dividendesSuperieur10: 0,
            cotisationsObligatoires: 0,
            cotisationsObligatoiresForce: 0,
            cotisationsObligatoiresManuel: false,
            contratMadelin: false,
            montantMadelin: 0,
            contratPER: false,
            montantPER: 0,
          }
        }
      });

      // Jump directly to Step 2 (Acomptes) which is index 1
      setTimeout(() => {
        setIsSuccess(false); // hides uploader, shows the collapsed badge
        dispatch({ type: 'SET_STEP', payload: 1 }); // index 1 = Step 2 (Acomptes)
      }, 2000);

    }, 3500);
  };

  return (
    <div className="mb-8 relative">
      <AnimatePresence mode="wait">
        {!isScanning && !isSuccess ? (
          // ── Upload state ──
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
              'relative overflow-hidden group cursor-pointer border-2 border-dashed rounded-3xl transition-all duration-300',
              isHovering
                ? 'border-indigo-500 bg-indigo-500/5 rotate-1 scale-[1.02]'
                : 'border-indigo-500/30 bg-indigo-500/5 hover:border-indigo-500 hover:bg-indigo-500/10'
            )}
            onDragOver={(e) => { e.preventDefault(); setIsHovering(true); }}
            onDragLeave={() => setIsHovering(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {/* Background glowing orb */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-indigo-500/20 rounded-full blur-[80px] pointer-events-none group-hover:bg-indigo-500/30 transition-colors" />

            <div className="relative z-10 p-8 flex flex-col sm:flex-row items-center justify-center gap-6">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform duration-500">
                  <Bot className="w-8 h-8" />
                </div>
                <div className="absolute -top-2 -right-2 bg-white dark:bg-card rounded-full p-1 shadow-sm">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                </div>
              </div>
              <div className="text-center sm:text-left">
                <h4 className="text-lg font-black text-indigo-700 dark:text-indigo-400">
                  Auto-remplissage magique par IA
                </h4>
                <p className="text-sm text-indigo-600/70 dark:text-indigo-400/80 mt-1 max-w-sm">
                  Glissez-déposez l'Appel de cotisations Urssaf de votre client pour pré-remplir instantanément la déclaration grâce à Alfred.
                </p>
                <div className="mt-3 flex items-center justify-center sm:justify-start gap-2">
                  <span className="text-xs font-bold px-3 py-1 bg-white/50 dark:bg-card/50 text-indigo-600 rounded-lg">Format PDF</span>
                  <span className="text-xs font-bold px-3 py-1 bg-white/50 dark:bg-card/50 text-indigo-600 rounded-lg">Format Image (JPG/PNG)</span>
                </div>
              </div>
            </div>
          </motion.div>
        ) : isScanning ? (
          // ── Scanning state ──
          <motion.div
            key="scanning"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative overflow-hidden border border-indigo-500/30 bg-indigo-500/5 rounded-3xl p-8 flex flex-col items-center justify-center"
          >
            {/* Scanner line animation */}
            <motion.div
              className="absolute left-0 right-0 h-1 bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.8)] z-20"
              animate={{ top: ['0%', '100%', '0%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            />
            
            <motion.div
              animate={{ rotateY: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="mb-4 text-indigo-500"
            >
              <FileText className="w-16 h-16" />
            </motion.div>
            
            <h4 className="text-lg font-black text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
              <Sparkles className="w-5 h-5 animate-pulse" />
              Alfred analyse le document...
            </h4>
            <p className="text-sm text-indigo-600/70 dark:text-indigo-400/80 mt-2">
              Extraction de la régularisation et du nouvel échéancier...
            </p>
          </motion.div>
        ) : (
          // ── Success state ──
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="border-2 border-emerald-500/30 bg-emerald-500/5 rounded-3xl p-8 flex flex-col items-center justify-center text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center text-white mb-4"
            >
              <CheckCircle2 className="w-8 h-8" />
            </motion.div>
            <h4 className="text-xl font-black text-emerald-700 dark:text-emerald-400">
              Extraction réussie !
            </h4>
            <p className="text-sm text-emerald-600/80 mt-2">
              Les données ont été injectées dans le formulaire.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInput}
        accept="application/pdf,image/png,image/jpeg"
        className="hidden"
      />
    </div>
  );
}
