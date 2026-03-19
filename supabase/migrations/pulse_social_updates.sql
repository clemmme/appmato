-- Add parent_id for comment replies
ALTER TABLE public.pulse_comments 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.pulse_comments(id) ON DELETE CASCADE;

-- Add mentions support for posts
ALTER TABLE public.pulse_posts 
ADD COLUMN IF NOT EXISTS mentions UUID[] DEFAULT '{}';

-- Add mentions support for comments
ALTER TABLE public.pulse_comments 
ADD COLUMN IF NOT EXISTS mentions UUID[] DEFAULT '{}';

-- Create an index for parent_id to speed up reply fetching
CREATE INDEX IF NOT EXISTS idx_pulse_comments_parent_id ON public.pulse_comments(parent_id);
