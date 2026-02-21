const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Platform API base URLs
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
  action: string; // list_campaigns, create_campaign, update_campaign, delete_campaign, get_campaign, get_stats, list_adsets, create_adset
  credentials: Record<string, string>;
  data?: Record<string, any>;
  campaign_id?: string;
}

async function handleFacebookAds(action: string, creds: Record<string, string>, data?: any, campaignId?: string) {
  const baseUrl = PLATFORM_URLS.facebook_ads;
  const token = creds.access_token;
  const adAccountId = creds.ad_account_id;

  switch (action) {
    case 'list_campaigns': {
      const url = `${baseUrl}/${adAccountId}/campaigns?fields=id,name,objective,status,daily_budget,lifetime_budget,start_time,stop_time,created_time,updated_time,buying_type,bid_strategy&limit=100&access_token=${token}`;
      const res = await fetch(url);
      return await res.json();
    }
    case 'create_campaign': {
      const url = `${baseUrl}/${adAccountId}/campaigns`;
      const body = new URLSearchParams({
        name: data.name,
        objective: data.objective || 'OUTCOME_TRAFFIC',
        status: data.status || 'PAUSED',
        special_ad_categories: '[]',
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
      const url = `${baseUrl}/${campaignId}?fields=id,name,objective,status,daily_budget,lifetime_budget,start_time,stop_time,created_time,updated_time,buying_type,bid_strategy&access_token=${token}`;
      const res = await fetch(url);
      return await res.json();
    }
    case 'get_stats': {
      const cid = campaignId || adAccountId;
      const url = `${baseUrl}/${cid}/insights?fields=impressions,clicks,spend,ctr,cpc,cpm,reach,frequency,actions&date_preset=last_30d&access_token=${token}`;
      const res = await fetch(url);
      return await res.json();
    }
    case 'list_adsets': {
      const cid = campaignId || adAccountId;
      const url = `${baseUrl}/${cid}/adsets?fields=id,name,status,daily_budget,lifetime_budget,targeting,optimization_goal,billing_event,bid_amount,start_time,end_time&access_token=${token}`;
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
        bid_amount: String(Math.round((data.bid_amount || 5) * 100)),
        targeting: JSON.stringify(data.targeting || { geo_locations: { countries: ['US'] }, age_min: 18, age_max: 65 }),
        access_token: token,
      });
      if (data.start_time) body.set('start_time', data.start_time);
      if (data.end_time) body.set('end_time', data.end_time);
      const res = await fetch(url, { method: 'POST', body });
      return await res.json();
    }
    default:
      return { error: `Unknown Facebook action: ${action}` };
  }
}

async function handleTikTokAds(action: string, creds: Record<string, string>, data?: any, campaignId?: string) {
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
      const url = `${baseUrl}/campaign/create/`;
      const res = await fetch(url, {
        method: 'POST', headers,
        body: JSON.stringify({
          advertiser_id: advertiserId,
          campaign_name: data.name,
          objective_type: data.objective || 'TRAFFIC',
          budget_mode: data.budget_mode || 'BUDGET_MODE_DAY',
          budget: data.daily_budget || 50,
          operation_status: data.status === 'ACTIVE' ? 'ENABLE' : 'DISABLE',
        }),
      });
      return await res.json();
    }
    case 'update_campaign': {
      const url = `${baseUrl}/campaign/update/`;
      const body: any = { advertiser_id: advertiserId, campaign_id: campaignId };
      if (data.name) body.campaign_name = data.name;
      if (data.budget) body.budget = data.budget;
      if (data.status) body.operation_status = data.status === 'ACTIVE' ? 'ENABLE' : data.status === 'PAUSED' ? 'DISABLE' : data.status;
      const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
      return await res.json();
    }
    case 'get_stats': {
      const url = `${baseUrl}/report/integrated/get/`;
      const res = await fetch(url, {
        method: 'POST', headers,
        body: JSON.stringify({
          advertiser_id: advertiserId,
          report_type: 'BASIC',
          data_level: 'AUCTION_CAMPAIGN',
          dimensions: ['campaign_id'],
          metrics: ['spend', 'impressions', 'clicks', 'ctr', 'cpc', 'reach', 'conversion'],
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

async function handleSnapchatAds(action: string, creds: Record<string, string>, data?: any, campaignId?: string) {
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
        body: JSON.stringify({
          campaigns: [{
            name: data.name,
            ad_account_id: adAccountId,
            status: data.status || 'PAUSED',
            start_time: data.start_time || new Date().toISOString(),
            end_time: data.end_time,
            daily_budget_micro: Math.round((data.daily_budget || 50) * 1000000),
            buy_model: 'AUCTION',
          }],
        }),
      });
      return await res.json();
    }
    case 'update_campaign': {
      const res = await fetch(`${baseUrl}/campaigns/${campaignId}`, {
        method: 'PUT', headers,
        body: JSON.stringify({
          campaigns: [{
            id: campaignId,
            name: data.name,
            status: data.status,
            daily_budget_micro: data.daily_budget ? Math.round(data.daily_budget * 1000000) : undefined,
          }],
        }),
      });
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

async function handlePinterestAds(action: string, creds: Record<string, string>, data?: any, campaignId?: string) {
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
        body: JSON.stringify([{
          ad_account_id: adAccountId,
          name: data.name,
          status: data.status || 'PAUSED',
          objective_type: data.objective || 'AWARENESS',
          daily_spend_cap: data.daily_budget ? Math.round(data.daily_budget * 1000000) : undefined,
          lifetime_spend_cap: data.lifetime_budget ? Math.round(data.lifetime_budget * 1000000) : undefined,
          is_campaign_budget_optimization: data.budget_optimization || false,
        }]),
      });
      return await res.json();
    }
    case 'update_campaign': {
      const res = await fetch(`${baseUrl}/ad_accounts/${adAccountId}/campaigns`, {
        method: 'PATCH', headers,
        body: JSON.stringify([{
          id: campaignId,
          name: data.name,
          status: data.status,
          daily_spend_cap: data.daily_budget ? Math.round(data.daily_budget * 1000000) : undefined,
        }]),
      });
      return await res.json();
    }
    case 'get_stats': {
      const end = new Date().toISOString().split('T')[0];
      const start = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
      const cids = campaignId || '';
      const res = await fetch(`${baseUrl}/ad_accounts/${adAccountId}/campaigns/analytics?start_date=${start}&end_date=${end}&campaign_ids=${cids}&columns=SPEND_IN_DOLLAR,IMPRESSION_1,CLICKTHROUGH_1,CTR_1,CPC_IN_DOLLAR&granularity=TOTAL`, { headers });
      return await res.json();
    }
    default:
      return { error: `Unknown Pinterest action: ${action}` };
  }
}

async function handleXAds(action: string, creds: Record<string, string>, data?: any, campaignId?: string) {
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
        body: JSON.stringify({
          name: data.name,
          funding_instrument_id: data.funding_instrument_id,
          daily_budget_amount_local_micro: data.daily_budget ? Math.round(data.daily_budget * 1000000) : undefined,
          total_budget_amount_local_micro: data.lifetime_budget ? Math.round(data.lifetime_budget * 1000000) : undefined,
          entity_status: data.status || 'PAUSED',
          start_time: data.start_time,
          end_time: data.end_time,
        }),
      });
      return await res.json();
    }
    case 'update_campaign': {
      const res = await fetch(`${baseUrl}/accounts/${adAccountId}/campaigns/${campaignId}`, {
        method: 'PUT', headers,
        body: JSON.stringify({
          name: data.name,
          entity_status: data.status,
          daily_budget_amount_local_micro: data.daily_budget ? Math.round(data.daily_budget * 1000000) : undefined,
        }),
      });
      return await res.json();
    }
    case 'delete_campaign': {
      const res = await fetch(`${baseUrl}/accounts/${adAccountId}/campaigns/${campaignId}`, { method: 'DELETE', headers });
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

async function handleLinkedInAds(action: string, creds: Record<string, string>, data?: any, campaignId?: string) {
  const baseUrl = PLATFORM_URLS.linkedin_ads;
  const token = creds.access_token;
  const adAccountId = creds.ad_account_id;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Restli-Protocol-Version': '2.0.0',
    'LinkedIn-Version': '202601',
  };

  switch (action) {
    case 'list_campaigns': {
      const res = await fetch(`${baseUrl}/adCampaigns?q=search&search=(account:(values:List(urn%3Ali%3AsponsoredAccount%3A${adAccountId})))&count=100`, { headers });
      return await res.json();
    }
    case 'create_campaign': {
      const res = await fetch(`${baseUrl}/adCampaigns`, {
        method: 'POST', headers,
        body: JSON.stringify({
          account: `urn:li:sponsoredAccount:${adAccountId}`,
          name: data.name,
          type: data.type || 'SPONSORED_UPDATES',
          costType: data.cost_type || 'CPM',
          totalBudget: data.lifetime_budget ? { amount: String(Math.round(data.lifetime_budget * 100)), currencyCode: 'USD' } : undefined,
          dailyBudget: data.daily_budget ? { amount: String(Math.round(data.daily_budget * 100)), currencyCode: 'USD' } : undefined,
          status: data.status || 'PAUSED',
          objectiveType: data.objective || 'BRAND_AWARENESS',
          runSchedule: {
            start: data.start_time ? new Date(data.start_time).getTime() : Date.now(),
            end: data.end_time ? new Date(data.end_time).getTime() : undefined,
          },
          locale: { country: 'US', language: 'en' },
        }),
      });
      return await res.json();
    }
    case 'update_campaign': {
      const res = await fetch(`${baseUrl}/adCampaigns/${campaignId}`, {
        method: 'POST', headers: { ...headers, 'X-RestLi-Method': 'PARTIAL_UPDATE' },
        body: JSON.stringify({
          patch: {
            $set: {
              ...(data.name && { name: data.name }),
              ...(data.status && { status: data.status }),
              ...(data.daily_budget && { dailyBudget: { amount: String(Math.round(data.daily_budget * 100)), currencyCode: 'USD' } }),
            },
          },
        }),
      });
      return { success: res.ok, status: res.status };
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

async function handleGoogleAds(action: string, creds: Record<string, string>, data?: any, campaignId?: string) {
  // Google Ads requires OAuth2 + developer token — we use the REST API
  const customerId = creds.customer_id?.replace(/-/g, '');
  const developerToken = creds.developer_token;
  const refreshToken = creds.refresh_token;

  // Get access token from refresh token (requires client_id/secret configured)
  // For now we assume the refresh_token is actually an access token or the user handles OAuth externally
  const accessToken = refreshToken;
  const baseUrl = `${PLATFORM_URLS.google_ads}/customers/${customerId}`;
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'developer-token': developerToken,
    'Content-Type': 'application/json',
  };

  switch (action) {
    case 'list_campaigns': {
      const res = await fetch(`${baseUrl}/googleAds:searchStream`, {
        method: 'POST', headers,
        body: JSON.stringify({
          query: `SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type, campaign_budget.amount_micros, campaign.start_date, campaign.end_date, campaign.bidding_strategy_type FROM campaign WHERE campaign.status != 'REMOVED' ORDER BY campaign.id`,
        }),
      });
      return await res.json();
    }
    case 'create_campaign': {
      // First create a budget
      const budgetRes = await fetch(`${baseUrl}/campaignBudgets:mutate`, {
        method: 'POST', headers,
        body: JSON.stringify({
          operations: [{
            create: {
              name: `${data.name}_budget_${Date.now()}`,
              amountMicros: String(Math.round((data.daily_budget || 50) * 1000000)),
              deliveryMethod: 'STANDARD',
            },
          }],
        }),
      });
      const budgetData = await budgetRes.json();
      const budgetResourceName = budgetData?.results?.[0]?.resourceName;

      const res = await fetch(`${baseUrl}/campaigns:mutate`, {
        method: 'POST', headers,
        body: JSON.stringify({
          operations: [{
            create: {
              name: data.name,
              advertisingChannelType: data.channel_type || 'SEARCH',
              status: data.status || 'PAUSED',
              campaignBudget: budgetResourceName,
              startDate: data.start_time?.replace(/-/g, '') || undefined,
              endDate: data.end_time?.replace(/-/g, '') || undefined,
              manualCpc: {},
            },
          }],
        }),
      });
      return await res.json();
    }
    case 'update_campaign': {
      const updates: any = {};
      if (data.name) updates.name = data.name;
      if (data.status) updates.status = data.status;
      updates.resourceName = `customers/${customerId}/campaigns/${campaignId}`;

      const res = await fetch(`${baseUrl}/campaigns:mutate`, {
        method: 'POST', headers,
        body: JSON.stringify({
          operations: [{
            update: updates,
            updateMask: Object.keys(updates).filter(k => k !== 'resourceName').join(','),
          }],
        }),
      });
      return await res.json();
    }
    case 'get_stats': {
      const query = campaignId
        ? `SELECT metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.ctr, metrics.average_cpc, metrics.conversions FROM campaign WHERE campaign.id = ${campaignId} AND segments.date DURING LAST_30_DAYS`
        : `SELECT campaign.id, campaign.name, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.ctr, metrics.conversions FROM campaign WHERE segments.date DURING LAST_30_DAYS`;
      const res = await fetch(`${baseUrl}/googleAds:searchStream`, {
        method: 'POST', headers,
        body: JSON.stringify({ query }),
      });
      return await res.json();
    }
    default:
      return { error: `Unknown Google Ads action: ${action}` };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: AdsRequest = await req.json();
    const { platform, action, credentials, data, campaign_id } = body;

    if (!platform || !action || !credentials) {
      return new Response(JSON.stringify({ success: false, error: 'Missing platform, action, or credentials' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let result: any;

    switch (platform) {
      case 'facebook_ads':
      case 'instagram_ads':
        result = await handleFacebookAds(action, credentials, data, campaign_id);
        break;
      case 'tiktok_ads':
        result = await handleTikTokAds(action, credentials, data, campaign_id);
        break;
      case 'snapchat_ads':
        result = await handleSnapchatAds(action, credentials, data, campaign_id);
        break;
      case 'pinterest_ads':
        result = await handlePinterestAds(action, credentials, data, campaign_id);
        break;
      case 'x_ads':
        result = await handleXAds(action, credentials, data, campaign_id);
        break;
      case 'linkedin_ads':
        result = await handleLinkedInAds(action, credentials, data, campaign_id);
        break;
      case 'google_ads':
      case 'youtube_ads':
        result = await handleGoogleAds(action, credentials, data, campaign_id);
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
