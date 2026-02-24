-- ==============================================================================
-- FIX : Clés étrangères pour permettre les jointures Supabase (profile)
-- ==============================================================================

-- 1. Redirection de la clé étrangère de chat_members vers public.profiles
BEGIN;

ALTER TABLE public.chat_members 
  DROP CONSTRAINT IF EXISTS chat_members_user_id_fkey;

ALTER TABLE public.chat_members 
  ADD CONSTRAINT chat_members_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES public.profiles(id) 
  ON DELETE CASCADE;

-- 2. Redirection de la clé étrangère de chat_messages vers public.profiles
ALTER TABLE public.chat_messages 
  DROP CONSTRAINT IF EXISTS chat_messages_sender_id_fkey;

ALTER TABLE public.chat_messages 
  ADD CONSTRAINT chat_messages_sender_id_fkey 
  FOREIGN KEY (sender_id) 
  REFERENCES public.profiles(id) 
  ON DELETE CASCADE;

COMMIT;
