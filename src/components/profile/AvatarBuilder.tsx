/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { RefreshCw, Save, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface AvatarBuilderProps {
    currentAvatarUrl?: string | null;
    onSave?: (newUrl: string) => void;
    onCancel?: () => void;
}

const PRESET_STYLES = [
    'adventurer',
    'avataaars',
    'bottts',
    'fun-emoji',
    'micah',
    'notionists',
    'lorelei',
    'croodles',
    'thumbs',
    'big-ears',
    'miniavs'
];

type OptionType = 'color' | 'text';

interface StyleConfig {
    [key: string]: {
        label: string;
        type: OptionType;
        options: { label: string; value: string }[];
    }
}

const COMMON_COLORS = [
    { label: 'Noir', value: '000000' },
    { label: 'Brun', value: '4a2e2b' },
    { label: 'Blond', value: 'f4d150' },
    { label: 'Roux', value: 'e05a3d' },
    { label: 'Rose', value: 'fc909f' },
    { label: 'Bleu', value: '6bd9e9' },
    { label: 'Blanc', value: 'ffffff' },
    { label: 'Gris', value: '9e9e9e' },
];

const SKIN_COLORS = [
    { label: 'Clair', value: 'f9c9b6' },
    { label: 'Hâlé', value: 'e0c4b6' },
    { label: 'Caramel', value: 'ac6651' },
    { label: 'Mat', value: '77311d' },
    { label: 'Ébène', value: '3e180c' },
];

const STYLE_CONFIGS: Record<string, StyleConfig> = {
    'micah': {
        'baseColor': {
            label: 'Couleur de peau',
            type: 'color',
            options: SKIN_COLORS
        },
        'hair': {
            label: 'Coupe de cheveux',
            type: 'text',
            options: ['fonze', 'mrT', 'dougFunny', 'mrClean', 'dannyPhantom', 'full', 'pixie'].map(v => ({ label: v, value: v }))
        },
        'hairColor': {
            label: 'Teinture',
            type: 'color',
            options: COMMON_COLORS
        }
    },
    'avataaars': {
        'skinColor': {
            label: 'Couleur de peau',
            type: 'color',
            options: SKIN_COLORS
        },
        'clothesColor': {
            label: 'Vêtements',
            type: 'color',
            options: [
                { label: 'Gris', value: 'e6e6e6' },
                { label: 'Noir', value: '262e33' },
                { label: 'Bleu', value: '65c9ff' },
                { label: 'Rose', value: 'ff5c9c' },
                { label: 'Rouge', value: 'ff4f4f' },
            ]
        }
    },
    'bottts': {
        'face': {
            label: 'Forme (Visage)',
            type: 'text',
            options: ['round01', 'round02', 'square01', 'square02', 'square03', 'square04'].map(v => ({ label: v, value: v }))
        },
        'baseColor': {
            label: 'Couleur (Châssis)',
            type: 'color',
            options: [
                { label: 'Acier', value: '9e9e9e' },
                { label: 'Or', value: 'ffb300' },
                { label: 'Rouille', value: 'f4511e' },
                { label: 'Néon', value: '00acc1' },
                { label: 'Sombre', value: '546e7a' },
                { label: 'Océan', value: '1e88e5' },
                { label: 'Émeraude', value: '43a047' },
                { label: 'Violet', value: '8e24aa' },
                { label: 'Magenta', value: 'd81b60' },
                { label: 'Blanc', value: 'ffffff' },
                { label: 'Noir', value: '000000' },
                { label: 'Cuivre', value: 'd68d55' },
            ]
        },
        'texture': {
            label: 'Matériau',
            type: 'text',
            options: ['camo01', 'circuits', 'dirty01', 'dots', 'grunge01'].map(v => ({ label: v, value: v }))
        }
    },
    'adventurer': {
        'skinColor': {
            label: 'Couleur de peau',
            type: 'color',
            options: SKIN_COLORS
        },
        'hairColor': {
            label: 'Teinture',
            type: 'color',
            options: COMMON_COLORS
        }
    },
    'lorelei': {
        'hairColor': {
            label: 'Teinture',
            type: 'color',
            options: COMMON_COLORS
        }
    }
};

export function AvatarBuilder({ currentAvatarUrl, onSave, onCancel }: AvatarBuilderProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [saving, setSaving] = useState(false);

    // Extract seed and style from current URL or generate random
    const extractFromUrl = (url: string | null | undefined) => {
        if (!url || !url.includes('api.dicebear.com')) {
            return {
                style: 'micah',
                seed: 1,
                bgColor: 'transparent'
            };
        }
        try {
            const urlObj = new URL(url);
            const parts = urlObj.pathname.split('/');
            const style = parts[parts.length - 2] || 'micah'; // e.g., /8.x/micah/svg
            const seedParam = urlObj.searchParams.get('seed');
            const seed = seedParam && !isNaN(Number(seedParam)) ? Number(seedParam) : 1;
            const bgColor = urlObj.searchParams.get('backgroundColor') || 'transparent';
            return { style, seed, bgColor };
        } catch (e) {
            return { style: 'micah', seed: 1, bgColor: 'transparent' };
        }
    };

    const initialConfig = extractFromUrl(currentAvatarUrl);

    const [style, setStyle] = useState(initialConfig.style);
    const [seedIndex, setSeedIndex] = useState(initialConfig.seed);
    const [bgColor, setBgColor] = useState(initialConfig.bgColor);

    // Advanced customization options for specific styles (e.g. Micah)
    const [advancedOptions, setAdvancedOptions] = useState<{
        baseColor?: string;
        hair?: string;
        hairColor?: string;
        texture?: string;
    }>({});

    // Reset advanced options when style changes
    useEffect(() => {
        setAdvancedOptions({});
    }, [style]);

    const handleAdvancedOptionChange = (key: string, value: string) => {
        setAdvancedOptions(prev => ({ ...prev, [key]: value }));
    };

    // Serialize advanced options to URL params
    const getAdvancedParamsStr = () => {
        const params = new URLSearchParams();
        Object.entries(advancedOptions).forEach(([key, value]) => {
            if (value) params.append(key, value);
        });

        // SPECIAL FIX FOR BOTTTS: Ensure texture is always visible if one is selected
        if (style === 'bottts' && advancedOptions.texture) {
            params.append('textureProbability', '100');
        }

        return params.toString() ? `&${params.toString()}` : '';
    };

    const currentPreviewUrl = `https://api.dicebear.com/8.x/${style}/svg?seed=${seedIndex}&backgroundColor=${bgColor !== 'transparent' ? bgColor.replace('#', '') : 'transparent'}${getAdvancedParamsStr()}`;

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ avatar_url: currentPreviewUrl })
                .eq('id', user.id);

            if (error) throw error;

            toast({
                title: "Avatar appliqué avec succès ! 🎉",
                description: "Votre nouvel avatar est maintenant visible partout dans l'application.",
            });

            if (onSave) onSave(currentPreviewUrl);
        } catch (error: any) {
            toast({
                title: "Erreur",
                description: error.message || "Impossible de sauvegarder l'avatar.",
                variant: "destructive"
            });
        } finally {
            setSaving(false);
        }
    };

    const isCustomizable = !!STYLE_CONFIGS[style];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">

            {isCustomizable ? (
                <div className="flex flex-col md:flex-row items-center md:items-start justify-center gap-6 bg-muted/30 p-6 rounded-3xl border border-border/50">

                    {/* Avatar Preview */}
                    <div className="flex flex-col items-center flex-shrink-0">
                        <div className="relative w-40 h-40 md:w-48 md:h-48 rounded-full border-4 border-background shadow-xl overflow-hidden mb-4 bg-muted flex items-center justify-center">
                            <img
                                src={currentPreviewUrl}
                                alt="Avatar Preview"
                                className="w-full h-full object-cover scale-110"
                                key={currentPreviewUrl} // Force re-render on url change
                            />
                        </div>
                        <div className="flex items-center gap-4 mt-2">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setSeedIndex(prev => prev > 1 ? prev - 1 : 20)}
                                className="rounded-full w-10 h-10 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </Button>
                            <div className="flex flex-col items-center justify-center min-w-[4rem]">
                                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Avatar</span>
                                <span className="font-extrabold text-2xl text-foreground">{seedIndex}</span>
                            </div>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setSeedIndex(prev => prev < 20 ? prev + 1 : 1)}
                                className="rounded-full w-10 h-10 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors hover:scale-105 active:scale-95"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>

                    {/* Advanced Operations (Dynamic from STYLE_CONFIGS) */}
                    {STYLE_CONFIGS[style] && (
                        <div className="flex-1 w-full flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-500">
                            <Label className="stat-label text-sm font-bold flex items-center gap-2 text-primary">
                                <span>✨</span> Personnalisez votre Avatar
                            </Label>

                            <div className="space-y-4">
                                {Object.entries(STYLE_CONFIGS[style]).map(([apiParam, config]) => (
                                    <div key={apiParam} className="space-y-3">
                                        <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                                            {config.label}
                                            {advancedOptions[apiParam] && (
                                                <button onClick={() => setAdvancedOptions(prev => { const newOpts = { ...prev }; delete newOpts[apiParam]; return newOpts; })} className="text-destructive lowercase hover:underline">
                                                    réinitialiser
                                                </button>
                                            )}
                                        </Label>
                                        <div className={cn("flex flex-wrap", config.type === 'color' ? "gap-3" : "gap-3")}>
                                            {config.options.map(option => {
                                                const isSelected = advancedOptions[apiParam] === option.value;

                                                if (config.type === 'color') {
                                                    return (
                                                        <button
                                                            key={option.value}
                                                            onClick={() => handleAdvancedOptionChange(apiParam, option.value)}
                                                            className={cn(
                                                                "pl-1.5 pr-3 py-1.5 rounded-full text-[11px] font-semibold transition-all border-2 flex items-center gap-2",
                                                                isSelected
                                                                    ? "border-primary bg-primary/10 text-primary shadow-sm scale-105"
                                                                    : "border-border/50 bg-background hover:border-primary/30 text-muted-foreground hover:bg-muted"
                                                            )}
                                                        >
                                                            <div className="w-4 h-4 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: `#${option.value}` }} />
                                                            {option.label}
                                                        </button>
                                                    );
                                                } else {
                                                    // It's a "text" (visual) option
                                                    // Generate preview url specifically for this mini option
                                                    const miniPreviewParams = new URLSearchParams(getAdvancedParamsStr());
                                                    miniPreviewParams.set(apiParam, option.value); // Apply this specific option

                                                    // SPECIAL FIX FOR BOTTTS: Ensure mini-preview texture is also visible
                                                    if (style === 'bottts' && apiParam === 'texture') {
                                                        miniPreviewParams.set('textureProbability', '100');
                                                    }

                                                    const optionPreviewUrl = `https://api.dicebear.com/8.x/${style}/svg?seed=${seedIndex}&backgroundColor=${bgColor !== 'transparent' ? bgColor.replace('#', '') : 'transparent'}${miniPreviewParams.toString() ? '&' + miniPreviewParams.toString() : ''}`;

                                                    return (
                                                        <button
                                                            key={option.value}
                                                            onClick={() => handleAdvancedOptionChange(apiParam, option.value)}
                                                            className={cn(
                                                                "relative w-14 h-14 rounded-2xl overflow-hidden transition-all border-4 bg-muted",
                                                                isSelected
                                                                    ? "border-primary shadow-md scale-105 ring-4 ring-primary/20"
                                                                    : "border-transparent hover:border-primary/40 hover:scale-105"
                                                            )}
                                                            title={option.label}
                                                        >
                                                            <img
                                                                src={optionPreviewUrl}
                                                                alt={option.label}
                                                                className="w-full h-full object-cover scale-110"
                                                                loading="lazy"
                                                            />
                                                        </button>
                                                    );
                                                }
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                // MODE GALERIE (Styles Simples sans options)
                <div className="flex flex-col items-center justify-center gap-4 bg-muted/30 p-6 rounded-3xl border border-border/50 shadow-sm relative overflow-hidden animate-in fade-in zoom-in-95 duration-500">
                    <Label className="stat-label text-sm font-bold flex items-center gap-2 text-primary w-full text-left">
                        <span>✨</span> Choisissez votre Avatar
                    </Label>
                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-5 gap-3 w-full">
                        {Array.from({ length: 20 }, (_, i) => i + 1).map((idx) => {
                            const isSelected = seedIndex === idx;
                            const previewUrl = `https://api.dicebear.com/8.x/${style}/svg?seed=${idx}&backgroundColor=${bgColor !== 'transparent' ? bgColor.replace('#', '') : 'transparent'}`;
                            return (
                                <button
                                    key={idx}
                                    onClick={() => setSeedIndex(idx)}
                                    className={cn(
                                        "relative aspect-square rounded-2xl overflow-hidden transition-all border-4 bg-background shadow-sm hover:shadow-md",
                                        isSelected
                                            ? "border-primary scale-105 ring-4 ring-primary/20 shadow-primary/20"
                                            : "border-transparent hover:border-primary/40 hover:scale-105"
                                    )}
                                >
                                    <img
                                        src={previewUrl}
                                        alt={`Galerie Avatar ${idx}`}
                                        className="w-full h-full object-cover scale-110"
                                        loading="lazy"
                                    />
                                    {isSelected && (
                                        <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5 shadow-sm">
                                            <Check className="w-3 h-3" />
                                        </div>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}
            {/* Controls Area */}
            <div className="space-y-5">
                <div>
                    <Label className="stat-label mb-3 block">Style de dessin</Label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {PRESET_STYLES.map(s => (
                            <button
                                key={s}
                                onClick={() => setStyle(s)}
                                className={cn(
                                    "px-3 py-2 rounded-xl text-xs font-medium capitalize transition-all border-2",
                                    style === s
                                        ? "border-primary bg-primary/10 text-primary"
                                        : "border-border hover:border-primary/50 text-muted-foreground"
                                )}
                            >
                                {s.replace('-', ' ')}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <Label className="stat-label mb-3 block">Couleur de fond</Label>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setBgColor('transparent')}
                            className={cn(
                                "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all",
                                bgColor === 'transparent' ? "border-foreground ring-2 ring-offset-2 ring-offset-background" : "border-border hover:scale-110"
                            )}
                            title="Transparent"
                        >
                            <div className="w-full h-full rounded-full bg-gradient-to-br from-gray-100 to-gray-300 opacity-50 relative overflow-hidden">
                                <div className="absolute inset-0 flex items-center justify-center text-[8px] text-gray-500 font-bold rotate-45">/</div>
                            </div>
                        </button>
                        {[
                            '#b6e3f4', '#c0aede', '#d1d4f9', '#ffd5dc', '#ffdfbf',
                            '#c2f0c2', '#f0c2c2', '#f0f0c2', '#c2f0f0', '#000000', '#ffffff'
                        ].map(color => (
                            <button
                                key={color}
                                onClick={() => setBgColor(color)}
                                className={cn(
                                    "w-8 h-8 rounded-full border-2 transition-all hover:scale-110",
                                    bgColor === color ? "border-foreground scale-110 ring-2 ring-offset-2 ring-offset-background" : "border-transparent shadow-sm"
                                )}
                                style={{ backgroundColor: color }}
                                title={color}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
                {onCancel && (
                    <Button variant="ghost" onClick={onCancel} className="rounded-xl">
                        Annuler
                    </Button>
                )}
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-xl gap-2 font-bold px-6 bg-gradient-to-r from-primary to-orange-400 hover:shadow-lg text-white"
                >
                    {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Enregistrer cet Avatar
                </Button>
            </div>

        </div>
    );
}
