-- Table: favorite_clients
CREATE TABLE public.favorite_clients (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE(user_id, client_id)
);

-- RLS
ALTER TABLE public.favorite_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rls_favorite_clients_select" ON public.favorite_clients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "rls_favorite_clients_insert" ON public.favorite_clients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rls_favorite_clients_delete" ON public.favorite_clients FOR DELETE USING (auth.uid() = user_id);
