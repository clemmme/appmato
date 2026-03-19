-- Instructions pour ajouter la colonne avatar_url
-- Copiez et collez ce script dans le SQL Editor de votre projet Supabase
-- (https://supabase.com/dashboard/project/_/sql)

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Pour indiquer à Supabase et à l'API de mettre à jour le cache :
NOTIFY pgrst, 'reload schema';
