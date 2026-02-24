import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Paperclip, Image, X, Loader2, Bot, User, Sparkles, Trash2, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    sendMessage,
    fileToBase64,
    hasApiKey,
    SUPPORTED_IMAGE_TYPES,
    ALL_SUPPORTED_TYPES,
    MAX_FILE_SIZE,
    type ChatMessage,
} from '@/lib/geminiApi';

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
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-xs font-mono">$1</code>')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-indigo-600 dark:text-indigo-400 underline">$1</a>');
    };

    const flushTable = () => {
        if (tableRows.length > 0) {
            elements.push(
                <div key={`table-${elements.length}`} className="overflow-x-auto my-3">
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr>
                                {tableRows[0]?.map((cell, i) => (
                                    <th key={i} className="border border-slate-200 dark:border-white/10 px-3 py-1.5 bg-slate-50 dark:bg-white/5 text-left font-bold text-xs"
                                        dangerouslySetInnerHTML={{ __html: processInline(cell.trim()) }} />
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {tableRows.slice(2).map((row, ri) => (
                                <tr key={ri}>
                                    {row.map((cell, ci) => (
                                        <td key={ci} className="border border-slate-200 dark:border-white/10 px-3 py-1.5 text-xs"
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

        // Code blocks
        if (line.startsWith('```')) {
            if (inCodeBlock) {
                elements.push(
                    <pre key={`code-${i}`} className="my-3 p-4 rounded-xl bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                        <div className="text-[10px] text-slate-500 mb-2 uppercase">{codeLanguage || 'code'}</div>
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
        if (line.startsWith('### ')) {
            elements.push(<h4 key={i} className="font-bold text-sm mt-4 mb-1" dangerouslySetInnerHTML={{ __html: processInline(line.slice(4)) }} />);
            continue;
        }
        if (line.startsWith('## ')) {
            elements.push(<h3 key={i} className="font-bold text-base mt-4 mb-2" dangerouslySetInnerHTML={{ __html: processInline(line.slice(3)) }} />);
            continue;
        }
        if (line.startsWith('# ')) {
            elements.push(<h2 key={i} className="font-bold text-lg mt-4 mb-2" dangerouslySetInnerHTML={{ __html: processInline(line.slice(2)) }} />);
            continue;
        }

        // Lists
        if (line.match(/^[-*] /)) {
            elements.push(<li key={i} className="ml-4 list-disc text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: processInline(line.slice(2)) }} />);
            continue;
        }
        if (line.match(/^\d+\. /)) {
            const content = line.replace(/^\d+\. /, '');
            elements.push(<li key={i} className="ml-4 list-decimal text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: processInline(content) }} />);
            continue;
        }

        // Blockquote
        if (line.startsWith('> ')) {
            elements.push(
                <blockquote key={i} className="border-l-3 border-indigo-400 pl-3 my-2 italic text-sm text-muted-foreground"
                    dangerouslySetInnerHTML={{ __html: processInline(line.slice(2)) }} />
            );
            continue;
        }

        // Horizontal rule
        if (line.match(/^---+$/)) {
            elements.push(<hr key={i} className="my-3 border-slate-200 dark:border-white/10" />);
            continue;
        }

        // Empty lines
        if (!line.trim()) {
            elements.push(<div key={i} className="h-2" />);
            continue;
        }

        // Normal paragraph
        elements.push(<p key={i} className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: processInline(line) }} />);
    }

    flushTable();
    return elements;
}

// Suggested questions
const SUGGESTIONS = [
    "Quelles sont les écritures comptables pour une acquisition d'immobilisation ?",
    "Explique-moi les régimes de TVA en France",
    "Comment calculer les charges patronales sur un salaire brut de 3 000€ ?",
    "Quelles sont les étapes pour créer une SAS ?",
    "Comment évaluer une entreprise par la méthode DCF ?",
    "Quels sont les délais de prescription fiscale ?",
];

export function AIAssistant() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [attachments, setAttachments] = useState<{ name: string; dataUri: string; type: string }[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

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
        console.log("[MATO AI] handleSend appelé", { customText, inputLength: input.length });
        const text = customText || input.trim();
        if (!text && attachments.length === 0) return;
        if (!hasApiKey()) {
            setError('⚠️ Clé API Gemini non configurée dans le fichier .env. Contactez l\'administrateur.');
            return;
        }

        const userMsg: ChatMessage = {
            role: 'user',
            text,
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

        try {
            const response = await sendMessage(newMessages);
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

    // Main Chat UI
    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200/50 dark:border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
                        <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm">MATO AI</h3>
                        <p className="text-[10px] text-muted-foreground">Expert comptable, fiscal, social & juridique</p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={clearConversation} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors" title="Nouvelle conversation">
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-auto custom-scrollbar px-5 py-4 space-y-4">
                {/* Empty State */}
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full gap-6 animate-in fade-in duration-500">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center">
                            <Sparkles className="w-8 h-8 text-indigo-500" />
                        </div>
                        <div className="text-center">
                            <h3 className="font-bold text-lg mb-1">Comment puis-je vous aider ?</h3>
                            <p className="text-sm text-muted-foreground max-w-md">
                                Posez-moi vos questions en comptabilité, fiscalité, droit social, droit des affaires ou finance.
                                Vous pouvez aussi m'envoyer des captures d'écran ou des documents PDF.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
                            {SUGGESTIONS.map((q, i) => (
                                <button key={i} onClick={() => handleSend(q)}
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
                                <span>MATO AI réfléchit...</span>
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
            <div className="px-5 py-3 border-t border-slate-200/50 dark:border-white/5">
                <div className="flex items-end gap-2">
                    <input type="file" ref={fileInputRef} className="hidden" multiple accept={ALL_SUPPORTED_TYPES.join(',')} onChange={handleFileSelect} />
                    <button onClick={() => fileInputRef.current?.click()} className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors shrink-0" title="Joindre un fichier">
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
                            className="w-full resize-none rounded-xl bg-white/60 dark:bg-card/40 backdrop-blur-xl border border-white/50 dark:border-white/10 px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                        />
                    </div>
                    <button
                        onClick={() => handleSend()}
                        disabled={(!input.trim() && attachments.length === 0) || loading}
                        className="p-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white disabled:opacity-40 hover:shadow-lg transition-all shrink-0"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
                <p className="text-[10px] text-center text-muted-foreground/50 mt-2">
                    MATO AI est un assistant IA. Vérifiez toujours les informations auprès d'un expert.
                </p>
            </div>
        </div>
    );
}
