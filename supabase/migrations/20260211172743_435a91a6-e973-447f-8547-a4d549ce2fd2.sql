
-- Social media scheduled posts
CREATE TABLE public.social_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES public.managed_accounts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL DEFAULT 'instagram', -- instagram, tiktok
  post_type TEXT NOT NULL DEFAULT 'feed', -- feed, reel, story, carousel, tiktok_video
  caption TEXT,
  hashtags TEXT[],
  media_urls JSONB,
  thumbnail_url TEXT,
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  platform_post_id TEXT, -- ID returned by platform after publishing
  status TEXT NOT NULL DEFAULT 'draft', -- draft, scheduled, publishing, published, failed
  error_message TEXT,
  engagement_data JSONB, -- likes, comments, shares, views etc
  auto_reply_enabled BOOLEAN DEFAULT false,
  auto_reply_message TEXT,
  redirect_url TEXT, -- OF link for traffic redirection
  metadata JSONB,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bio link entries
CREATE TABLE public.bio_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES public.managed_accounts(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE, -- URL slug e.g. /link/username
  title TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  theme TEXT DEFAULT 'dark', -- dark, light, gradient, custom
  background_color TEXT,
  links JSONB NOT NULL DEFAULT '[]', -- array of {title, url, icon, enabled, clicks}
  of_link TEXT, -- primary OF redirect link
  social_links JSONB, -- IG, TikTok, Twitter handles
  is_active BOOLEAN DEFAULT true,
  custom_css TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bio link click tracking
CREATE TABLE public.bio_link_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bio_link_id UUID REFERENCES public.bio_links(id) ON DELETE CASCADE NOT NULL,
  link_index INTEGER, -- which link was clicked (null = page view)
  link_url TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_hash TEXT, -- hashed IP for unique visitor tracking
  country TEXT,
  device_type TEXT, -- mobile, desktop, tablet
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Social media analytics cache
CREATE TABLE public.social_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES public.managed_accounts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  metric_type TEXT NOT NULL, -- followers, engagement_rate, impressions, reach, profile_views
  metric_value NUMERIC,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  raw_data JSONB,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Social platform connections (tokens per account)
CREATE TABLE public.social_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES public.managed_accounts(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL, -- instagram, tiktok
  platform_user_id TEXT,
  platform_username TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[],
  is_connected BOOLEAN DEFAULT true,
  metadata JSONB,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(account_id, platform)
);

-- Comment auto-replies tracking
CREATE TABLE public.social_comment_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES public.managed_accounts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  post_id TEXT NOT NULL,
  comment_id TEXT NOT NULL,
  comment_text TEXT,
  comment_author TEXT,
  reply_text TEXT NOT NULL,
  reply_sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending', -- pending, sent, failed
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bio_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bio_link_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_comment_replies ENABLE ROW LEVEL SECURITY;

-- Admin-only policies for management tables
CREATE POLICY "Admins can manage social_posts" ON public.social_posts FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage bio_links" ON public.bio_links FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage social_analytics" ON public.social_analytics FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage social_connections" ON public.social_connections FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage social_comment_replies" ON public.social_comment_replies FOR ALL USING (public.is_admin(auth.uid()));

-- Public read for bio link clicks (tracking from public page)
CREATE POLICY "Anyone can insert bio_link_clicks" ON public.bio_link_clicks FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can read bio_link_clicks" ON public.bio_link_clicks FOR SELECT USING (public.is_admin(auth.uid()));

-- Public read for active bio links (public page needs to display them)
CREATE POLICY "Anyone can read active bio_links" ON public.bio_links FOR SELECT USING (is_active = true);

-- Triggers for updated_at
CREATE TRIGGER update_social_posts_updated_at BEFORE UPDATE ON public.social_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bio_links_updated_at BEFORE UPDATE ON public.bio_links FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_social_connections_updated_at BEFORE UPDATE ON public.social_connections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_social_posts_account_platform ON public.social_posts(account_id, platform);
CREATE INDEX idx_social_posts_status ON public.social_posts(status);
CREATE INDEX idx_social_posts_scheduled ON public.social_posts(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX idx_bio_links_slug ON public.bio_links(slug);
CREATE INDEX idx_bio_link_clicks_bio_link ON public.bio_link_clicks(bio_link_id);
CREATE INDEX idx_bio_link_clicks_created ON public.bio_link_clicks(created_at);
CREATE INDEX idx_social_analytics_account ON public.social_analytics(account_id, platform, metric_type);
CREATE INDEX idx_social_connections_account ON public.social_connections(account_id, platform);
