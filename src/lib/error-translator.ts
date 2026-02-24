/* eslint-disable @typescript-eslint/no-explicit-any */
export function translateError(error: any): string {
    if (!error) return "Une erreur inconnue est survenue.";

    const message = typeof error === 'string' ? error : (error.message || error.error_description || '');

    // Auth Errors
    if (message.includes('Invalid login credentials')) {
        return "Email ou mot de passe incorrect.";
    }
    if (message.includes('User already registered') || message.includes('already registered')) {
        return "Un compte existe déjà avec cette adresse email.";
    }
    if (message.includes('Password should be at least')) {
        return "Le mot de passe est trop court.";
    }
    if (message.includes('Email link is invalid or has expired')) {
        return "Le lien d'authentification est invalide ou a expiré.";
    }

    // Network & Session
    if (message.includes('Failed to fetch')) {
        return "Erreur réseau. Vérifiez votre connexion internet.";
    }
    if (message.includes('JWT') || message.includes('token is expired')) {
        return "Votre session a expiré. Veuillez vous reconnecter.";
    }

    // Database / RLS
    if (message.includes('row-level security policy') || message.includes('RLS')) {
        return "Vous n'avez pas les droits nécessaires pour effectuer cette action.";
    }
    if (message.includes('duplicate key value')) {
        return "Une donnée identique existe déjà (ex: paramètre doublonné).";
    }
    if (message.includes('violates foreign key constraint')) {
        return "Impossible de supprimer cet élément car il est utilisé ailleurs.";
    }

    // Fallback
    return message ? `Erreur : ${message}` : "Une erreur inattendue est survenue. Veuillez réessayer.";
}
