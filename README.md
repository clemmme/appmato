# Appmatogest — ERP Cabinet d'Expertise Comptable

Ce projet est une application web sur-mesure (type ERP) conçue pour la gestion d'un cabinet d'expertise comptable, incluant le suivi de production, la rentabilité temporelle (live-timer), et un découpage hermétique des données entre collaborateurs (via une architecture "Multi-Tenant" par cabinet).

---

## 🏗️ 1. Architecture Technique (Stack)

L'application repose sur des technologies modernes, rapides et orientées "Serverless" :

* **Frontend (UI) :**
  * **React 18** + **Vite** : Moteur de rendu très performant (rechargement à chaud).
  * **TypeScript** : Typage strict du code pour éviter les erreurs silencieuses et gérer les retours complexes.
  * **Tailwind CSS** : Framework utilitaire pour le design (purification native activée pour un CSS très léger).
  * **shadcn/ui** : Bibliothèque de composants accessibles (Modales, Selects, Toasts, etc.) basée sur Radix UI.
  * **Recharts & Framer Motion** : Utilisés respectivement pour les graphiques analytiques (Dashboard, Temps) et les micro-animations fluides de l'interface.

* **Backend as a Service (BaaS) :**
  * **Supabase** (Self-Hosted via Docker sur Google Cloud Platform). Gère la base de données PostgreSQL, l'Authentification (Auth), et l'API native (PostgREST).

---

## 🛠️ 2. Fonctionnalités Métier Implémentées

Le système a été conçu en **Phases successives** (de 0 à 9). Voici ce qu'il embarque sous le capot :

* **Supervision Multi-Cabinets (Isolation RLS)** : 
  Un utilisateur peut être "Solo" ou rattaché à un "Cabinet" (Gérant, Chef de mission, Collaborateur). Le moteur SQL (Row Level Security) assure qu'**aucune donnée ne peut fuiter d'un cabinet à l'autre**.
* **Fiche Client 360°** :
  Vue détaillée d'un dossier avec historiques dynamiques de TVA, Bilan annuel, honoraires, contacts (Appel/Mail), notes et export CSV de la base.
* **Moteur de Temps (Live Timer) & Rentabilité** :
  Un chronomètre persistant flotte en bas de l'application permettant aux collaborateurs de tracker leurs actions via un type de mission (Bilan, Conseil, Saisie...). Le forfait client est automatiquement mis en relation avec le temps produit pour calculer le **taux horaire effectif**.
* **Dashboard & Graphiques** :
  Météo des dossiers en retard, entonnoir (Funnel Chart) de la production comptable, et camembert (Pie Chart) d'allocation du temps.
* **Production par Module** :
  Vue Kanban (Bilan), vues en liste dynamiques (TVA), gestion de dates butoirs et exports de synthèse en PDF directement depuis le navigateur.
* **Agenda Partagé & Invitations** :
  Possibilité de caler des réunions de passation de dossiers dans l'agenda avec validation "Accepter/Refuser" d'un manager.

---

## ☁️ 3. Configuration Serveur (Google Cloud Platform & Supabase)

L'application backend n'est pas hébergée sur le cloud mutualisé de Supabase, mais **auto-hébergée (Self-hosted)** sur votre propre machine virtuelle Google Cloud (GCP) pour garantir la souveraineté complète des données financières.

### Configuration GCP
* **Machine Virtuelle** : Instance Compute Engine (Ubuntu).
* **Réseau** : Réservation d'une adresse **IP Externe Fixe (Statique)** (`104.155.45.64`), ce qui garantit que l'URL d'API `http://104.155.45.64:8000` ne change jamais à chaque redémarrage de la machine.
* **Architecture Docker** : Supabase tourne via `docker-compose`. Les différents conteneurs (Studio, Auth, REST, Postgres) orchestrent la base de données. 

### Sécurité & Auth (Bypass Email)
Le serveur d'envoi d'emails (SMTP) de Supabase n'étant pas configuré pour la production globale (rate-limits), une modification lourde a été appliquée via les variables d'environnement docker (`.env` du serveur proxy) :
```env
ENABLE_EMAIL_AUTOCONFIRM=true
ENABLE_PHONE_AUTOCONFIRM=true
```
Cela permet la création de compte instantanée sans attendre de lien de validation bidon, évitant l'erreur `Email link is invalid or has expired`. 

---

## 👨‍🔧 4. Guide de Maintenance Quotidienne

### Relancer le projet Frontend (UI)
Si le navigateur local (ordinateur de C. Amato) plante ou nécessite un redémarrage, ouvrez le Terminal dans le dossier `appmatogest-main` et lancez simplement :
```bash
npm run dev
```
L'URL locale s'affichera alors : `http://localhost:8080` (généralement).

### Travailler sur la Base de Données (Studio)
Le back-end possède son interface visuelle d'administration (Supabase Studio) hébergée sur la machine GCP.
**URL d'accès** : `http://104.155.45.64:3000` *(Login et mot de passe de l'instance GCP)*

### Résoudre une erreur Cloud / API
Si l'application tourne en rond au chargement (`Connexion réseau échouée`) :
1. Connectez-vous sur la console Google Cloud.
2. Allez dans **Compute Engine > Instances de VM**.
3. Vérifiez que la machine tourne (logo vert). Lancez le Shell SSH si nécessaire et exécutez un redémarrage manuel du moteur Docker :
   ```bash
   cd supabase/docker
   docker-compose down
   docker-compose up -d
   ```

### Gérer les Politiques de Sécurité (RLS)
Des scripts SQL critiques ont été générés lors du développement (ex: `audit_rls_hardening.sql`, `fix_calendar_guests.sql`). 
S'il est nécessaire de refondre les accès de l'équipe un jour, il suffit de copier le contenu de ces scripts et de les exécuter dans le **SQL Editor** du Studio Supabase (au lien HTTP mentionné plus haut). 

---
*Fin du document généré à la clôture du sprint de développement.*
