import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { AppLogo } from '@/components/ui/AppLogo';
import { Mail, User, ArrowRight, ArrowLeft, Loader2, Check, Shield, Zap, Clock, Sparkles, Star } from 'lucide-react';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { translateError } from '@/lib/error-translator';

const emailSchema = z.string().email('Email invalide');
const passwordSchema = z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères');

const features = [
  { icon: Zap, text: 'Pilotage TVA intelligent' },
  { icon: Clock, text: 'Suivi temps & rentabilité' },
  { icon: Shield, text: 'Données sécurisées & RGPD' },
  { icon: Check, text: 'Révision & supervision' },
];

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const { signIn, signUp, user } = useAuth();
  const { colorTheme } = useTheme();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  // Handle overscroll background color
  useEffect(() => {
    document.body.classList.add('bg-foreground');
    return () => {
      document.body.classList.remove('bg-foreground');
    };
  }, []);

  useEffect(() => {
    if (!user) {
      const root = document.documentElement;
      const classes = Array.from(root.classList);
      classes.filter(c => c.startsWith('theme-')).forEach(c => root.classList.remove(c));
      root.classList.add('theme-orange');

      return () => {
        const root = document.documentElement;
        const classes = Array.from(root.classList);
        classes.filter(c => c.startsWith('theme-')).forEach(c => root.classList.remove(c));
        root.classList.add(`theme-${colorTheme}`);
      };
    }
  }, [user, colorTheme]);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) newErrors.email = emailResult.error.errors[0].message;
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) newErrors.password = passwordResult.error.errors[0].message;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            title: "Erreur de connexion",
            description: translateError(error),
            variant: "destructive",
          });
        } else {
          toast({ title: "Bienvenue !", description: "Connexion réussie." });
        }
      } else {
        const { data, error } = await signUp(email, password, fullName);
        if (error) {
          toast({ title: "Erreur", description: translateError(error), variant: "destructive" });
          if (error.message.includes('already registered')) {
            setIsLogin(true);
          }
        } else {
          if (data?.session) {
            toast({ title: "Compte créé !", description: "Bienvenue sur APPMATO." });
          } else {
            toast({
              title: "Compte créé !",
              description: "Veuillez vous connecter. (Modifiez vos réglages Supabase si cela bloque)."
            });
            setIsLogin(true);
            setErrors({});
          }
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-foreground text-background">
      {/* Animated background - Glowing Orbs type Airbnb */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 -translate-y-1/4 -translate-x-1/4 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-0 translate-y-1/4 translate-x-1/4 w-[800px] h-[800px] bg-blue-500/20 rounded-full blur-[100px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_60%,transparent_100%)] text-background/10" />
      </div>

      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        asChild
        className="absolute top-6 left-6 z-50 rounded-full gap-2 bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 text-background"
      >
        <Link to="/">
          <ArrowLeft className="w-4 h-4" /> Retour
        </Link>
      </Button>

      {/* Left Panel - Branding */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="hidden lg:flex lg:w-[55%] relative z-10 flex-col justify-between p-12 xl:p-16"
      >
        {/* Force logo text to be white but keep the orange icon */}
        <div className="[&_h1]:!text-white [&_p]:!text-white/70">
          <AppLogo size="lg" showSubtext />
        </div>

        <div className="space-y-10 max-w-xl">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 text-background/90 font-medium mb-10 border border-white/10 backdrop-blur-sm shadow-xl">
              <Sparkles className="w-5 h-5 text-primary" />
              <span>La solution n°1 des cabinets agiles</span>
            </div>

            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.7 }}
              className="text-5xl xl:text-[4rem] font-extrabold leading-[1.05] tracking-tight text-background"
            >
              Pilotez votre
              <motion.span
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.7 }}
                className="block mt-2 text-primary"
              >
                production comptable
              </motion.span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.6 }}
              className="text-background/80 mt-6 text-xl leading-relaxed"
            >
              TVA, Bilans, Suivi du temps — tout en un seul endroit.
              Simplifiez votre quotidien.
            </motion.p>
          </div>

          {/* Features list */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1, duration: 0.6 }}
            className="grid grid-cols-2 gap-4"
          >
            {features.map((feat, i) => (
              <motion.div
                key={feat.text}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.2 + i * 0.1, duration: 0.4 }}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm"
              >
                <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <feat.icon className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-medium text-background">{feat.text}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Social Proof (Avatars) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.6 }}
            className="flex items-center gap-4 mt-8 pt-8 border-t border-white/10"
          >
            <div className="flex -space-x-3">
              {['JD', 'ML', 'TD', 'SR'].map((initials, i) => (
                <div key={i} className={cn("w-10 h-10 rounded-full border-2 border-foreground overflow-hidden flex items-center justify-center text-xs font-bold shadow-lg", ['bg-blue-600', 'bg-emerald-600', 'bg-amber-600', 'bg-purple-600'][i])}>
                  <span className="text-white">{initials}</span>
                </div>
              ))}
            </div>
            <div className="text-left text-sm text-background/80">
              <div className="flex items-center gap-1 text-yellow-500 mb-0.5">
                {[1, 2, 3, 4, 5].map((s) => <Star key={s} className="w-4 h-4 fill-current" />)}
              </div>
              <p className="text-background/60">Rejoignez <span className="text-white font-bold">+500 cabinets</span></p>
            </div>
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6 }}
          className="text-background/50 text-sm"
        >
          © 2026 APPMATO. Tous droits réservés.
        </motion.p>
      </motion.div>

      {/* Right Panel - Auth Form */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-6 lg:p-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="w-full max-w-md"
        >
          {/* Glass Card */}
          <div className="relative">
            {/* Glow effect behind card */}
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-blue-500/30 rounded-[2rem] blur-xl opacity-50" />

            <div className="relative bg-background/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 lg:p-10 shadow-2xl">
              {/* Mobile Logo */}
              <div className="lg:hidden flex justify-center mb-8 [&_h1]:!text-white [&_p]:!text-white/70">
                <AppLogo size="lg" showSubtext />
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={isLogin ? 'login' : 'signup'}
                  initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="text-center mb-8">
                    <h2 className="text-3xl font-extrabold text-background tracking-tight">
                      {isLogin ? 'Connexion' : 'Créer un compte'}
                    </h2>
                    <p className="text-background/70 mt-2 text-base">
                      {isLogin
                        ? 'Accédez à votre espace de travail'
                        : 'Commencez à organiser vos dossiers'}
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <AnimatePresence>
                      {!isLogin && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-2 pb-1">
                            <Label htmlFor="fullName" className="text-sm font-medium">
                              Nom complet
                            </Label>
                            <div className="relative">
                              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input
                                id="fullName"
                                type="text"
                                placeholder="Votre nom"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="input-premium pl-11"
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium text-background/90">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-background/50" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="vous@exemple.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-11 h-12 rounded-xl !bg-white/5 !border-white/20 !text-white placeholder:!text-white/40 focus:!border-primary focus:!ring-primary/50 shadow-sm transition-colors [&:-webkit-autofill]:[-webkit-text-fill-color:white] [&:-webkit-autofill]:[transition:background-color_5000s_ease-in-out_0s]"
                        />
                      </div>
                      {errors.email && (
                        <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-destructive text-sm font-medium">
                          {errors.email}
                        </motion.p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-medium text-background/90">Mot de passe</Label>
                      <PasswordInput
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-12 rounded-xl !bg-white/5 !border-white/20 !text-white focus:!border-primary focus:!ring-primary/50 shadow-sm transition-colors [&:-webkit-autofill]:[-webkit-text-fill-color:white] [&:-webkit-autofill]:[transition:background-color_5000s_ease-in-out_0s] [&_button]:text-white/50 hover:[&_button]:text-white"
                      />
                      {errors.password && (
                        <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-destructive text-sm font-medium">
                          {errors.password}
                        </motion.p>
                      )}
                    </div>

                    <motion.div whileTap={{ scale: 0.98 }}>
                      <Button type="submit" disabled={isLoading} className="w-full mt-2 h-12 rounded-xl text-base font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl shadow-primary/20">
                        {isLoading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            {isLogin ? 'Se connecter' : 'Créer le compte'}
                            <ArrowRight className="w-5 h-5 ml-2" />
                          </>
                        )}
                      </Button>
                    </motion.div>
                  </form>

                  <div className="mt-6 text-center">
                    <button
                      type="button"
                      onClick={() => { setIsLogin(!isLogin); setErrors({}); }}
                      className="text-background/70 hover:text-white transition-colors text-sm group"
                    >
                      {isLogin
                        ? <>Pas encore de compte ? <span className="text-primary font-bold group-hover:underline">Créez-en un</span></>
                        : <>Déjà un compte ? <span className="text-primary font-bold group-hover:underline">Connectez-vous</span></>}
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Trust indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="flex items-center justify-center gap-4 mt-8"
          >
            {['Sécurisé', 'Chiffré', 'RGPD'].map((label) => (
              <div key={label} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-xs font-medium text-background/80">{label}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
