
-- Extend profiles with social fields
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS banner_url text,
  ADD COLUMN IF NOT EXISTS follower_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS following_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS post_count integer NOT NULL DEFAULT 0;

-- ============ SOCIAL FOLLOWS ============
CREATE TABLE IF NOT EXISTS public.social_follows (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);
ALTER TABLE public.social_follows ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_follows' AND policyname = 'Anyone can view follows') THEN
    CREATE POLICY "Anyone can view follows" ON public.social_follows FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_follows' AND policyname = 'Users can follow') THEN
    CREATE POLICY "Users can follow" ON public.social_follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_follows' AND policyname = 'Users can unfollow') THEN
    CREATE POLICY "Users can unfollow" ON public.social_follows FOR DELETE USING (auth.uid() = follower_id);
  END IF;
END $$;

-- ============ FOLLOW REQUESTS ============
CREATE TABLE IF NOT EXISTS public.follow_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id uuid NOT NULL,
  target_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(requester_id, target_id)
);
ALTER TABLE public.follow_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'follow_requests' AND policyname = 'Users can see their own requests') THEN
    CREATE POLICY "Users can see their own requests" ON public.follow_requests FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = target_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'follow_requests' AND policyname = 'Users can send requests') THEN
    CREATE POLICY "Users can send requests" ON public.follow_requests FOR INSERT WITH CHECK (auth.uid() = requester_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'follow_requests' AND policyname = 'Target can update requests') THEN
    CREATE POLICY "Target can update requests" ON public.follow_requests FOR UPDATE USING (auth.uid() = target_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'follow_requests' AND policyname = 'Users can delete own requests') THEN
    CREATE POLICY "Users can delete own requests" ON public.follow_requests FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = target_id);
  END IF;
END $$;

-- ============ USER POSTS (social feed posts) ============
CREATE TABLE public.user_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  caption text,
  media_url text,
  media_type text DEFAULT 'image',
  visibility text NOT NULL DEFAULT 'public',
  like_count integer NOT NULL DEFAULT 0,
  comment_count integer NOT NULL DEFAULT 0,
  save_count integer NOT NULL DEFAULT 0,
  hashtags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public posts visible to all" ON public.user_posts FOR SELECT USING (
  visibility = 'public' 
  OR user_id = auth.uid()
  OR (visibility = 'followers' AND EXISTS (SELECT 1 FROM social_follows WHERE follower_id = auth.uid() AND following_id = user_posts.user_id))
);
CREATE POLICY "Users can create posts" ON public.user_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON public.user_posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON public.user_posts FOR DELETE USING (auth.uid() = user_id);

-- ============ POST LIKES ============
CREATE TABLE public.post_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  post_id uuid NOT NULL REFERENCES public.user_posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id)
);
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view post likes" ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "Users can like posts" ON public.post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike posts" ON public.post_likes FOR DELETE USING (auth.uid() = user_id);

-- ============ POST COMMENTS ============
CREATE TABLE public.post_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.user_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  parent_id uuid REFERENCES public.post_comments(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view post comments" ON public.post_comments FOR SELECT USING (true);
CREATE POLICY "Users can add comments" ON public.post_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can edit own comments" ON public.post_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.post_comments FOR DELETE USING (auth.uid() = user_id);

-- ============ POST SAVES ============
CREATE TABLE public.post_saves (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  post_id uuid NOT NULL REFERENCES public.user_posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id)
);
ALTER TABLE public.post_saves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saves" ON public.post_saves FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can save posts" ON public.post_saves FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unsave posts" ON public.post_saves FOR DELETE USING (auth.uid() = user_id);

-- ============ SOCIAL NOTIFICATIONS ============
CREATE TABLE public.social_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  type text NOT NULL,
  entity_id uuid,
  entity_type text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.social_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.social_notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Authenticated can insert notifications" ON public.social_notifications FOR INSERT WITH CHECK (auth.uid() = actor_id);
CREATE POLICY "Users can update own notifications" ON public.social_notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notifications" ON public.social_notifications FOR DELETE USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.social_notifications;

-- ============ USER RANKS ============
CREATE TABLE public.user_ranks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  xp integer NOT NULL DEFAULT 0,
  rank_tier text NOT NULL DEFAULT 'metal',
  points_balance integer NOT NULL DEFAULT 0,
  daily_login_streak integer NOT NULL DEFAULT 0,
  last_daily_login date,
  profile_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_ranks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view ranks" ON public.user_ranks FOR SELECT USING (true);
CREATE POLICY "Users can update own rank" ON public.user_ranks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own rank" ON public.user_ranks FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Rank progression trigger
CREATE OR REPLACE FUNCTION public.check_rank_progression() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  new_tier text;
  old_tier text;
  bonus integer := 0;
BEGIN
  old_tier := OLD.rank_tier;
  IF NEW.xp >= 5000 THEN new_tier := 'legend';
  ELSIF NEW.xp >= 2000 THEN new_tier := 'diamond';
  ELSIF NEW.xp >= 1000 THEN new_tier := 'platinum';
  ELSIF NEW.xp >= 600 THEN new_tier := 'gold';
  ELSIF NEW.xp >= 300 THEN new_tier := 'silver';
  ELSIF NEW.xp >= 100 THEN new_tier := 'bronze';
  ELSE new_tier := 'metal';
  END IF;
  IF new_tier != old_tier THEN
    CASE new_tier
      WHEN 'bronze' THEN bonus := 50;
      WHEN 'silver' THEN bonus := 100;
      WHEN 'gold' THEN bonus := 200;
      WHEN 'platinum' THEN bonus := 500;
      WHEN 'diamond' THEN bonus := 1000;
      WHEN 'legend' THEN bonus := 2500;
      ELSE bonus := 0;
    END CASE;
    NEW.points_balance := NEW.points_balance + bonus;
  END IF;
  NEW.rank_tier := new_tier;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_rank_progression BEFORE UPDATE ON public.user_ranks
FOR EACH ROW EXECUTE FUNCTION public.check_rank_progression();

-- Auto-create rank for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_rank() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.user_ranks (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_new_user_rank AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_rank();

-- Triggers for post/like/comment counts + XP
CREATE OR REPLACE FUNCTION public.update_follow_counts() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET follower_count = follower_count + 1 WHERE user_id = NEW.following_id;
    UPDATE profiles SET following_count = following_count + 1 WHERE user_id = NEW.follower_id;
    UPDATE user_ranks SET xp = xp + 10 WHERE user_id = NEW.following_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET follower_count = GREATEST(follower_count - 1, 0) WHERE user_id = OLD.following_id;
    UPDATE profiles SET following_count = GREATEST(following_count - 1, 0) WHERE user_id = OLD.follower_id;
    RETURN OLD;
  END IF;
END;
$$;

CREATE TRIGGER trg_follow_counts AFTER INSERT OR DELETE ON public.social_follows
FOR EACH ROW EXECUTE FUNCTION public.update_follow_counts();

CREATE OR REPLACE FUNCTION public.update_user_post_count() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET post_count = post_count + 1 WHERE user_id = NEW.user_id;
    UPDATE user_ranks SET xp = xp + 25 WHERE user_id = NEW.user_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET post_count = GREATEST(post_count - 1, 0) WHERE user_id = OLD.user_id;
    RETURN OLD;
  END IF;
END;
$$;

CREATE TRIGGER trg_user_post_count AFTER INSERT OR DELETE ON public.user_posts
FOR EACH ROW EXECUTE FUNCTION public.update_user_post_count();

CREATE OR REPLACE FUNCTION public.update_post_like_count() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE user_posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
    UPDATE user_ranks SET xp = xp + 2 WHERE user_id = (SELECT user_id FROM user_posts WHERE id = NEW.post_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE user_posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$;

CREATE TRIGGER trg_post_like_count AFTER INSERT OR DELETE ON public.post_likes
FOR EACH ROW EXECUTE FUNCTION public.update_post_like_count();

CREATE OR REPLACE FUNCTION public.update_post_comment_count() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE user_posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    UPDATE user_ranks SET xp = xp + 5 WHERE user_id = (SELECT user_id FROM user_posts WHERE id = NEW.post_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE user_posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$;

CREATE TRIGGER trg_post_comment_count AFTER INSERT OR DELETE ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.update_post_comment_count();

CREATE OR REPLACE FUNCTION public.update_post_save_count() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE user_posts SET save_count = save_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE user_posts SET save_count = GREATEST(save_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$;

CREATE TRIGGER trg_post_save_count AFTER INSERT OR DELETE ON public.post_saves
FOR EACH ROW EXECUTE FUNCTION public.update_post_save_count();

-- ============ USER BLOCKS ============
CREATE TABLE public.user_blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own blocks" ON public.user_blocks FOR SELECT USING (auth.uid() = blocker_id);
CREATE POLICY "Users can block" ON public.user_blocks FOR INSERT WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "Users can unblock" ON public.user_blocks FOR DELETE USING (auth.uid() = blocker_id);

-- ============ USER REPORTS ============
CREATE TABLE public.user_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id uuid NOT NULL,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  reason text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can submit reports" ON public.user_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Users can view own reports" ON public.user_reports FOR SELECT USING (auth.uid() = reporter_id OR is_admin(auth.uid()));
CREATE POLICY "Admins can update reports" ON public.user_reports FOR UPDATE USING (is_admin(auth.uid()));

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_social_follows_follower ON public.social_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_social_follows_following ON public.social_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_user_posts_user ON public.user_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_posts_created ON public.user_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_likes_post ON public.post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user ON public.post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON public.post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_social_notifications_user ON public.social_notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_user_ranks_xp ON public.user_ranks(xp DESC);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON public.user_blocks(blocker_id);

-- Storage bucket for social media uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('social-media', 'social-media', true) ON CONFLICT DO NOTHING;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Anyone can view social media') THEN
    CREATE POLICY "Anyone can view social media" ON storage.objects FOR SELECT USING (bucket_id = 'social-media');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Authenticated users can upload social media') THEN
    CREATE POLICY "Authenticated users can upload social media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'social-media' AND auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users can delete own social media') THEN
    CREATE POLICY "Users can delete own social media" ON storage.objects FOR DELETE USING (bucket_id = 'social-media' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;
