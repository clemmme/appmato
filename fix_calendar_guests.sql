-- Migration : Prise de RDV et invitations entre collaborateurs (Agenda Partagé)

-- 1. Ajout des colonnes pour gérer les invitations
ALTER TABLE public.time_entries 
ADD COLUMN IF NOT EXISTS guest_id uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS guest_status text CHECK (guest_status IN ('pending', 'accepted', 'declined'));

-- 2. Ajout de politiques RLS pour permettre à l'invité de voir et d'accepter l'événement
-- Note : Les politiques sont additives. Celles-ci s'ajoutent à la politique existante (user_id = auth.uid())

CREATE POLICY "Les utilisateurs voient les événements où ils sont invités"
ON public.time_entries
FOR SELECT
TO authenticated
USING (guest_id = auth.uid());

CREATE POLICY "Les invités peuvent mettre à jour leur statut"
ON public.time_entries
FOR UPDATE
TO authenticated
USING (guest_id = auth.uid())
WITH CHECK (guest_id = auth.uid());
