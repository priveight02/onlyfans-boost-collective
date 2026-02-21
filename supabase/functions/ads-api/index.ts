const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const PLATFORM_URLS: Record<string, string> = {
  facebook_ads: 'https://graph.facebook.com/v24.0',
  instagram_ads: 'https://graph.facebook.com/v24.0',
  google_ads: 'https://googleads.googleapis.com/v23',
  tiktok_ads: 'https://business-api.tiktok.com/open_api/v1.3',
  snapchat_ads: 'https://adsapi.snapchat.com/v1',
  pinterest_ads: 'https://api.pinterest.com/v5',
  x_ads: 'https://ads-api.x.com/12',
  linkedin_ads: 'https://api.linkedin.com/rest',
  youtube_ads: 'https://googleads.googleapis.com/v23',
};

interface AdsRequest {
  platform: string;
  action: string;
  credentials: Record<string, string>;
  data?: Record<string, any>;
  campaign_id?: string;
  adset_id?: string;
  ad_id?: string;
}

// ═══════════════════════════════════════════════
// FACEBOOK / INSTAGRAM ADS
// ═══════════════════════════════════════════════
async function handleFacebookAds(action: string, creds: Record<string, string>, data?: any, campaignId?: string, adsetId?: string, adId?: string) {
  const baseUrl = PLATFORM_URLS.facebook_ads;
  const token = creds.access_token;
  const adAccountId = creds.ad_account_id;

  switch (action) {
    // ── Campaigns ──
    case 'list_campaigns': {
      const url = `${baseUrl}/${adAccountId}/campaigns?fields=id,name,objective,status,daily_budget,lifetime_budget,start_time,stop_time,created_time,updated_time,buying_type,bid_strategy,budget_remaining,special_ad_categories&limit=100&access_token=${token}`;
      const res = await fetch(url);
      return await res.json();
    }
    case 'create_campaign': {
      const url = `${baseUrl}/${adAccountId}/campaigns`;
      const body = new URLSearchParams({
        name: data.name,
        objective: data.objective || 'OUTCOME_TRAFFIC',
        status: data.status || 'PAUSED',
        special_ad_categories: JSON.stringify(data.special_ad_categories || []),
        access_token: token,
      });
      if (data.daily_budget) body.set('daily_budget', String(Math.round(data.daily_budget * 100)));
      if (data.lifetime_budget) body.set('lifetime_budget', String(Math.round(data.lifetime_budget * 100)));
      if (data.bid_strategy) body.set('bid_strategy', data.bid_strategy);
      if (data.buying_type) body.set('buying_type', data.buying_type);
      const res = await fetch(url, { method: 'POST', body });
      return await res.json();
    }
    case 'update_campaign': {
      const url = `${baseUrl}/${campaignId}`;
      const body = new URLSearchParams({ access_token: token });
      if (data.name) body.set('name', data.name);
      if (data.status) body.set('status', data.status);
      if (data.daily_budget) body.set('daily_budget', String(Math.round(data.daily_budget * 100)));
      if (data.lifetime_budget) body.set('lifetime_budget', String(Math.round(data.lifetime_budget * 100)));
      if (data.bid_strategy) body.set('bid_strategy', data.bid_strategy);
      const res = await fetch(url, { method: 'POST', body });
      return await res.json();
    }
    case 'delete_campaign': {
      const url = `${baseUrl}/${campaignId}?access_token=${token}`;
      const res = await fetch(url, { method: 'DELETE' });
      return await res.json();
    }
    case 'get_campaign': {
      const url = `${baseUrl}/${campaignId}?fields=id,name,objective,status,daily_budget,lifetime_budget,start_time,stop_time,created_time,updated_time,buying_type,bid_strategy,budget_remaining&access_token=${token}`;
      const res = await fetch(url);
      return await res.json();
    }
    case 'get_stats': {
      const cid = campaignId || adAccountId;
      const url = `${baseUrl}/${cid}/insights?fields=impressions,clicks,spend,ctr,cpc,cpm,reach,frequency,actions,conversions,cost_per_action_type,video_avg_time_watched_actions&date_preset=last_30d&access_token=${token}`;
      const res = await fetch(url);
      return await res.json();
    }

    // ── Ad Sets ──
    case 'list_adsets': {
      const cid = campaignId || adAccountId;
      const endpoint = campaignId ? `${cid}/adsets` : `${adAccountId}/adsets`;
      const url = `${baseUrl}/${endpoint}?fields=id,name,status,daily_budget,lifetime_budget,targeting,optimization_goal,billing_event,bid_amount,bid_strategy,start_time,end_time,promoted_object,destination_type,attribution_spec,campaign_id&limit=100&access_token=${token}`;
      const res = await fetch(url);
      return await res.json();
    }
    case 'create_adset': {
      const url = `${baseUrl}/${adAccountId}/adsets`;
      const body = new URLSearchParams({
        name: data.name,
        campaign_id: data.campaign_id,
        status: data.status || 'PAUSED',
        daily_budget: String(Math.round((data.daily_budget || 50) * 100)),
        optimization_goal: data.optimization_goal || 'LINK_CLICKS',
        billing_event: data.billing_event || 'IMPRESSIONS',
        targeting: JSON.stringify(data.targeting || { geo_locations: { countries: ['US'] }, age_min: 18, age_max: 65 }),
        access_token: token,
      });
      if (data.bid_amount) body.set('bid_amount', String(Math.round(data.bid_amount * 100)));
      if (data.start_time) body.set('start_time', data.start_time);
      if (data.end_time) body.set('end_time', data.end_time);
      if (data.promoted_object) body.set('promoted_object', JSON.stringify(data.promoted_object));
      if (data.destination_type) body.set('destination_type', data.destination_type);
      const res = await fetch(url, { method: 'POST', body });
      return await res.json();
    }
    case 'update_adset': {
      const url = `${baseUrl}/${adsetId}`;
      const body = new URLSearchParams({ access_token: token });
      if (data.name) body.set('name', data.name);
      if (data.status) body.set('status', data.status);
      if (data.daily_budget) body.set('daily_budget', String(Math.round(data.daily_budget * 100)));
      if (data.targeting) body.set('targeting', JSON.stringify(data.targeting));
      if (data.optimization_goal) body.set('optimization_goal', data.optimization_goal);
      if (data.bid_amount) body.set('bid_amount', String(Math.round(data.bid_amount * 100)));
      const res = await fetch(url, { method: 'POST', body });
      return await res.json();
    }
    case 'delete_adset': {
      const url = `${baseUrl}/${adsetId}?access_token=${token}`;
      const res = await fetch(url, { method: 'DELETE' });
      return await res.json();
    }
    case 'get_adset_stats': {
      const url = `${baseUrl}/${adsetId}/insights?fields=impressions,clicks,spend,ctr,cpc,cpm,reach,frequency,actions,conversions&date_preset=last_30d&access_token=${token}`;
      const res = await fetch(url);
      return await res.json();
    }

    // ── Ads (Creatives) ──
    case 'list_ads': {
      const parent = adsetId || campaignId || adAccountId;
      const endpoint = adsetId ? `${parent}/ads` : campaignId ? `${parent}/ads` : `${adAccountId}/ads`;
      const url = `${baseUrl}/${endpoint}?fields=id,name,status,creative{id,name,title,body,image_url,thumbnail_url,object_story_spec,link_url,call_to_action_type},tracking_specs,conversion_specs,adset_id,campaign_id&limit=100&access_token=${token}`;
      const res = await fetch(url);
      return await res.json();
    }
    case 'create_ad': {
      const url = `${baseUrl}/${adAccountId}/ads`;
      const body = new URLSearchParams({
        name: data.name,
        adset_id: data.adset_id,
        status: data.status || 'PAUSED',
        creative: JSON.stringify(data.creative || { creative_id: data.creative_id }),
        access_token: token,
      });
      if (data.tracking_specs) body.set('tracking_specs', JSON.stringify(data.tracking_specs));
      const res = await fetch(url, { method: 'POST', body });
      return await res.json();
    }
    case 'update_ad': {
      const url = `${baseUrl}/${adId}`;
      const body = new URLSearchParams({ access_token: token });
      if (data.name) body.set('name', data.name);
      if (data.status) body.set('status', data.status);
      if (data.creative) body.set('creative', JSON.stringify(data.creative));
      const res = await fetch(url, { method: 'POST', body });
      return await res.json();
    }
    case 'delete_ad': {
      const url = `${baseUrl}/${adId}?access_token=${token}`;
      const res = await fetch(url, { method: 'DELETE' });
      return await res.json();
    }

    // ── Ad Creatives ──
    case 'list_creatives': {
      const url = `${baseUrl}/${adAccountId}/adcreatives?fields=id,name,title,body,image_url,thumbnail_url,object_story_spec,link_url,call_to_action_type,status,effective_object_story_id&limit=50&access_token=${token}`;
      const res = await fetch(url);
      return await res.json();
    }
    case 'create_creative': {
      const url = `${baseUrl}/${adAccountId}/adcreatives`;
      const body = new URLSearchParams({ access_token: token, name: data.name });
      if (data.object_story_spec) body.set('object_story_spec', JSON.stringify(data.object_story_spec));
      if (data.title) body.set('title', data.title);
      if (data.body) body.set('body', data.body);
      if (data.image_url) body.set('image_url', data.image_url);
      if (data.link_url) body.set('link_url', data.link_url);
      if (data.call_to_action_type) body.set('call_to_action_type', data.call_to_action_type);
      const res = await fetch(url, { method: 'POST', body });
      return await res.json();
    }

    // ── Audiences ──
    case 'list_audiences': {
      const url = `${baseUrl}/${adAccountId}/customaudiences?fields=id,name,description,subtype,approximate_count,data_source,delivery_status,operation_status&limit=100&access_token=${token}`;
      const res = await fetch(url);
      return await res.json();
    }
    case 'create_audience': {
      const url = `${baseUrl}/${adAccountId}/customaudiences`;
      const body = new URLSearchParams({
        name: data.name,
        subtype: data.subtype || 'CUSTOM',
        description: data.description || '',
        customer_file_source: data.customer_file_source || 'USER_PROVIDED_ONLY',
        access_token: token,
      });
      const res = await fetch(url, { method: 'POST', body });
      return await res.json();
    }

    // ── Targeting Search ──
    case 'search_targeting': {
      const url = `${baseUrl}/search?type=adinterest&q=${encodeURIComponent(data.query)}&limit=25&access_token=${token}`;
      const res = await fetch(url);
      return await res.json();
    }
    case 'search_locations': {
      const url = `${baseUrl}/search?type=adgeolocation&q=${encodeURIComponent(data.query)}&location_types=["country","region","city"]&limit=25&access_token=${token}`;
      const res = await fetch(url);
      return await res.json();
    }

    // ── Ad Images ──
    case 'list_images': {
      const url = `${baseUrl}/${adAccountId}/adimages?fields=id,name,url,url_128,width,height,created_time,status&limit=50&access_token=${token}`;
      const res = await fetch(url);
      return await res.json();
    }
    case 'upload_image': {
      const url = `${baseUrl}/${adAccountId}/adimages`;
      const body = new URLSearchParams({ access_token: token, url: data.image_url });
      const res = await fetch(url, { method: 'POST', body });
      return await res.json();
    }

    // ── Pages ──
    case 'list_pages': {
      const url = `${baseUrl}/me/accounts?fields=id,name,picture,category,fan_count&access_token=${token}`;
      const res = await fetch(url);
      return await res.json();
    }

    default:
      return { error: `Unknown Facebook action: ${action}` };
  }
}

// ═══════════════════════════════════════════════
// TIKTOK ADS
// ═══════════════════════════════════════════════
async function handleTikTokAds(action: string, creds: Record<string, string>, data?: any, campaignId?: string, adsetId?: string, adId?: string) {
  const baseUrl = PLATFORM_URLS.tiktok_ads;
  const token = creds.access_token;
  const advertiserId = creds.advertiser_id;
  const headers = { 'Access-Token': token, 'Content-Type': 'application/json' };

  switch (action) {
    case 'list_campaigns': {
      const url = `${baseUrl}/campaign/get/?advertiser_id=${advertiserId}&page_size=100`;
      const res = await fetch(url, { headers });
      return await res.json();
    }
    case 'create_campaign': {
      const res = await fetch(`${baseUrl}/campaign/create/`, {
        method: 'POST', headers,
        body: JSON.stringify({
          advertiser_id: advertiserId, campaign_name: data.name,
          objective_type: data.objective || 'TRAFFIC',
          budget_mode: data.budget_mode || 'BUDGET_MODE_DAY',
          budget: data.daily_budget || 50,
          operation_status: data.status === 'ACTIVE' ? 'ENABLE' : 'DISABLE',
        }),
      });
      return await res.json();
    }
    case 'update_campaign': {
      const body: any = { advertiser_id: advertiserId, campaign_id: campaignId };
      if (data.name) body.campaign_name = data.name;
      if (data.budget) body.budget = data.budget;
      if (data.status) body.operation_status = data.status === 'ACTIVE' ? 'ENABLE' : 'DISABLE';
      const res = await fetch(`${baseUrl}/campaign/update/`, { method: 'POST', headers, body: JSON.stringify(body) });
      return await res.json();
    }
    case 'list_adsets': {
      let url = `${baseUrl}/adgroup/get/?advertiser_id=${advertiserId}&page_size=100`;
      if (campaignId) url += `&filtering={"campaign_ids":["${campaignId}"]}`;
      const res = await fetch(url, { headers });
      return await res.json();
    }
    case 'create_adset': {
      const res = await fetch(`${baseUrl}/adgroup/create/`, {
        method: 'POST', headers,
        body: JSON.stringify({
          advertiser_id: advertiserId, campaign_id: data.campaign_id,
          adgroup_name: data.name, placement_type: 'PLACEMENT_TYPE_AUTOMATIC',
          budget_mode: 'BUDGET_MODE_DAY', budget: data.daily_budget || 50,
          schedule_type: 'SCHEDULE_FROM_NOW',
          optimization_goal: data.optimization_goal || 'CLICK',
          bid_type: 'BID_TYPE_NO_BID',
          billing_event: 'CPC',
          location_ids: data.location_ids || [6252001],
          gender: data.gender || 'GENDER_UNLIMITED',
          age_groups: data.age_groups || ['AGE_18_24', 'AGE_25_34', 'AGE_35_44'],
          operation_status: data.status === 'ACTIVE' ? 'ENABLE' : 'DISABLE',
        }),
      });
      return await res.json();
    }
    case 'update_adset': {
      const body: any = { advertiser_id: advertiserId, adgroup_id: adsetId };
      if (data.name) body.adgroup_name = data.name;
      if (data.daily_budget) body.budget = data.daily_budget;
      if (data.status) body.operation_status = data.status === 'ACTIVE' ? 'ENABLE' : 'DISABLE';
      const res = await fetch(`${baseUrl}/adgroup/update/`, { method: 'POST', headers, body: JSON.stringify(body) });
      return await res.json();
    }
    case 'list_ads': {
      let url = `${baseUrl}/ad/get/?advertiser_id=${advertiserId}&page_size=100`;
      if (adsetId) url += `&filtering={"adgroup_ids":["${adsetId}"]}`;
      else if (campaignId) url += `&filtering={"campaign_ids":["${campaignId}"]}`;
      const res = await fetch(url, { headers });
      return await res.json();
    }
    case 'create_ad': {
      const res = await fetch(`${baseUrl}/ad/create/`, {
        method: 'POST', headers,
        body: JSON.stringify({
          advertiser_id: advertiserId, adgroup_id: data.adset_id,
          creatives: [{ ad_name: data.name, ad_text: data.body || '', image_ids: data.image_ids, call_to_action: data.cta || 'LEARN_MORE', landing_page_url: data.link_url }],
        }),
      });
      return await res.json();
    }
    case 'get_stats': {
      const res = await fetch(`${baseUrl}/report/integrated/get/`, {
        method: 'POST', headers,
        body: JSON.stringify({
          advertiser_id: advertiserId, report_type: 'BASIC',
          data_level: campaignId ? 'AUCTION_CAMPAIGN' : 'AUCTION_ADVERTISER',
          dimensions: campaignId ? ['campaign_id'] : ['stat_time_day'],
          metrics: ['spend', 'impressions', 'clicks', 'ctr', 'cpc', 'reach', 'conversion', 'cost_per_conversion'],
          start_date: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0],
          filtering: campaignId ? [{ field_name: 'campaign_ids', filter_type: 'IN', filter_value: JSON.stringify([campaignId]) }] : undefined,
        }),
      });
      return await res.json();
    }
    default:
      return { error: `Unknown TikTok action: ${action}` };
  }
}

// ═══════════════════════════════════════════════
// SNAPCHAT ADS
// ═══════════════════════════════════════════════
async function handleSnapchatAds(action: string, creds: Record<string, string>, data?: any, campaignId?: string, adsetId?: string, adId?: string) {
  const baseUrl = PLATFORM_URLS.snapchat_ads;
  const token = creds.access_token;
  const adAccountId = creds.ad_account_id;
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  switch (action) {
    case 'list_campaigns': {
      const res = await fetch(`${baseUrl}/adaccounts/${adAccountId}/campaigns`, { headers });
      return await res.json();
    }
    case 'create_campaign': {
      const res = await fetch(`${baseUrl}/adaccounts/${adAccountId}/campaigns`, {
        method: 'POST', headers,
        body: JSON.stringify({ campaigns: [{ name: data.name, ad_account_id: adAccountId, status: data.status || 'PAUSED', start_time: data.start_time || new Date().toISOString(), daily_budget_micro: Math.round((data.daily_budget || 50) * 1000000), buy_model: 'AUCTION' }] }),
      });
      return await res.json();
    }
    case 'update_campaign': {
      const res = await fetch(`${baseUrl}/campaigns/${campaignId}`, {
        method: 'PUT', headers,
        body: JSON.stringify({ campaigns: [{ id: campaignId, name: data.name, status: data.status, daily_budget_micro: data.daily_budget ? Math.round(data.daily_budget * 1000000) : undefined }] }),
      });
      return await res.json();
    }
    case 'list_adsets': {
      const cid = campaignId || adAccountId;
      const endpoint = campaignId ? `campaigns/${cid}/adsquads` : `adaccounts/${adAccountId}/adsquads`;
      const res = await fetch(`${baseUrl}/${endpoint}`, { headers });
      return await res.json();
    }
    case 'create_adset': {
      const res = await fetch(`${baseUrl}/campaigns/${data.campaign_id}/adsquads`, {
        method: 'POST', headers,
        body: JSON.stringify({ adsquads: [{ name: data.name, campaign_id: data.campaign_id, status: data.status || 'PAUSED', type: 'SNAP_ADS', billing_event: 'IMPRESSION', bid_micro: Math.round((data.bid_amount || 5) * 1000000), daily_budget_micro: Math.round((data.daily_budget || 50) * 1000000), optimization_goal: data.optimization_goal || 'IMPRESSIONS', targeting: data.targeting || { geos: [{ country_code: 'us' }] }, start_time: data.start_time || new Date().toISOString() }] }),
      });
      return await res.json();
    }
    case 'list_ads': {
      const parent = adsetId ? `adsquads/${adsetId}` : `adaccounts/${adAccountId}`;
      const res = await fetch(`${baseUrl}/${parent}/ads`, { headers });
      return await res.json();
    }
    case 'get_stats': {
      const cid = campaignId || adAccountId;
      const entityType = campaignId ? 'campaigns' : 'adaccounts';
      const end = new Date().toISOString().split('T')[0];
      const start = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
      const res = await fetch(`${baseUrl}/${entityType}/${cid}/stats?granularity=TOTAL&start_time=${start}T00:00:00.000-00:00&end_time=${end}T00:00:00.000-00:00&fields=impressions,swipes,spend,swipe_up_percent`, { headers });
      return await res.json();
    }
    default:
      return { error: `Unknown Snapchat action: ${action}` };
  }
}

// ═══════════════════════════════════════════════
// PINTEREST ADS
// ═══════════════════════════════════════════════
async function handlePinterestAds(action: string, creds: Record<string, string>, data?: any, campaignId?: string, adsetId?: string, adId?: string) {
  const baseUrl = PLATFORM_URLS.pinterest_ads;
  const token = creds.access_token;
  const adAccountId = creds.ad_account_id;
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  switch (action) {
    case 'list_campaigns': {
      const res = await fetch(`${baseUrl}/ad_accounts/${adAccountId}/campaigns?page_size=100`, { headers });
      return await res.json();
    }
    case 'create_campaign': {
      const res = await fetch(`${baseUrl}/ad_accounts/${adAccountId}/campaigns`, {
        method: 'POST', headers,
        body: JSON.stringify([{ ad_account_id: adAccountId, name: data.name, status: data.status || 'PAUSED', objective_type: data.objective || 'AWARENESS', daily_spend_cap: data.daily_budget ? Math.round(data.daily_budget * 1000000) : undefined, lifetime_spend_cap: data.lifetime_budget ? Math.round(data.lifetime_budget * 1000000) : undefined }]),
      });
      return await res.json();
    }
    case 'update_campaign': {
      const res = await fetch(`${baseUrl}/ad_accounts/${adAccountId}/campaigns`, {
        method: 'PATCH', headers,
        body: JSON.stringify([{ id: campaignId, name: data.name, status: data.status, daily_spend_cap: data.daily_budget ? Math.round(data.daily_budget * 1000000) : undefined }]),
      });
      return await res.json();
    }
    case 'list_adsets': {
      let url = `${baseUrl}/ad_accounts/${adAccountId}/ad_groups?page_size=100`;
      if (campaignId) url += `&campaign_ids=${campaignId}`;
      const res = await fetch(url, { headers });
      return await res.json();
    }
    case 'create_adset': {
      const res = await fetch(`${baseUrl}/ad_accounts/${adAccountId}/ad_groups`, {
        method: 'POST', headers,
        body: JSON.stringify([{ ad_account_id: adAccountId, campaign_id: data.campaign_id, name: data.name, status: data.status || 'PAUSED', budget_in_micro_currency: Math.round((data.daily_budget || 50) * 1000000), budget_type: 'DAILY', bid_in_micro_currency: data.bid_amount ? Math.round(data.bid_amount * 1000000) : undefined, billable_event: 'CLICKTHROUGH', targeting_spec: data.targeting || { GEO: { 1: ['US'] }, AGE_BUCKET: ['18-24', '25-34', '35-44', '45-54'] } }]),
      });
      return await res.json();
    }
    case 'list_ads': {
      let url = `${baseUrl}/ad_accounts/${adAccountId}/ads?page_size=100`;
      if (adsetId) url += `&ad_group_ids=${adsetId}`;
      const res = await fetch(url, { headers });
      return await res.json();
    }
    case 'create_ad': {
      const res = await fetch(`${baseUrl}/ad_accounts/${adAccountId}/ads`, {
        method: 'POST', headers,
        body: JSON.stringify([{ ad_account_id: adAccountId, ad_group_id: data.adset_id, creative_type: 'REGULAR', name: data.name, status: data.status || 'PAUSED', destination_url: data.link_url, tracking_urls: data.tracking_urls }]),
      });
      return await res.json();
    }
    case 'get_stats': {
      const end = new Date().toISOString().split('T')[0];
      const start = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
      const cids = campaignId || '';
      const res = await fetch(`${baseUrl}/ad_accounts/${adAccountId}/campaigns/analytics?start_date=${start}&end_date=${end}&campaign_ids=${cids}&columns=SPEND_IN_DOLLAR,IMPRESSION_1,CLICKTHROUGH_1,CTR_1,CPC_IN_DOLLAR,TOTAL_CONVERSIONS&granularity=TOTAL`, { headers });
      return await res.json();
    }
    default:
      return { error: `Unknown Pinterest action: ${action}` };
  }
}

// ═══════════════════════════════════════════════
// X (TWITTER) ADS
// ═══════════════════════════════════════════════
async function handleXAds(action: string, creds: Record<string, string>, data?: any, campaignId?: string, adsetId?: string, adId?: string) {
  const baseUrl = PLATFORM_URLS.x_ads;
  const token = creds.access_token;
  const adAccountId = creds.ad_account_id;
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  switch (action) {
    case 'list_campaigns': {
      const res = await fetch(`${baseUrl}/accounts/${adAccountId}/campaigns?count=200&with_deleted=false`, { headers });
      return await res.json();
    }
    case 'create_campaign': {
      const res = await fetch(`${baseUrl}/accounts/${adAccountId}/campaigns`, {
        method: 'POST', headers,
        body: JSON.stringify({ name: data.name, funding_instrument_id: data.funding_instrument_id, daily_budget_amount_local_micro: data.daily_budget ? Math.round(data.daily_budget * 1000000) : undefined, entity_status: data.status || 'PAUSED' }),
      });
      return await res.json();
    }
    case 'update_campaign': {
      const res = await fetch(`${baseUrl}/accounts/${adAccountId}/campaigns/${campaignId}`, {
        method: 'PUT', headers,
        body: JSON.stringify({ name: data.name, entity_status: data.status, daily_budget_amount_local_micro: data.daily_budget ? Math.round(data.daily_budget * 1000000) : undefined }),
      });
      return await res.json();
    }
    case 'delete_campaign': {
      const res = await fetch(`${baseUrl}/accounts/${adAccountId}/campaigns/${campaignId}`, { method: 'DELETE', headers });
      return await res.json();
    }
    case 'list_adsets': {
      let url = `${baseUrl}/accounts/${adAccountId}/line_items?count=200&with_deleted=false`;
      if (campaignId) url += `&campaign_ids=${campaignId}`;
      const res = await fetch(url, { headers });
      return await res.json();
    }
    case 'create_adset': {
      const res = await fetch(`${baseUrl}/accounts/${adAccountId}/line_items`, {
        method: 'POST', headers,
        body: JSON.stringify({ campaign_id: data.campaign_id, name: data.name, product_type: 'PROMOTED_TWEETS', placements: ['ALL_ON_TWITTER'], objective: data.optimization_goal || 'WEBSITE_CLICKS', bid_amount_local_micro: data.bid_amount ? Math.round(data.bid_amount * 1000000) : undefined, entity_status: data.status || 'PAUSED' }),
      });
      return await res.json();
    }
    case 'list_ads': {
      let url = `${baseUrl}/accounts/${adAccountId}/promoted_tweets?count=200`;
      if (adsetId) url += `&line_item_ids=${adsetId}`;
      const res = await fetch(url, { headers });
      return await res.json();
    }
    case 'get_stats': {
      const end = new Date().toISOString().split('T')[0];
      const start = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
      const entity = campaignId ? `campaign_ids=${campaignId}` : '';
      const res = await fetch(`${baseUrl}/stats/accounts/${adAccountId}?entity=CAMPAIGN&${entity}&start_time=${start}&end_time=${end}&granularity=TOTAL&metric_groups=ENGAGEMENT,BILLING,VIDEO`, { headers });
      return await res.json();
    }
    default:
      return { error: `Unknown X action: ${action}` };
  }
}

// ═══════════════════════════════════════════════
// LINKEDIN ADS
// ═══════════════════════════════════════════════
async function handleLinkedInAds(action: string, creds: Record<string, string>, data?: any, campaignId?: string, adsetId?: string, adId?: string) {
  const baseUrl = PLATFORM_URLS.linkedin_ads;
  const token = creds.access_token;
  const adAccountId = creds.ad_account_id;
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Restli-Protocol-Version': '2.0.0', 'LinkedIn-Version': '202601' };

  switch (action) {
    case 'list_campaigns': {
      const res = await fetch(`${baseUrl}/adCampaigns?q=search&search=(account:(values:List(urn%3Ali%3AsponsoredAccount%3A${adAccountId})))&count=100`, { headers });
      return await res.json();
    }
    case 'create_campaign': {
      const res = await fetch(`${baseUrl}/adCampaigns`, {
        method: 'POST', headers,
        body: JSON.stringify({ account: `urn:li:sponsoredAccount:${adAccountId}`, name: data.name, type: data.type || 'SPONSORED_UPDATES', costType: data.cost_type || 'CPM', dailyBudget: data.daily_budget ? { amount: String(Math.round(data.daily_budget * 100)), currencyCode: 'USD' } : undefined, status: data.status || 'PAUSED', objectiveType: data.objective || 'BRAND_AWARENESS', locale: { country: 'US', language: 'en' } }),
      });
      return await res.json();
    }
    case 'update_campaign': {
      const res = await fetch(`${baseUrl}/adCampaigns/${campaignId}`, {
        method: 'POST', headers: { ...headers, 'X-RestLi-Method': 'PARTIAL_UPDATE' },
        body: JSON.stringify({ patch: { $set: { ...(data.name && { name: data.name }), ...(data.status && { status: data.status }), ...(data.daily_budget && { dailyBudget: { amount: String(Math.round(data.daily_budget * 100)), currencyCode: 'USD' } }) } } }),
      });
      return { success: res.ok, status: res.status };
    }
    case 'list_ads': {
      let url = `${baseUrl}/adCreatives?q=search`;
      if (campaignId) url += `&search=(campaign:(values:List(urn%3Ali%3AsponsoredCampaign%3A${campaignId})))`;
      url += '&count=100';
      const res = await fetch(url, { headers });
      return await res.json();
    }
    case 'get_stats': {
      const end = new Date().toISOString().split('T')[0];
      const start = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
      const campaignFilter = campaignId ? `campaigns=List(urn%3Ali%3AsponsoredCampaign%3A${campaignId})&` : `accounts=List(urn%3Ali%3AsponsoredAccount%3A${adAccountId})&`;
      const res = await fetch(`${baseUrl}/adAnalytics?q=analytics&${campaignFilter}dateRange=(start:(year:${start.split('-')[0]},month:${parseInt(start.split('-')[1])},day:${parseInt(start.split('-')[2])}),end:(year:${end.split('-')[0]},month:${parseInt(end.split('-')[1])},day:${parseInt(end.split('-')[2])}))&timeGranularity=ALL&fields=impressions,clicks,costInLocalCurrency,externalWebsiteConversions`, { headers });
      return await res.json();
    }
    default:
      return { error: `Unknown LinkedIn action: ${action}` };
  }
}

// ═══════════════════════════════════════════════
// GOOGLE ADS / YOUTUBE ADS
// ═══════════════════════════════════════════════
async function handleGoogleAds(action: string, creds: Record<string, string>, data?: any, campaignId?: string, adsetId?: string, adId?: string) {
  const customerId = creds.customer_id?.replace(/-/g, '');
  const developerToken = creds.developer_token;
  const accessToken = creds.refresh_token;
  const baseUrl = `${PLATFORM_URLS.google_ads}/customers/${customerId}`;
  const headers = { 'Authorization': `Bearer ${accessToken}`, 'developer-token': developerToken, 'Content-Type': 'application/json' };

  switch (action) {
    case 'list_campaigns': {
      const res = await fetch(`${baseUrl}/googleAds:searchStream`, {
        method: 'POST', headers,
        body: JSON.stringify({ query: `SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type, campaign_budget.amount_micros, campaign.start_date, campaign.end_date, campaign.bidding_strategy_type FROM campaign WHERE campaign.status != 'REMOVED' ORDER BY campaign.id` }),
      });
      return await res.json();
    }
    case 'create_campaign': {
      const budgetRes = await fetch(`${baseUrl}/campaignBudgets:mutate`, {
        method: 'POST', headers,
        body: JSON.stringify({ operations: [{ create: { name: `${data.name}_budget_${Date.now()}`, amountMicros: String(Math.round((data.daily_budget || 50) * 1000000)), deliveryMethod: 'STANDARD' } }] }),
      });
      const budgetData = await budgetRes.json();
      const budgetResourceName = budgetData?.results?.[0]?.resourceName;
      const res = await fetch(`${baseUrl}/campaigns:mutate`, {
        method: 'POST', headers,
        body: JSON.stringify({ operations: [{ create: { name: data.name, advertisingChannelType: data.channel_type || 'SEARCH', status: data.status || 'PAUSED', campaignBudget: budgetResourceName, startDate: data.start_time?.replace(/-/g, '') || undefined, endDate: data.end_time?.replace(/-/g, '') || undefined, manualCpc: {} } }] }),
      });
      return await res.json();
    }
    case 'update_campaign': {
      const updates: any = { resourceName: `customers/${customerId}/campaigns/${campaignId}` };
      if (data.name) updates.name = data.name;
      if (data.status) updates.status = data.status;
      const res = await fetch(`${baseUrl}/campaigns:mutate`, {
        method: 'POST', headers,
        body: JSON.stringify({ operations: [{ update: updates, updateMask: Object.keys(updates).filter(k => k !== 'resourceName').join(',') }] }),
      });
      return await res.json();
    }
    case 'list_adsets': {
      let query = `SELECT ad_group.id, ad_group.name, ad_group.status, ad_group.type, ad_group.cpc_bid_micros, ad_group.campaign.resource_name FROM ad_group`;
      if (campaignId) query += ` WHERE campaign.id = ${campaignId}`;
      query += ' ORDER BY ad_group.id';
      const res = await fetch(`${baseUrl}/googleAds:searchStream`, { method: 'POST', headers, body: JSON.stringify({ query }) });
      return await res.json();
    }
    case 'create_adset': {
      const res = await fetch(`${baseUrl}/adGroups:mutate`, {
        method: 'POST', headers,
        body: JSON.stringify({ operations: [{ create: { name: data.name, campaign: `customers/${customerId}/campaigns/${data.campaign_id}`, type: data.type || 'SEARCH_STANDARD', status: data.status || 'PAUSED', cpcBidMicros: data.bid_amount ? String(Math.round(data.bid_amount * 1000000)) : '2000000' } }] }),
      });
      return await res.json();
    }
    case 'list_ads': {
      let query = `SELECT ad_group_ad.ad.id, ad_group_ad.ad.name, ad_group_ad.ad.type, ad_group_ad.status, ad_group_ad.ad.responsive_search_ad, ad_group_ad.ad.responsive_display_ad, ad_group_ad.ad_group FROM ad_group_ad`;
      if (adsetId) query += ` WHERE ad_group.id = ${adsetId}`;
      else if (campaignId) query += ` WHERE campaign.id = ${campaignId}`;
      query += ' ORDER BY ad_group_ad.ad.id';
      const res = await fetch(`${baseUrl}/googleAds:searchStream`, { method: 'POST', headers, body: JSON.stringify({ query }) });
      return await res.json();
    }
    case 'get_stats': {
      const query = campaignId
        ? `SELECT metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.ctr, metrics.average_cpc, metrics.conversions, metrics.conversions_value FROM campaign WHERE campaign.id = ${campaignId} AND segments.date DURING LAST_30_DAYS`
        : `SELECT campaign.id, campaign.name, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.ctr, metrics.conversions FROM campaign WHERE segments.date DURING LAST_30_DAYS`;
      const res = await fetch(`${baseUrl}/googleAds:searchStream`, { method: 'POST', headers, body: JSON.stringify({ query }) });
      return await res.json();
    }
    default:
      return { error: `Unknown Google Ads action: ${action}` };
  }
}

// ═══════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: AdsRequest = await req.json();
    const { platform, action, credentials, data, campaign_id, adset_id, ad_id } = body;

    if (!platform || !action) {
      return new Response(JSON.stringify({ success: false, error: 'Missing platform or action' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let result: any;

    switch (platform) {
      case 'facebook_ads':
      case 'instagram_ads':
        result = await handleFacebookAds(action, credentials || {}, data, campaign_id, adset_id, ad_id);
        break;
      case 'tiktok_ads':
        result = await handleTikTokAds(action, credentials || {}, data, campaign_id, adset_id, ad_id);
        break;
      case 'snapchat_ads':
        result = await handleSnapchatAds(action, credentials || {}, data, campaign_id, adset_id, ad_id);
        break;
      case 'pinterest_ads':
        result = await handlePinterestAds(action, credentials || {}, data, campaign_id, adset_id, ad_id);
        break;
      case 'x_ads':
        result = await handleXAds(action, credentials || {}, data, campaign_id, adset_id, ad_id);
        break;
      case 'linkedin_ads':
        result = await handleLinkedInAds(action, credentials || {}, data, campaign_id, adset_id, ad_id);
        break;
      case 'google_ads':
      case 'youtube_ads':
        result = await handleGoogleAds(action, credentials || {}, data, campaign_id, adset_id, ad_id);
        break;
      default:
        result = { error: `Unsupported platform: ${platform}` };
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Ads API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
