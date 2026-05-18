-- Leaderboard: store each player's latest quiz score on profiles.
-- Run in Supabase SQL Editor if 001_game_schema.sql was already applied.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS latest_marks INTEGER NOT NULL DEFAULT 0
  CHECK (latest_marks >= 0 AND latest_marks <= 30);

UPDATE public.profiles p
SET latest_marks = sub.marks
FROM (
  SELECT DISTINCT ON (user_id) user_id, marks
  FROM public.quiz_runs
  ORDER BY user_id, created_at DESC
) sub
WHERE p.id = sub.user_id;

CREATE OR REPLACE FUNCTION public.get_leaderboard(limit_count integer DEFAULT 10)
RETURNS TABLE(rank integer, username text, best_marks integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (ROW_NUMBER() OVER (ORDER BY p.latest_marks DESC, p.username ASC))::integer AS rank,
         p.username,
         p.latest_marks::integer AS best_marks
  FROM public.profiles p
  WHERE p.latest_marks > 0
  ORDER BY p.latest_marks DESC, p.username ASC
  LIMIT COALESCE(limit_count, 10);
$$;

GRANT EXECUTE ON FUNCTION public.get_leaderboard(integer) TO anon, authenticated;
