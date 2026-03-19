import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEasterEgg } from '@/contexts/EasterEggContext';
import { Send, Paperclip, Image, X, Loader2, Bot, User, Sparkles, Trash2, FileText, ChevronDown, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    sendMessage,
    fileToBase64,
    hasApiKey,
    SUPPORTED_IMAGE_TYPES,
    ALL_SUPPORTED_TYPES,
    MAX_FILE_SIZE,
    AGENTS,
    type AgentId,
    type ChatMessage,
} from '@/lib/geminiApi';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getCabinetAlerts, type CabinetAlert } from '@/lib/cabinetMonitor';
import { AlertCircle, Clock, ChevronRight } from 'lucide-react';

// ─── Garde-fou thématique (filtre pré-API, 0 token consommé) ────────────────
const OFF_TOPIC_KEYWORDS = [
    // Météo / nature
    'météo', 'temps qu\'il fait', 'température', 'pluie', 'soleil', 'vent', 'neige',
    // Sport
    'foot', 'football', 'rugby', 'tennis', 'sport', 'match', 'score', 'équipe',
    // Cuisine / gastronomie
    'recette', 'cuisine', 'repas', 'restaurant', 'plat', 'ingrédient', 'cuisiner',
    // Divertissement
    'film', 'série', 'netflix', 'youtube', 'musique', 'chanson', 'jeu vidéo',
    // Sujets personnels non-pro
    'blague', 'joke', 'drôle', 'amour', 'relation', 'voyage', 'vacances', 'hôtel',
    // Tech généraliste
    'minecraft', 'pokemon', 'instagram', 'tiktok', 'snapchat', 'twitter',
];

const ON_TOPIC_KEYWORDS = [
    // Comptabilité
    'compt', 'bilan', 'pce', 'pcg', 'écriture', 'journal', 'facture', 'tva', 'ttc', 'ht',
    'débit', 'crédit', 'charge', 'produit', 'résultat', 'actif', 'passif', 'clôture',
    'bofip', 'liasse', 'amortissement', 'provision', 'stock', 'cgi', 'code de commerce',
    // Fiscalité
    'impôt', 'fiscal', 'is ', 'ir ', 'cfe', 'cvae', 'cotisation', 'taxes', 'taxe',
    'déclaration', 'légifrance', 'loi de finances', 'plfss', 'plf', 'décret',
    'mémento', 'lefebvre', 'revue fiduciaire', 'rf ',
    // Social
    'paie', 'bulletin', 'urssaf', 'salaire', 'contrat', 'smic', 'congé',
    'charges sociales', 'convention', 'licenciement', 'rupture', 'code du travail',
    // Juridique
    'société', 'sas', 'sarl', 'sci', 'statuts', 'associé', 'gérant', 'dividende',
    'assemblée', 'contentieux', 'juridique', 'contrat', 'bail', 'lamy', 'jurisprudence',
    'infogreffe', 'entreprendre.gouv',
    // Gestion cabinet
    'dossier', 'client', 'relance', 'échéance', 'cabinet', 'expert',
];

const REFUSAL_MESSAGE = `Je suis exclusivement spécialisé en comptabilité, fiscalité, social et droit des affaires. Cette question est hors de mon périmètre.`;

function isOffTopic(text: string): boolean {
    const lower = text.toLowerCase();
    const hasOffTopic = OFF_TOPIC_KEYWORDS.some(kw => lower.includes(kw));
    const hasOnTopic = ON_TOPIC_KEYWORDS.some(kw => lower.includes(kw));
    // Hors-sujet seulement si mot-clé hors-sujet trouvé ET aucun mot-clé métier
    return hasOffTopic && !hasOnTopic;
}
// ────────────────────────────────────────────────────────────────────────────


// Simple markdown renderer (bold, headers, lists, code, tables)
function renderMarkdown(text: string) {
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    let inCodeBlock = false;
    let codeLines: string[] = [];
    let codeLanguage = '';
    let inTable = false;
    let tableRows: string[][] = [];

    const processInline = (line: string): string => {
        return line
            .replace(/\*\*(.+?)\*\*/g, '<strong class="text-slate-900 dark:text-white font-bold">$1</strong>')
            .replace(/\*(.+?)\*/g, '<em class="text-indigo-600 dark:text-indigo-400">$1</em>')
            .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-[11px] font-mono text-indigo-500">$1</code>')
            .replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold border border-indigo-100 dark:border-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all no-underline my-1"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-3 h-3"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>$1</a>');
    };

    const flushTable = () => {
        if (tableRows.length > 0) {
            elements.push(
                <div key={`table-${elements.length}`} className="overflow-x-auto my-4 rounded-xl border border-slate-200 dark:border-white/5">
                    <table className="w-full text-xs border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-white/5">
                                {tableRows[0]?.map((cell, i) => (
                                    <th key={i} className="px-4 py-2.5 text-left font-black border-b border-slate-200 dark:border-white/5 uppercase tracking-wider text-[10px] text-slate-500"
                                        dangerouslySetInnerHTML={{ __html: processInline(cell.trim()) }} />
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {tableRows.slice(2).map((row, ri) => (
                                <tr key={ri} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                                    {row.map((cell, ci) => (
                                        <td key={ci} className="px-4 py-2.5"
                                            dangerouslySetInnerHTML={{ __html: processInline(cell.trim()) }} />
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
            tableRows = [];
            inTable = false;
        }
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const cleanLine = line.trim();

        // Code blocks
        if (line.startsWith('```')) {
            if (inCodeBlock) {
                elements.push(
                    <pre key={`code-${i}`} className="my-4 p-4 rounded-2xl bg-slate-900 text-slate-100 text-[11px] font-mono overflow-x-auto whitespace-pre-wrap border border-white/10 shadow-lg">
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
                            <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">{codeLanguage || 'code'}</div>
                        </div>
                        {codeLines.join('\n')}
                    </pre>
                );
                codeLines = [];
                inCodeBlock = false;
            } else {
                flushTable();
                codeLanguage = line.slice(3).trim();
                inCodeBlock = true;
            }
            continue;
        }
        if (inCodeBlock) { codeLines.push(line); continue; }

        // Table detection
        if (line.includes('|') && line.trim().startsWith('|')) {
            if (!inTable) inTable = true;
            tableRows.push(line.split('|').filter(c => c !== ''));
            continue;
        } else if (inTable) {
            flushTable();
        }

        // Headers
        if (cleanLine.startsWith('### ')) {
            elements.push(<h4 key={i} className="font-black text-xs uppercase tracking-widest text-indigo-500/80 mt-6 mb-2" dangerouslySetInnerHTML={{ __html: processInline(line.slice(4)) }} />);
            continue;
        }
        if (cleanLine.startsWith('## ')) {
            elements.push(<h3 key={i} className="font-black text-sm text-slate-900 dark:text-white mt-8 mb-3 flex items-center gap-2 border-l-3 border-indigo-500 pl-3" dangerouslySetInnerHTML={{ __html: processInline(line.slice(3)) }} />);
            continue;
        }
        if (cleanLine.startsWith('# ')) {
            elements.push(<h2 key={i} className="font-black text-lg text-slate-900 dark:text-white mt-10 mb-4 underline decoration-indigo-500/30 underline-offset-8" dangerouslySetInnerHTML={{ __html: processInline(line.slice(2)) }} />);
            continue;
        }

        // Lists
        if (cleanLine.match(/^[-*] /)) {
            elements.push(
                <div key={i} className="flex gap-3 mb-2 ml-1 items-start group">
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 group-hover:scale-125 transition-transform" />
                    <span className="text-sm leading-relaxed text-slate-700 dark:text-slate-300" dangerouslySetInnerHTML={{ __html: processInline(line.replace(/^[-*] /, '')) }} />
                </div>
            );
            continue;
        }
        if (cleanLine.match(/^\d+\. /)) {
            const content = line.replace(/^\d+\. /, '');
            elements.push(
                <div key={i} className="flex gap-2 mb-2 ml-1 items-baseline">
                    <span className="text-[10px] font-black text-indigo-500 w-4">{line.match(/^\d+/)?.[0]}.</span>
                    <span className="text-sm leading-relaxed text-slate-700 dark:text-slate-300" dangerouslySetInnerHTML={{ __html: processInline(content) }} />
                </div>
            );
            continue;
        }

        // Blockquote
        if (cleanLine.startsWith('> ')) {
            elements.push(
                <blockquote key={i} className="border-l-3 border-indigo-500/30 bg-indigo-50/30 dark:bg-indigo-500/5 p-3 rounded-r-xl my-4 italic text-sm text-slate-600 dark:text-slate-400"
                    dangerouslySetInnerHTML={{ __html: processInline(line.slice(2)) }} />
            );
            continue;
        }

        // Horizontal rule
        if (cleanLine.match(/^---+$/)) {
            elements.push(<hr key={i} className="my-6 border-slate-200 dark:border-white/5" />);
            continue;
        }

        // Empty lines
        if (!cleanLine) {
            elements.push(<div key={i} className="h-4" />);
            continue;
        }

        // Normal paragraph
        elements.push(<p key={i} className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 mb-3" dangerouslySetInnerHTML={{ __html: processInline(line) }} />);
    }

    flushTable();
    return elements;
}

// Suggested questions
const SUGGESTIONS = [
    "📑 Saisie de factures (OCR)",
    "📧 Rédiger un mail de relance",
    "📊 Analyser un dossier client",
    "⚖️ Question fiscale BOFiP",
];

export function AIAssistant() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [attachments, setAttachments] = useState<{ name: string; dataUri: string; type: string }[]>([]);
    const [clients, setClients] = useState<{ name: string; id: string }[]>([]);
    const [alerts, setAlerts] = useState<CabinetAlert[]>([]);

    // New UI states
    const [selectedAgent, setSelectedAgent] = useState<AgentId | null>(null);
    const [selectedDossier, setSelectedDossier] = useState<{ id: string, name: string } | null>(null);
    const [showDossierMenu, setShowDossierMenu] = useState(false);

    // Batman Easter Egg States
    const { unlockBatmanMode } = useEasterEgg();
    const [isBatmanTriggered, setIsBatmanTriggered] = useState(false);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [showWelcome, setShowWelcome] = useState(false);

    const { user } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Load context data
    useEffect(() => {
        const loadContext = async () => {
            const [{ data: clientsData }, alertsData] = await Promise.all([
                supabase.from('clients').select('id, name').order('name'),
                getCabinetAlerts()
            ]);
            if (clientsData) setClients(clientsData);
            if (alertsData) setAlerts(alertsData);
        };
        loadContext();
    }, []);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, loading, scrollToBottom]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
        }
    }, [input]);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        for (const file of Array.from(files)) {
            if (file.size > MAX_FILE_SIZE) {
                setError(`Fichier trop volumineux : ${file.name} (max 20 Mo)`);
                continue;
            }
            if (!ALL_SUPPORTED_TYPES.includes(file.type)) {
                setError(`Format non supporté : ${file.name}. Formats acceptés : images (PNG, JPG, WebP) et PDF.`);
                continue;
            }
            const dataUri = await fileToBase64(file);
            setAttachments(prev => [...prev, { name: file.name, dataUri, type: file.type }]);
        }
        e.target.value = '';
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleSend = async (customText?: string) => {
        console.log("[Alfred] handleSend appelé", { customText, inputLength: input.length });
        const text = customText || input.trim();
        if (!text && attachments.length === 0) return;

        // Easter Egg Detection
        const normalizedText = text.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
            .trim();

        if (normalizedText === "clement amato is the batman") {
            setIsBatmanTriggered(true);
            setCountdown(5);
            setInput('');
            return;
        }

        if (!hasApiKey()) {
            setError('⚠️ Clé API Gemini non configurée dans le fichier .env. Contactez l\'administrateur.');
            return;
        }

        const userMsg: ChatMessage = {
            role: 'user',
            text, // We only store the raw text in the UI messages, no hidden context
            images: attachments.map(a => a.dataUri),
            fileNames: attachments.map(a => a.name),
            timestamp: Date.now(),
        };

        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInput('');
        setAttachments([]);
        setError('');
        setLoading(true);

        // ── Garde-fou thématique (filtre local, 0 token xAI) ──
        if (isOffTopic(text)) {
            setLoading(false);
            setMessages(prev => [...prev, {
                role: 'model',
                text: REFUSAL_MESSAGE,
                timestamp: Date.now(),
            }]);
            return;
        }
        // ──────────────────────────────────────────────────────

        // Context generation for the API
        let dossierContext = '';
        if (selectedDossier) {
            dossierContext = `CONTEXTE CABINET STRICT : L'utilisateur travaille ACTUELLEMENT sur le dossier client spécifique "${selectedDossier.name}". Tes réponses doivent s'appliquer à ce dossier en priorité.`;
        } else {
            dossierContext = `CONTEXTE CABINET GLOBAL : Dossiers actifs du cabinet : ${clients.map(c => c.name).join(', ')}.`;
        }

        try {
            // Pass the plain messages and context separately so the UI doesn't see the context
            const response = await sendMessage(
                newMessages,
                selectedAgent || 'generalist',
                dossierContext
            );

            setMessages(prev => [...prev, {
                role: 'model',
                text: response,
                timestamp: Date.now(),
            }]);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur inconnue');
        } finally {
            setLoading(false);
        }
    };


    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const clearConversation = () => {
        setMessages([]);
        setError('');
    };

    // Batman Countdown Effect
    useEffect(() => {
        if (countdown === null) return;
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            // End of countdown
            setIsBatmanTriggered(false);
            setCountdown(null);
            unlockBatmanMode();
            setShowWelcome(true);
        }
    }, [countdown, unlockBatmanMode]);

    // Main Chat UI
    return (
        <div className="flex flex-col h-full">
            <AnimatePresence>
                {/* Countdown Overlay */}
                {countdown !== null && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center text-white p-6"
                    >
                        <motion.div
                            key={countdown}
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1.5, opacity: 1 }}
                            exit={{ scale: 3, opacity: 0 }}
                            transition={{ duration: 0.8 }}
                            className="font-black text-8xl md:text-[12rem] tracking-tighter"
                        >
                            {countdown}
                        </motion.div>
                        <motion.p
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="mt-8 text-xl md:text-2xl font-bold tracking-widest uppercase text-red-600 animate-pulse"
                        >
                            Initialisation du protocole Chevalier Noir...
                        </motion.p>
                    </motion.div>
                )}

                {/* Welcome Popup */}
                {showWelcome && (
                    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            className="bg-card border border-border/50 p-8 rounded-[2rem] shadow-2xl max-w-md w-full text-center relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-white to-primary"></div>
                            <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                <Bot className="w-10 h-10 text-primary" />
                            </div>
                            <h2 className="text-2xl font-bold mb-2">Bienvenue Clément AMATO</h2>
                            <p className="text-muted-foreground mb-8">
                                Le système est à votre entière disposition. Que puis-je faire pour vous aujourd'hui ?
                            </p>
                            <button
                                onClick={() => setShowWelcome(false)}
                                className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg"
                            >
                                Commencer la mission
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200/50 dark:border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white shadow-md text-lg">
                        {selectedAgent ? AGENTS[selectedAgent].icon : <Sparkles className="w-5 h-5" />}
                    </div>
                    <div>
                        <h3 className="font-bold text-sm flex items-center gap-2">
                            {selectedAgent ? AGENTS[selectedAgent].name : 'Alfred'}
                            {selectedAgent && (
                                <span className="inline-flex items-center rounded-full bg-violet-100 dark:bg-violet-500/20 px-2 py-0.5 text-[9px] font-bold tracking-wider text-violet-700 dark:text-violet-300 uppercase">
                                    Agent Spécialisé
                                </span>
                            )}
                        </h3>
                        <p className="text-[10px] text-muted-foreground">
                            {selectedAgent ? AGENTS[selectedAgent].description : 'Expert comptable, fiscal, social & juridique'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {selectedAgent && (
                        <button
                            onClick={() => {
                                setSelectedAgent(null);
                                clearConversation();
                            }}
                            className="p-1.5 mr-1 rounded-lg text-[10px] font-semibold text-muted-foreground hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                        >
                            Changer d'agent
                        </button>
                    )}
                    <button onClick={clearConversation} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors" title="Nouvelle conversation">
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-auto custom-scrollbar px-5 py-4 space-y-4">
                {/* Empty State / Agent Selection */}
                {messages.length === 0 && !selectedAgent && (
                    <div className="flex flex-col items-center justify-center h-full animate-in fade-in duration-500 pb-8">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center mb-4">
                            <Sparkles className="w-6 h-6 text-indigo-500" />
                        </div>
                        <h3 className="font-bold text-lg mb-1">Choisissez votre Expert</h3>
                        <p className="text-sm text-muted-foreground max-w-sm text-center mb-8">
                            Sélectionnez l'assistant spécialisé le plus adapté à votre demande pour des réponses plus précises.
                        </p>

                        <div className="flex flex-col gap-2 w-full max-w-sm">
                            {(Object.keys(AGENTS) as Array<AgentId>).map((agentKey) => {
                                const agent = AGENTS[agentKey];
                                return (
                                    <button
                                        key={agentKey}
                                        onClick={() => setSelectedAgent(agentKey)}
                                        className="group flex items-center gap-4 p-3.5 rounded-2xl bg-white/60 dark:bg-card/40 backdrop-blur-xl border border-white/50 dark:border-white/10 hover:shadow-md hover:scale-[1.02] hover:bg-white dark:hover:bg-card transition-all text-left"
                                    >
                                        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center text-xl shrink-0 group-hover:scale-110 transition-transform">
                                            {agent.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-sm text-foreground">{agent.name}</h4>
                                            <p className="text-xs text-muted-foreground truncate">{agent.description}</p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {messages.length === 0 && selectedAgent && (
                    <div className="flex flex-col items-center justify-center h-full gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center text-3xl">
                            {AGENTS[selectedAgent].icon}
                        </div>
                        <div className="text-center">
                            <h3 className="font-bold text-lg mb-1">Expert {AGENTS[selectedAgent].name}</h3>
                            <p className="text-sm text-muted-foreground max-w-md px-4">
                                {AGENTS[selectedAgent].description}. Posez votre question ou commencez une analyse.
                            </p>
                        </div>

                        {/* Proactive Alerts (Removed as requested) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
                            {SUGGESTIONS.map((q, i) => (
                                <button key={i} onClick={() => {
                                    if (q.includes("Saisie de factures")) {
                                        setInput("Je souhaite effectuer une saisie de factures. Peux-tu me demander les paramètres nécessaires ?");
                                    } else {
                                        handleSend(q);
                                    }
                                }}
                                    className="text-left text-xs p-3 rounded-xl bg-white/60 dark:bg-card/40 backdrop-blur-xl border border-white/50 dark:border-white/10 hover:shadow-md hover:scale-[1.01] transition-all text-muted-foreground hover:text-foreground">
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Message Bubbles */}
                {messages.map((msg, i) => (
                    <div key={i} className={cn("flex gap-3 animate-in slide-in-from-bottom-2 duration-300", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                        {msg.role === 'model' && (
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-sm mt-1">
                                <Bot className="w-4 h-4" />
                            </div>
                        )}
                        <div className={cn("max-w-[80%] rounded-2xl p-4",
                            msg.role === 'user'
                                ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg"
                                : "bg-white/70 dark:bg-card/50 backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-sm"
                        )}>
                            {/* Attached files preview */}
                            {msg.fileNames && msg.fileNames.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                    {msg.fileNames.map((name, fi) => (
                                        <span key={fi} className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium",
                                            msg.role === 'user' ? "bg-white/20" : "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300"
                                        )}>
                                            {SUPPORTED_IMAGE_TYPES.includes(msg.images?.[fi]?.split(';')[0]?.split(':')[1] || '') ? <Image className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                                            {name}
                                        </span>
                                    ))}
                                </div>
                            )}
                            {/* Attached images preview (thumbnails for user messages) */}
                            {msg.role === 'user' && msg.images && msg.images.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {msg.images.filter(img => img.startsWith('data:image')).map((img, ii) => (
                                        <img key={ii} src={img} alt="attachment" className="w-20 h-20 rounded-lg object-cover border-2 border-white/30" />
                                    ))}
                                </div>
                            )}
                            {/* Text */}
                            {msg.role === 'user' ? (
                                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                            ) : (
                                <div className="prose-sm">{renderMarkdown(msg.text)}</div>
                            )}
                        </div>
                        {msg.role === 'user' && (
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white shrink-0 shadow-sm mt-1">
                                <User className="w-4 h-4" />
                            </div>
                        )}
                    </div>
                ))}

                {/* Loading indicator */}
                {loading && (
                    <div className="flex gap-3 animate-in slide-in-from-bottom-2 duration-300">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                            <Bot className="w-4 h-4" />
                        </div>
                        <div className="bg-white/70 dark:bg-card/50 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-2xl px-5 py-4 shadow-sm">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                                <span>Alfred réfléchit...</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="mx-auto max-w-lg px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 rounded-xl text-sm text-red-700 dark:text-red-300 animate-in zoom-in-95">
                        {error}
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Attachments Preview */}
            {attachments.length > 0 && (
                <div className="px-5 py-2 border-t border-slate-200/50 dark:border-white/5 flex flex-wrap gap-2">
                    {attachments.map((att, i) => (
                        <div key={i} className="flex items-center gap-2 pl-3 pr-1 py-1 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 rounded-lg">
                            {att.type.startsWith('image/') ? (
                                <img src={att.dataUri} alt={att.name} className="w-8 h-8 rounded object-cover" />
                            ) : (
                                <FileText className="w-4 h-4 text-indigo-500" />
                            )}
                            <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300 max-w-[120px] truncate">{att.name}</span>
                            <button onClick={() => removeAttachment(i)} className="p-1 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-800/30 transition-colors">
                                <X className="w-3 h-3 text-indigo-500" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Input Area */}
            {selectedAgent && (
                <div className="px-5 py-3 border-t border-slate-200/50 dark:border-white/5 relative">
                    {/* Selected Dossier Badge */}
                    {selectedDossier && (
                        <div className="absolute -top-10 left-5 bg-indigo-100 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 text-indigo-800 dark:text-indigo-300 px-3 py-1.5 rounded-t-xl text-xs font-bold flex items-center gap-2 shadow-sm animate-in slide-in-from-bottom-2">
                            <FolderOpen className="w-3.5 h-3.5" />
                            {selectedDossier.name}
                            <button
                                onClick={() => setSelectedDossier(null)}
                                className="ml-2 hover:bg-indigo-200 dark:hover:bg-indigo-500/40 p-0.5 rounded-full transition-colors"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    )}

                    <div className="flex items-end gap-2">
                        {/* Dossier Picker Menu */}
                        <div className="relative">
                            <button
                                onClick={() => setShowDossierMenu(!showDossierMenu)}
                                className={cn(
                                    "p-3 rounded-xl transition-colors shrink-0 flex items-center justify-center border",
                                    selectedDossier
                                        ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/50"
                                        : "bg-slate-100 dark:bg-white/5 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-muted-foreground border-transparent"
                                )}
                                title="Associer à un dossier client"
                            >
                                <FolderOpen className="w-4 h-4" />
                            </button>

                            {/* Dossier Dropdown */}
                            {showDossierMenu && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowDossierMenu(false)} />
                                    <div className="absolute bottom-full left-0 mb-2 w-56 max-h-60 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2 custom-scrollbar p-1">
                                        <div className="px-3 py-2 text-xs font-bold tracking-wider text-muted-foreground uppercase border-b border-slate-100 dark:border-slate-800 mb-1">
                                            Sélectionner un dossier
                                        </div>
                                        <button
                                            onClick={() => { setSelectedDossier(null); setShowDossierMenu(false); }}
                                            className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 text-slate-600 dark:text-slate-400"
                                        >
                                            <Sparkles className="w-3.5 h-3.5" />
                                            (Aucun dossier / Global)
                                        </button>
                                        {clients.map(client => (
                                            <button
                                                key={client.id}
                                                onClick={() => { setSelectedDossier(client); setShowDossierMenu(false); }}
                                                className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium truncate"
                                            >
                                                {client.name}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        <input type="file" ref={fileInputRef} className="hidden" multiple accept={ALL_SUPPORTED_TYPES.join(',')} onChange={handleFileSelect} />
                        <button onClick={() => fileInputRef.current?.click()} className="p-3 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors shrink-0 border border-transparent" title="Joindre un fichier">
                            <Paperclip className="w-4 h-4 text-muted-foreground" />
                        </button>

                        <div className="flex-1 relative">
                            <textarea
                                ref={textareaRef}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Posez votre question..."
                                rows={1}
                                className={cn(
                                    "w-full resize-none rounded-xl bg-white/60 dark:bg-card/40 backdrop-blur-xl px-4 py-3 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all border",
                                    selectedDossier ? "border-indigo-200 dark:border-indigo-800/50 rounded-tl-none" : "border-white/50 dark:border-white/10"
                                )}
                            />
                        </div>
                        <button
                            onClick={() => handleSend()}
                            disabled={(!input.trim() && attachments.length === 0) || loading}
                            className="p-3 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white disabled:opacity-40 hover:shadow-lg transition-all shrink-0"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                    <p className="text-[10px] text-center text-muted-foreground/50 mt-2">
                        Alfred est un assistant IA. Vérifiez toujours les informations auprès d'un expert.
                    </p>
                </div>
            )}
        </div>
    );
}
