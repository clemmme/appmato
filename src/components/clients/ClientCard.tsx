/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { memo } from 'react';
import { Pencil, Trash2, Eye, Mail, Phone, Play, Clock, UserPlus } from 'lucide-react';
import { FavoriteStar } from '@/components/ui/favorite-star';
import { cn } from '@/lib/utils';

export const ClientCard = memo(({
    client,
    isFavorite,
    onToggleFavorite,
    onSelectDetail,
    onAssign,
    onEdit,
    onDelete,
    timerState,
    startTimer,
    getRegimeLabel,
    getTotalFee
}: any) => {
    return (
        <div
            className="bento-card group cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all"
            onClick={onSelectDetail}
        >
            <div className="flex justify-between items-start mb-4">
                <div className="flex flex-wrap items-center gap-1">
                    <FavoriteStar isFavorite={isFavorite} onToggle={(e: any) => { e.stopPropagation(); onToggleFavorite(); }} />
                    <span className="badge-neutral text-xs">{client.ref}</span>
                    {client.profile && (
                        <span
                            className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-semibold border border-primary/20"
                            title="Responsable du dossier"
                        >
                            <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[9px]">
                                {(client.profile.full_name?.charAt(0) || client.profile.email.charAt(0)).toUpperCase()}
                            </div>
                            {client.profile.full_name || client.profile.email.split('@')[0]}
                        </span>
                    )}
                    {client.form && (
                        <span className="badge-success text-xs">{client.form}</span>
                    )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => { e.stopPropagation(); onSelectDetail(); }}
                        className="p-2 rounded-xl hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                        title="Voir fiche 360°"
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                    {onAssign && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onAssign(); }}
                            className="p-2 rounded-xl hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                            title="Assigner un responsable"
                        >
                            <UserPlus className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(); }}
                        className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                    >
                        <Pencil className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        className="p-2 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <h3 className="font-bold text-lg mb-2 line-clamp-2">{client.name}</h3>

            {/* Contact info */}
            {(client.manager_email || client.phone) && (
                <div className="flex flex-wrap gap-2 mb-3 text-xs text-muted-foreground">
                    {client.manager_email && (
                        <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {client.manager_email}
                        </span>
                    )}
                    {client.phone && (
                        <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {client.phone}
                        </span>
                    )}
                </div>
            )}

            <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Régime TVA</span>
                <span className={cn(
                    "font-semibold",
                    client.regime === 'N' ? 'text-muted-foreground' : 'text-primary'
                )}>
                    {getRegimeLabel(client.regime)}
                </span>
            </div>

            {client.regime !== 'N' && (
                <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-muted-foreground">Échéance</span>
                    <span className="font-medium">Le {client.day}</span>
                </div>
            )}

            {getTotalFee(client) > 0 && (
                <div className="flex items-center justify-between text-sm mt-2 pt-2 border-t border-border/50">
                    <span className="text-muted-foreground">Forfait total</span>
                    <span className="font-bold text-primary">{getTotalFee(client).toLocaleString('fr-FR')}€</span>
                </div>
            )}

            {/* Timer */}
            <div className="mt-4 pt-3 border-t border-border/50">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (timerState.clientId !== client.id) {
                            startTimer(client.id, client.name);
                        }
                    }}
                    className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-xl border transition-all w-full",
                        timerState.clientId === client.id
                            ? "bg-primary/10 border-primary/30 shadow-lg shadow-primary/10"
                            : "bg-muted/50 border-border/30 hover:bg-muted"
                    )}
                >
                    {timerState.clientId === client.id ? (
                        <>
                            <Clock className="w-4 h-4 text-primary animate-pulse" />
                            <span className="text-sm font-bold text-primary">Chrono actif</span>
                        </>
                    ) : (
                        <>
                            <Play className="w-4 h-4 text-success" />
                            <span className="text-xs text-muted-foreground">Démarrer chrono</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
});
