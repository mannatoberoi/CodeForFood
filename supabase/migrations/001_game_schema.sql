-- Code For Food — Supabase schema for profiles, quiz runs, rewards, leaderboard.
-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query) after creating a project.
--
-- Security note: user passwords are NEVER stored in these tables. Supabase Auth keeps
-- emails and password hashes in auth.users. This file only adds app data tied to auth.users.id.

-- ---------------------------------------------------------------------------
-- Profiles (one row per auth user; leaderboard display name)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email TEXT NOT NULL DEFAULT '',
  username TEXT NOT NULL DEFAULT 'player',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profiles_username_lower ON public.profiles (lower(username));

-- ---------------------------------------------------------------------------
-- Quiz runs (per finished 3-question round: marks, per-question right/wrong, rewards)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quiz_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  marks INTEGER NOT NULL CHECK (marks >= 0 AND marks <= 30),
  correct_count INTEGER NOT NULL CHECK (correct_count >= 0 AND correct_count <= 3),
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  rewards JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quiz_runs_user_created ON public.quiz_runs (user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Rewards collected (deduplicated per user + reward image key)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_rewards (
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  reward_key TEXT NOT NULL,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, reward_key)
);

-- ---------------------------------------------------------------------------
-- New auth user → profile row
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'username'), ''), split_part(COALESCE(NEW.email, 'player'), '@', 1), 'player')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- If the line above errors in your project, try: EXECUTE PROCEDURE public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Leaderboard: best single-quiz marks per user (top N). Callable by anyone.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_leaderboard(limit_count integer DEFAULT 10)
RETURNS TABLE(rank integer, username text, best_marks integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (ROW_NUMBER() OVER (ORDER BY s.best_marks DESC))::integer AS rank,
         s.username,
         s.best_marks::integer
  FROM (
    SELECT p.username AS username,
           MAX(q.marks)::integer AS best_marks
    FROM public.profiles p
    INNER JOIN public.quiz_runs q ON q.user_id = p.id
    GROUP BY p.id, p.username
  ) s
  ORDER BY s.best_marks DESC
  LIMIT COALESCE(limit_count, 10);
$$;

GRANT EXECUTE ON FUNCTION public.get_leaderboard(integer) TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT ON public.quiz_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_rewards TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "quiz_runs_select_own" ON public.quiz_runs;
CREATE POLICY "quiz_runs_select_own"
  ON public.quiz_runs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "quiz_runs_insert_own" ON public.quiz_runs;
CREATE POLICY "quiz_runs_insert_own"
  ON public.quiz_runs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_rewards_select_own" ON public.user_rewards;
CREATE POLICY "user_rewards_select_own"
  ON public.user_rewards FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_rewards_insert_own" ON public.user_rewards;
CREATE POLICY "user_rewards_insert_own"
  ON public.user_rewards FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_rewards_update_own" ON public.user_rewards;
CREATE POLICY "user_rewards_update_own"
  ON public.user_rewards FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
