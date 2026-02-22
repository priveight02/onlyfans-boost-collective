import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ShoppingCart, Download, Upload, RefreshCw, Search, Loader2,
  Image, SquarePen, Trash2, CheckCircle2, Package, ExternalLink,
  ArrowDownToLine, ArrowUpFromLine, Eye, Copy, X, Plus,
  Layers, FileText, DollarSign, BarChart3, Settings2,
  Wifi, WifiOff, Globe, FolderDown, FolderUp, ImageDown,
  PackageCheck, Sparkles, Filter, LayoutGrid, List, Tag,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// ═══════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════
interface StoreProduct {
  id: string;
  external_id: string;
  title: string;
  description: string;
  price: string;
  compare_at_price?: string;
  currency: string;
  sku?: string;
  barcode?: string;
  inventory_quantity?: number;
  weight?: string;
  weight_unit?: string;
  status: string;
  vendor?: string;
  product_type?: string;
  tags?: string[];
  images: { id?: string; src: string; alt?: string; position?: number }[];
  variants?: { id: string; title: string; price: string; sku?: string; inventory_quantity?: number; option1?: string; option2?: string; option3?: string }[];
  handle?: string;
  created_at?: string;
  updated_at?: string;
  platform: "shopify" | "woocommerce" | "canva";
  synced_at?: string;
}

interface StoreManagerProps {
  connectedPlatforms: Record<string, boolean>;
  integrationKeys: Record<string, Record<string, string>>;
  generatedCreatives?: { url: string; prompt: string }[];
}

const PLATFORM_LABELS: Record<string, string> = {
  shopify: "Shopify",
  woocommerce: "WooCommerce",
  canva: "Canva",
};

// ═══════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════
const StoreManager = ({ connectedPlatforms, integrationKeys, generatedCreatives = [] }: StoreManagerProps) => {
  const [activePlatform, setActivePlatform] = useState<"shopify" | "woocommerce" | "canva">("shopify");
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<StoreProduct | null>(null);
  const [editForm, setEditForm] = useState<Partial<StoreProduct>>({});
  const [saving, setSaving] = useState(false);

  // Export dialog
  const [exportOpen, setExportOpen] = useState(false);
  const [exportTarget, setExportTarget] = useState<"shopify" | "woocommerce">("shopify");
  const [exporting, setExporting] = useState(false);
  const [exportCreativeOpen, setExportCreativeOpen] = useState(false);

  // Import dialog
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Image upload for editing
  const editImageRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Shopify OAuth state
  const [shopifyOAuthLoading, setShopifyOAuthLoading] = useState(false);
  const [shopifyShopInput, setShopifyShopInput] = useState("");
  const [shopifyConnection, setShopifyConnection] = useState<any>(null);
  const [showShopifyConnect, setShowShopifyConnect] = useState(false);

  const storePlatforms = (["shopify", "woocommerce", "canva"] as const).filter(p => connectedPlatforms[p] || (p === "shopify" && shopifyConnection));

  useEffect(() => {
    if (storePlatforms.length > 0 && !storePlatforms.includes(activePlatform)) {
      setActivePlatform(storePlatforms[0]);
    }
  }, [storePlatforms.length]);

  // Check for existing Shopify OAuth connection
  useEffect(() => {
    const checkShopifyConnection = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("shopify_store_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      if (data) setShopifyConnection(data);
    };
    checkShopifyConnection();
  }, []);

  // Shopify OAuth: start flow
  const handleShopifyOAuth = async () => {
    if (!shopifyShopInput.trim()) {
      toast.error("Enter your Shopify store name (e.g. mystore or mystore.myshopify.com)");
      return;
    }
    setShopifyOAuthLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const redirectUrl = window.location.hostname === "localhost"
        ? window.location.origin + "/platform/ad-creatives/store-manager"
        : "https://uplyze.ai/platform/ad-creatives/store-manager";

      const { data, error } = await supabase.functions.invoke("shopify-oauth-start", {
        body: { shop: shopifyShopInput.trim(), user_id: user.id, redirect_url: redirectUrl },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.auth_url) throw new Error("No auth URL returned");

      // Navigate directly to Shopify OAuth (popups get blocked by Shopify)
      window.location.href = data.auth_url;
    } catch (err: any) {
      console.error("Shopify OAuth error:", err);
      toast.error(err.message || "Failed to start Shopify OAuth");
    } finally {
      setShopifyOAuthLoading(false);
    }
  };

  // Disconnect Shopify OAuth
  const handleDisconnectShopify = async () => {
    if (!shopifyConnection) return;
    try {
      await supabase
        .from("shopify_store_connections")
        .update({ is_active: false })
        .eq("id", shopifyConnection.id);
      setShopifyConnection(null);
      toast.success("Shopify store disconnected");
    } catch {
      toast.error("Failed to disconnect");
    }
  };

  // Load products from DB (persisted across sessions)
  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("copilot_generated_content")
        .select("*")
        .eq("content_type", "store_product")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });
      if (data) {
        const parsed: StoreProduct[] = data
          .map((d: any) => {
            const meta = d.metadata as any;
            if (!meta?.product) return null;
            return { ...meta.product, synced_at: meta.synced_at } as StoreProduct;
          })
          .filter(Boolean) as StoreProduct[];
        setProducts(parsed.filter(p => p.platform === activePlatform));
      }
    } catch (err: any) {
      console.error("Load products error:", err);
    } finally {
      setLoading(false);
    }
  }, [activePlatform]);

  useEffect(() => {
    if (activePlatform) loadProducts();
  }, [activePlatform, loadProducts]);

  // Save product to DB
  const saveProductToDB = async (product: StoreProduct) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    // Upsert by external_id + platform
    const { data: existing } = await supabase
      .from("copilot_generated_content")
      .select("id")
      .eq("content_type", "store_product")
      .eq("url", `${product.platform}:${product.external_id}`)
      .eq("created_by", user.id)
      .maybeSingle();
    const payload = {
      content_type: "store_product",
      url: `${product.platform}:${product.external_id}`,
      prompt: product.title,
      metadata: JSON.parse(JSON.stringify({ product, synced_at: new Date().toISOString() })) as any,
      created_by: user.id,
    };
    if (existing) {
      await supabase.from("copilot_generated_content").update(payload).eq("id", existing.id);
    } else {
      await supabase.from("copilot_generated_content").insert(payload as any);
    }
  };

  // Call store API via edge function
  const callStoreApi = async (platform: string, action: string, data?: any) => {
    const credentials = integrationKeys[platform] || {};
    const { data: result, error } = await supabase.functions.invoke("ads-api", {
      body: { platform, action, credentials, data },
    });
    if (error) throw error;
    return result;
  };

  // Import products from store
  const handleImportFromStore = async () => {
    if (!connectedPlatforms[activePlatform] && !(activePlatform === "shopify" && shopifyConnection)) {
      toast.error(`${PLATFORM_LABELS[activePlatform]} is not connected. Go to Integrations tab to connect.`);
      return;
    }
    setSyncing(true);
    try {
      let apiProducts: StoreProduct[] = [];

      if (activePlatform === "shopify") {
        // Prefer OAuth connection, fallback to integration keys
        let storeUrl = "";
        let token = "";
        if (shopifyConnection) {
          storeUrl = (shopifyConnection as any).shop_domain;
          token = (shopifyConnection as any).access_token;
        } else {
          const creds = integrationKeys.shopify || {};
          storeUrl = creds.store_url?.replace(/^https?:\/\//, "").replace(/\/$/, "") || "";
          token = creds.api_key || "";
        }
        if (!storeUrl || !token) throw new Error("Missing Shopify credentials");

        const res = await fetch(`https://${storeUrl}/admin/api/2024-01/products.json?limit=250`, {
          headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
        });
        if (!res.ok) {
          // Try via edge function as fallback
          const result = await callStoreApi("shopify", "list_products");
          const items = result?.data?.products || result?.products || [];
          apiProducts = items.map((p: any) => normalizeShopifyProduct(p));
        } else {
          const json = await res.json();
          apiProducts = (json.products || []).map((p: any) => normalizeShopifyProduct(p));
        }
      } else if (activePlatform === "woocommerce") {
        const creds = integrationKeys.woocommerce || {};
        const storeUrl = creds.store_url?.replace(/\/$/, "");
        const ck = creds.api_key;
        const cs = creds.api_secret;
        if (!storeUrl || !ck || !cs) throw new Error("Missing WooCommerce credentials");

        const res = await fetch(`${storeUrl}/wp-json/wc/v3/products?per_page=100&consumer_key=${ck}&consumer_secret=${cs}`);
        if (!res.ok) throw new Error(`WooCommerce API error: ${res.status}`);
        const json = await res.json();
        apiProducts = (Array.isArray(json) ? json : []).map((p: any) => normalizeWooProduct(p));
      } else if (activePlatform === "canva") {
        // Canva designs as "products"
        const creds = integrationKeys.canva || {};
        const apiKey = creds.api_key;
        if (!apiKey) throw new Error("Missing Canva API key");

        try {
          const res = await fetch("https://api.canva.com/rest/v1/designs?query=product&ownership=owned", {
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          });
          if (res.ok) {
            const json = await res.json();
            apiProducts = (json.items || json.designs || []).map((d: any) => normalizeCanvaDesign(d));
          }
        } catch {
          // Fallback: load from DB only
        }
      }

      // Save all to DB
      for (const product of apiProducts) {
        await saveProductToDB(product);
      }

      if (apiProducts.length > 0) {
        setProducts(apiProducts);
        toast.success(`Imported ${apiProducts.length} products from ${PLATFORM_LABELS[activePlatform]}`);
      } else {
        toast.info("No products found or API returned empty. Products from previous syncs are still available.");
      }
    } catch (err: any) {
      console.error("Import error:", err);
      toast.error(err.message || "Failed to import products");
    } finally {
      setSyncing(false);
    }
  };

  const normalizeShopifyProduct = (p: any): StoreProduct => ({
    id: `shopify-${p.id}`,
    external_id: String(p.id),
    title: p.title || "Untitled",
    description: p.body_html || p.description || "",
    price: p.variants?.[0]?.price || "0.00",
    compare_at_price: p.variants?.[0]?.compare_at_price || undefined,
    currency: "USD",
    sku: p.variants?.[0]?.sku || "",
    barcode: p.variants?.[0]?.barcode || "",
    inventory_quantity: p.variants?.[0]?.inventory_quantity ?? 0,
    weight: p.variants?.[0]?.weight ? String(p.variants[0].weight) : "",
    weight_unit: p.variants?.[0]?.weight_unit || "kg",
    status: p.status || "active",
    vendor: p.vendor || "",
    product_type: p.product_type || "",
    tags: typeof p.tags === "string" ? p.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : (p.tags || []),
    images: (p.images || []).map((img: any) => ({ id: String(img.id), src: img.src, alt: img.alt || "", position: img.position })),
    variants: (p.variants || []).map((v: any) => ({
      id: String(v.id), title: v.title, price: v.price, sku: v.sku,
      inventory_quantity: v.inventory_quantity, option1: v.option1, option2: v.option2, option3: v.option3,
    })),
    handle: p.handle || "",
    created_at: p.created_at,
    updated_at: p.updated_at,
    platform: "shopify",
  });

  const normalizeWooProduct = (p: any): StoreProduct => ({
    id: `woo-${p.id}`,
    external_id: String(p.id),
    title: p.name || "Untitled",
    description: p.description || p.short_description || "",
    price: p.price || p.regular_price || "0.00",
    compare_at_price: p.regular_price !== p.sale_price ? p.regular_price : undefined,
    currency: "USD",
    sku: p.sku || "",
    barcode: "",
    inventory_quantity: p.stock_quantity ?? 0,
    weight: p.weight || "",
    weight_unit: "kg",
    status: p.status || "publish",
    vendor: "",
    product_type: p.type || "",
    tags: (p.tags || []).map((t: any) => t.name || t),
    images: (p.images || []).map((img: any) => ({ id: String(img.id), src: img.src, alt: img.alt || "", position: img.position })),
    variants: (p.variations || []).map((v: any) => ({
      id: String(v.id || v), title: "", price: "", sku: "",
    })),
    handle: p.slug || "",
    created_at: p.date_created,
    updated_at: p.date_modified,
    platform: "woocommerce",
  });

  const normalizeCanvaDesign = (d: any): StoreProduct => ({
    id: `canva-${d.id}`,
    external_id: String(d.id),
    title: d.title || d.name || "Canva Design",
    description: d.description || "",
    price: "0.00",
    currency: "USD",
    status: "active",
    images: d.thumbnail ? [{ src: d.thumbnail.url || d.thumbnail, alt: d.title }] : [],
    platform: "canva",
  });

  // Edit product
  const openEdit = (product: StoreProduct) => {
    setEditProduct(product);
    setEditForm({ ...product });
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editProduct || !editForm) return;
    setSaving(true);
    try {
      const updated: StoreProduct = { ...editProduct, ...editForm } as StoreProduct;

      // Push update to store API
      if (updated.platform === "shopify" && connectedPlatforms.shopify) {
        const creds = integrationKeys.shopify || {};
        const storeUrl = creds.store_url?.replace(/^https?:\/\//, "").replace(/\/$/, "");
        const token = creds.api_key;
        if (storeUrl && token) {
          try {
            await fetch(`https://${storeUrl}/admin/api/2024-01/products/${updated.external_id}.json`, {
              method: "PUT",
              headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
              body: JSON.stringify({
                product: {
                  id: parseInt(updated.external_id),
                  title: updated.title,
                  body_html: updated.description,
                  vendor: updated.vendor,
                  product_type: updated.product_type,
                  tags: updated.tags?.join(", "),
                  status: updated.status,
                },
              }),
            });
          } catch { /* silent - will still save locally */ }
        }
      } else if (updated.platform === "woocommerce" && connectedPlatforms.woocommerce) {
        const creds = integrationKeys.woocommerce || {};
        const storeUrl = creds.store_url?.replace(/\/$/, "");
        const ck = creds.api_key;
        const cs = creds.api_secret;
        if (storeUrl && ck && cs) {
          try {
            await fetch(`${storeUrl}/wp-json/wc/v3/products/${updated.external_id}?consumer_key=${ck}&consumer_secret=${cs}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: updated.title,
                description: updated.description,
                regular_price: updated.price,
                sku: updated.sku,
                status: updated.status,
              }),
            });
          } catch { /* silent */ }
        }
      }

      // Save to DB
      await saveProductToDB(updated);
      setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
      setEditOpen(false);
      toast.success("Product updated successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to update product");
    } finally {
      setSaving(false);
    }
  };

  // Upload new image for product
  const handleImageUpload = async (file: File) => {
    setUploadingImage(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `store-products/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("copilot-attachments").upload(path, file);
      if (error) throw error;
      const { data: pub } = supabase.storage.from("copilot-attachments").getPublicUrl(path);
      const newImage = { src: pub.publicUrl, alt: file.name };
      setEditForm(prev => ({
        ...prev,
        images: [...(prev.images || []), newImage],
      }));
      toast.success("Image uploaded");
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  // Download single image
  const downloadImage = async (url: string, filename: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      // Fallback: open in new tab
      window.open(url, "_blank");
    }
  };

  // Download all images for a product
  const downloadAllImages = async (product: StoreProduct) => {
    if (!product.images.length) {
      toast.info("No images to download");
      return;
    }
    toast.info(`Downloading ${product.images.length} images...`);
    for (let i = 0; i < product.images.length; i++) {
      const img = product.images[i];
      const ext = img.src.split(".").pop()?.split("?")[0] || "jpg";
      await downloadImage(img.src, `${product.title.replace(/[^a-zA-Z0-9]/g, "_")}_${i + 1}.${ext}`);
      // Small delay between downloads
      await new Promise(r => setTimeout(r, 300));
    }
    toast.success(`Downloaded ${product.images.length} images`);
  };

  // Download all selected products images
  const downloadAllSelectedImages = async () => {
    const selected = products.filter(p => selectedProducts.has(p.id));
    if (!selected.length) {
      toast.error("Select products first");
      return;
    }
    let totalImages = 0;
    for (const product of selected) {
      totalImages += product.images.length;
    }
    toast.info(`Downloading ${totalImages} images from ${selected.length} products...`);
    for (const product of selected) {
      await downloadAllImages(product);
    }
    toast.success("All downloads complete");
  };

  // Export product to store
  const handleExportToStore = async (product: StoreProduct, targetPlatform: "shopify" | "woocommerce") => {
    setExporting(true);
    try {
      if (targetPlatform === "shopify") {
        const creds = integrationKeys.shopify || {};
        const storeUrl = creds.store_url?.replace(/^https?:\/\//, "").replace(/\/$/, "");
        const token = creds.api_key;
        if (!storeUrl || !token) throw new Error("Shopify not connected");

        const res = await fetch(`https://${storeUrl}/admin/api/2024-01/products.json`, {
          method: "POST",
          headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
          body: JSON.stringify({
            product: {
              title: product.title,
              body_html: product.description,
              vendor: product.vendor || "",
              product_type: product.product_type || "",
              tags: product.tags?.join(", ") || "",
              status: "draft",
              variants: [{ price: product.price, sku: product.sku || "", inventory_quantity: product.inventory_quantity ?? 0 }],
              images: product.images.map(img => ({ src: img.src, alt: img.alt || "" })),
            },
          }),
        });
        if (!res.ok) throw new Error(`Shopify API error: ${res.status}`);
        toast.success(`"${product.title}" exported to Shopify`);
      } else if (targetPlatform === "woocommerce") {
        const creds = integrationKeys.woocommerce || {};
        const storeUrl = creds.store_url?.replace(/\/$/, "");
        const ck = creds.api_key;
        const cs = creds.api_secret;
        if (!storeUrl || !ck || !cs) throw new Error("WooCommerce not connected");

        const res = await fetch(`${storeUrl}/wp-json/wc/v3/products?consumer_key=${ck}&consumer_secret=${cs}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: product.title,
            description: product.description,
            regular_price: product.price,
            sku: product.sku || "",
            status: "draft",
            images: product.images.map(img => ({ src: img.src, alt: img.alt || "" })),
          }),
        });
        if (!res.ok) throw new Error(`WooCommerce API error: ${res.status}`);
        toast.success(`"${product.title}" exported to WooCommerce`);
      }
    } catch (err: any) {
      toast.error(err.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  // Export generated creative as new product image to store
  const handleExportCreativeToStore = async (creativeUrl: string) => {
    setExporting(true);
    try {
      if (exportTarget === "shopify") {
        const creds = integrationKeys.shopify || {};
        const storeUrl = creds.store_url?.replace(/^https?:\/\//, "").replace(/\/$/, "");
        const token = creds.api_key;
        if (!storeUrl || !token) throw new Error("Shopify not connected");

        // Create a product with the creative as main image
        const res = await fetch(`https://${storeUrl}/admin/api/2024-01/products.json`, {
          method: "POST",
          headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
          body: JSON.stringify({
            product: {
              title: "AI Generated Creative",
              body_html: "Created with Uplyze AI Creative Maker",
              status: "draft",
              images: [{ src: creativeUrl }],
            },
          }),
        });
        if (!res.ok) throw new Error(`Shopify API error: ${res.status}`);
        toast.success("Creative exported to Shopify as draft product");
      } else {
        const creds = integrationKeys.woocommerce || {};
        const storeUrl = creds.store_url?.replace(/\/$/, "");
        const ck = creds.api_key;
        const cs = creds.api_secret;
        if (!storeUrl || !ck || !cs) throw new Error("WooCommerce not connected");

        const res = await fetch(`${storeUrl}/wp-json/wc/v3/products?consumer_key=${ck}&consumer_secret=${cs}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "AI Generated Creative",
            description: "Created with Uplyze AI Creative Maker",
            status: "draft",
            images: [{ src: creativeUrl }],
          }),
        });
        if (!res.ok) throw new Error(`WooCommerce API error: ${res.status}`);
        toast.success("Creative exported to WooCommerce as draft product");
      }
    } catch (err: any) {
      toast.error(err.message || "Export failed");
    } finally {
      setExporting(false);
      setExportCreativeOpen(false);
    }
  };

  // Bulk export selected products
  const handleBulkExport = async (target: "shopify" | "woocommerce") => {
    const selected = products.filter(p => selectedProducts.has(p.id));
    if (!selected.length) { toast.error("Select products first"); return; }
    setExporting(true);
    let success = 0;
    for (const product of selected) {
      try {
        await handleExportToStore(product, target);
        success++;
      } catch { /* continue */ }
    }
    setExporting(false);
    toast.success(`Exported ${success}/${selected.length} products to ${PLATFORM_LABELS[target]}`);
  };

  // Delete product from local DB
  const handleDeleteProduct = async (product: StoreProduct) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("copilot_generated_content").delete()
        .eq("content_type", "store_product")
        .eq("url", `${product.platform}:${product.external_id}`)
        .eq("created_by", user.id);
      setProducts(prev => prev.filter(p => p.id !== product.id));
      toast.success("Product removed from store manager");
    } catch (err: any) {
      toast.error("Failed to delete");
    }
  };

  // CSV export
  const handleCSVExport = () => {
    const data = products.filter(p => selectedProducts.size === 0 || selectedProducts.has(p.id));
    if (!data.length) { toast.error("No products to export"); return; }
    const headers = ["Title", "Description", "Price", "SKU", "Status", "Vendor", "Type", "Tags", "Image URL", "Inventory"];
    const rows = data.map(p => [
      `"${p.title.replace(/"/g, '""')}"`,
      `"${(p.description || "").replace(/<[^>]*>/g, "").replace(/"/g, '""').slice(0, 500)}"`,
      p.price,
      p.sku || "",
      p.status,
      p.vendor || "",
      p.product_type || "",
      `"${(p.tags || []).join(", ")}"`,
      p.images[0]?.src || "",
      String(p.inventory_quantity ?? 0),
    ].join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${activePlatform}_products_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success(`Exported ${data.length} products to CSV`);
  };

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelectedProducts(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
    }
  };

  // Filter
  const filteredProducts = products.filter(p => {
    const matchSearch = !searchTerm || p.title.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const noStoreConnected = !connectedPlatforms.shopify && !connectedPlatforms.woocommerce && !connectedPlatforms.canva && !shopifyConnection;

  if (noStoreConnected) {
    return (
      <div className="flex items-center justify-center h-96 rounded-xl border border-dashed border-white/[0.06]">
        <div className="text-center space-y-4 max-w-md">
          <ShoppingCart className="h-10 w-10 text-white/10 mx-auto" />
          <h3 className="text-white/60 text-base font-medium">No Store Connected</h3>
          <p className="text-white/30 text-sm">Connect Shopify, WooCommerce, or Canva in the Integrations tab to start managing your store products.</p>
          <p className="text-white/20 text-xs">Go to Integrations → Connect your store → Come back here to manage products</p>
          
          {/* Auto Connect Shopify OAuth */}
          <div className="border-t border-white/[0.06] pt-4 mt-4 space-y-3">
            <p className="text-white/40 text-xs font-medium">Or auto-connect your Shopify store via OAuth:</p>
            {!showShopifyConnect ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowShopifyConnect(true)}
                className="border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 text-xs"
              >
                <Wifi className="h-3.5 w-3.5 mr-1.5" />
                Auto Connect Shopify
              </Button>
            ) : (
              <div className="flex items-center gap-2 justify-center">
                <Input
                  placeholder="mystore.myshopify.com"
                  value={shopifyShopInput}
                  onChange={e => setShopifyShopInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleShopifyOAuth()}
                  className="max-w-[220px] text-xs crm-input"
                />
                <Button
                  size="sm"
                  onClick={handleShopifyOAuth}
                  disabled={shopifyOAuthLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                >
                  {shopifyOAuthLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5 mr-1" />}
                  Connect
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowShopifyConnect(false)} className="text-white/30 text-xs h-8 w-8 p-0">
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {storePlatforms.map(p => (
            <button
              key={p}
              onClick={() => { setActivePlatform(p); setSelectedProducts(new Set()); }}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                activePlatform === p
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-white/[0.06] text-white/30 hover:text-white/50"
              }`}
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              {PLATFORM_LABELS[p]}
              {(connectedPlatforms[p] || (p === "shopify" && shopifyConnection)) && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
            </button>
          ))}
          {/* Shopify OAuth connection badge */}
          {shopifyConnection && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-[10px] text-emerald-400/70">
              <Wifi className="h-3 w-3" />
              <span>{(shopifyConnection as any).shop_name || (shopifyConnection as any).shop_domain}</span>
              <button onClick={handleDisconnectShopify} className="ml-1 text-red-400/50 hover:text-red-400 transition-colors" title="Disconnect">
                <WifiOff className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleImportFromStore} disabled={syncing} className="border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 text-xs">
            {syncing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <ArrowDownToLine className="h-3.5 w-3.5 mr-1.5" />}
            Import from {PLATFORM_LABELS[activePlatform]}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setExportCreativeOpen(true)} className="border-purple-500/20 text-purple-400 hover:bg-purple-500/10 text-xs">
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            Export Creatives to Store
          </Button>
          <Button variant="outline" size="sm" onClick={handleCSVExport} className="border-white/10 text-white/40 hover:text-white/60 text-xs">
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            CSV Export
          </Button>
          <Button variant="outline" size="sm" onClick={loadProducts} disabled={loading} className="border-white/10 text-white/40 hover:text-white/60 text-xs">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/25" />
          <Input placeholder="Search products by name or SKU..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 text-xs crm-input" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 text-xs crm-input"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[hsl(220,40%,10%)] border-white/10">
            <SelectItem value="all" className="text-white text-xs">All Status</SelectItem>
            <SelectItem value="active" className="text-white text-xs">Active</SelectItem>
            <SelectItem value="draft" className="text-white text-xs">Draft</SelectItem>
            <SelectItem value="archived" className="text-white text-xs">Archived</SelectItem>
            <SelectItem value="publish" className="text-white text-xs">Published</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex border border-white/[0.06] rounded-lg overflow-hidden">
          <button onClick={() => setViewMode("grid")} className={`p-2 ${viewMode === "grid" ? "bg-white/10 text-white" : "text-white/25"}`}><LayoutGrid className="h-3.5 w-3.5" /></button>
          <button onClick={() => setViewMode("list")} className={`p-2 ${viewMode === "list" ? "bg-white/10 text-white" : "text-white/25"}`}><List className="h-3.5 w-3.5" /></button>
        </div>
        {selectedProducts.size > 0 && (
          <div className="flex items-center gap-2">
            <Badge className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">{selectedProducts.size} selected</Badge>
            <Button variant="outline" size="sm" onClick={downloadAllSelectedImages} className="text-xs h-7 border-blue-500/20 text-blue-400">
              <ImageDown className="h-3 w-3 mr-1" />Download Images
            </Button>
            {connectedPlatforms.shopify && activePlatform !== "shopify" && (
              <Button variant="outline" size="sm" onClick={() => handleBulkExport("shopify")} disabled={exporting} className="text-xs h-7 border-emerald-500/20 text-emerald-400">
                <ArrowUpFromLine className="h-3 w-3 mr-1" />To Shopify
              </Button>
            )}
            {connectedPlatforms.woocommerce && activePlatform !== "woocommerce" && (
              <Button variant="outline" size="sm" onClick={() => handleBulkExport("woocommerce")} disabled={exporting} className="text-xs h-7 border-purple-500/20 text-purple-400">
                <ArrowUpFromLine className="h-3 w-3 mr-1" />To WooCommerce
              </Button>
            )}
          </div>
        )}
        <div className="ml-auto text-[11px] text-white/25">{filteredProducts.length} product{filteredProducts.length !== 1 ? "s" : ""}</div>
      </div>

      {/* Select All */}
      {filteredProducts.length > 0 && (
        <button onClick={toggleSelectAll} className="text-[10px] text-white/30 hover:text-white/50 transition-colors">
          {selectedProducts.size === filteredProducts.length ? "Deselect All" : "Select All"}
        </button>
      )}

      {/* Products Grid/List */}
      <ScrollArea className="h-[calc(100vh-420px)]">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-6 w-6 text-white/20 animate-spin" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex items-center justify-center h-48 rounded-xl border border-dashed border-white/[0.06]">
            <div className="text-center space-y-2">
              <Package className="h-8 w-8 text-white/10 mx-auto" />
              <p className="text-white/30 text-sm">No products found</p>
              <p className="text-white/15 text-xs">Import products from {PLATFORM_LABELS[activePlatform]} using the button above</p>
            </div>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-3 gap-4">
            {filteredProducts.map(product => (
              <Card key={product.id} className={`crm-card border-white/[0.04] transition-all cursor-pointer ${selectedProducts.has(product.id) ? "ring-1 ring-emerald-500/30" : ""}`}>
                <CardContent className="p-0">
                  {/* Image */}
                  <div className="aspect-square relative overflow-hidden rounded-t-xl bg-black/30" onClick={() => toggleSelect(product.id)}>
                    {product.images[0] ? (
                      <img src={product.images[0].src} alt={product.title} className="w-full h-full object-contain" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Image className="h-10 w-10 text-white/10" /></div>
                    )}
                    {/* Checkbox */}
                    <div className={`absolute top-2 left-2 w-5 h-5 rounded border flex items-center justify-center transition-all ${selectedProducts.has(product.id) ? "bg-emerald-500 border-emerald-500" : "border-white/20 bg-black/40"}`}>
                      {selectedProducts.has(product.id) && <CheckCircle2 className="h-3 w-3 text-white" />}
                    </div>
                    {/* Status */}
                    <Badge className={`absolute top-2 right-2 text-[9px] ${product.status === "active" || product.status === "publish" ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-white/40"}`}>
                      {product.status}
                    </Badge>
                    {/* Image count */}
                    {product.images.length > 1 && (
                      <Badge className="absolute bottom-2 right-2 text-[9px] bg-black/60 text-white/70">
                        <Image className="h-2.5 w-2.5 mr-0.5" />{product.images.length}
                      </Badge>
                    )}
                  </div>
                  {/* Info */}
                  <div className="p-3 space-y-2">
                    <h3 className="text-sm font-medium text-white/80 line-clamp-1">{product.title}</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-400 font-bold text-sm">${product.price}</span>
                      {product.compare_at_price && <span className="text-white/25 line-through text-xs">${product.compare_at_price}</span>}
                      {product.sku && <span className="text-white/20 text-[10px] font-mono">{product.sku}</span>}
                    </div>
                    {product.inventory_quantity !== undefined && (
                      <div className="text-[10px] text-white/25">Stock: {product.inventory_quantity}</div>
                    )}
                    {/* Actions */}
                    <div className="flex gap-1.5 pt-1">
                      <Button size="sm" variant="outline" className="flex-1 text-[10px] h-7 border-white/[0.06] text-white/40 hover:text-white/70" onClick={() => openEdit(product)}>
                        <SquarePen className="h-3 w-3 mr-1" />Edit
                      </Button>
                      <Button size="sm" variant="outline" className="text-[10px] h-7 border-white/[0.06] text-white/40 hover:text-blue-400" onClick={() => downloadAllImages(product)} title="Download images">
                        <Download className="h-3 w-3" />
                      </Button>
                      {connectedPlatforms.shopify && product.platform !== "shopify" && (
                        <Button size="sm" variant="outline" className="text-[10px] h-7 border-emerald-500/20 text-emerald-400/60" onClick={() => handleExportToStore(product, "shopify")} title="Export to Shopify">
                          <ArrowUpFromLine className="h-3 w-3" />
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="text-[10px] h-7 border-red-500/20 text-red-400/40 hover:text-red-400" onClick={() => handleDeleteProduct(product)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {/* List header */}
            <div className="grid grid-cols-12 gap-3 px-3 py-2 text-[10px] text-white/25 font-medium uppercase tracking-wider border-b border-white/[0.04]">
              <div className="col-span-1">Select</div>
              <div className="col-span-1">Image</div>
              <div className="col-span-3">Title</div>
              <div className="col-span-1">Price</div>
              <div className="col-span-1">SKU</div>
              <div className="col-span-1">Stock</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-3">Actions</div>
            </div>
            {filteredProducts.map(product => (
              <div key={product.id} className={`grid grid-cols-12 gap-3 px-3 py-2 rounded-xl items-center transition-all ${selectedProducts.has(product.id) ? "bg-emerald-500/5 border border-emerald-500/10" : "hover:bg-white/[0.02] border border-transparent"}`}>
                <div className="col-span-1">
                  <button onClick={() => toggleSelect(product.id)} className={`w-5 h-5 rounded border flex items-center justify-center ${selectedProducts.has(product.id) ? "bg-emerald-500 border-emerald-500" : "border-white/20"}`}>
                    {selectedProducts.has(product.id) && <CheckCircle2 className="h-3 w-3 text-white" />}
                  </button>
                </div>
                <div className="col-span-1">
                  {product.images[0] ? (
                    <img src={product.images[0].src} alt="" className="w-10 h-10 rounded object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-white/[0.04] flex items-center justify-center"><Image className="h-4 w-4 text-white/15" /></div>
                  )}
                </div>
                <div className="col-span-3"><span className="text-xs text-white/70 line-clamp-1">{product.title}</span></div>
                <div className="col-span-1"><span className="text-xs text-emerald-400 font-medium">${product.price}</span></div>
                <div className="col-span-1"><span className="text-[10px] text-white/30 font-mono">{product.sku || "—"}</span></div>
                <div className="col-span-1"><span className="text-[10px] text-white/30">{product.inventory_quantity ?? "—"}</span></div>
                <div className="col-span-1">
                  <Badge className={`text-[9px] ${product.status === "active" || product.status === "publish" ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-white/40"}`}>{product.status}</Badge>
                </div>
                <div className="col-span-3 flex gap-1.5">
                  <Button size="sm" variant="outline" className="text-[10px] h-6 border-white/[0.06] text-white/40" onClick={() => openEdit(product)}><SquarePen className="h-3 w-3 mr-1" />Edit</Button>
                  <Button size="sm" variant="outline" className="text-[10px] h-6 border-white/[0.06] text-white/40" onClick={() => downloadAllImages(product)}><Download className="h-3 w-3" /></Button>
                  <Button size="sm" variant="outline" className="text-[10px] h-6 border-red-500/20 text-red-400/40" onClick={() => handleDeleteProduct(product)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Edit Product Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-[hsl(222,47%,8%)] border-white/[0.08] text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <SquarePen className="h-4 w-4 text-emerald-400" />
              Edit Product
            </DialogTitle>
            <DialogDescription className="text-white/30 text-xs">
              Changes will sync to {editProduct ? PLATFORM_LABELS[editProduct.platform] : "store"} if connected
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] text-white/35 font-medium">Title</label>
                <Input value={editForm.title || ""} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} className="mt-1 text-xs crm-input" />
              </div>
              <div>
                <label className="text-[11px] text-white/35 font-medium">Status</label>
                <Select value={editForm.status || "active"} onValueChange={v => setEditForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="mt-1 text-xs crm-input"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[hsl(220,40%,10%)] border-white/10">
                    <SelectItem value="active" className="text-white text-xs">Active</SelectItem>
                    <SelectItem value="draft" className="text-white text-xs">Draft</SelectItem>
                    <SelectItem value="archived" className="text-white text-xs">Archived</SelectItem>
                    <SelectItem value="publish" className="text-white text-xs">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-[11px] text-white/35 font-medium">Description</label>
              <Textarea value={editForm.description || ""} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} className="mt-1 text-xs crm-input min-h-[100px]" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-[11px] text-white/35 font-medium">Price</label>
                <Input value={editForm.price || ""} onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))} className="mt-1 text-xs crm-input" />
              </div>
              <div>
                <label className="text-[11px] text-white/35 font-medium">Compare at Price</label>
                <Input value={editForm.compare_at_price || ""} onChange={e => setEditForm(f => ({ ...f, compare_at_price: e.target.value }))} className="mt-1 text-xs crm-input" />
              </div>
              <div>
                <label className="text-[11px] text-white/35 font-medium">SKU</label>
                <Input value={editForm.sku || ""} onChange={e => setEditForm(f => ({ ...f, sku: e.target.value }))} className="mt-1 text-xs crm-input" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-[11px] text-white/35 font-medium">Barcode</label>
                <Input value={editForm.barcode || ""} onChange={e => setEditForm(f => ({ ...f, barcode: e.target.value }))} className="mt-1 text-xs crm-input" />
              </div>
              <div>
                <label className="text-[11px] text-white/35 font-medium">Inventory Qty</label>
                <Input type="number" value={editForm.inventory_quantity ?? ""} onChange={e => setEditForm(f => ({ ...f, inventory_quantity: parseInt(e.target.value) || 0 }))} className="mt-1 text-xs crm-input" />
              </div>
              <div>
                <label className="text-[11px] text-white/35 font-medium">Weight</label>
                <div className="flex gap-1.5 mt-1">
                  <Input value={editForm.weight || ""} onChange={e => setEditForm(f => ({ ...f, weight: e.target.value }))} className="text-xs crm-input flex-1" />
                  <Select value={editForm.weight_unit || "kg"} onValueChange={v => setEditForm(f => ({ ...f, weight_unit: v }))}>
                    <SelectTrigger className="text-xs crm-input w-16"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[hsl(220,40%,10%)] border-white/10">
                      <SelectItem value="kg" className="text-white text-xs">kg</SelectItem>
                      <SelectItem value="g" className="text-white text-xs">g</SelectItem>
                      <SelectItem value="lb" className="text-white text-xs">lb</SelectItem>
                      <SelectItem value="oz" className="text-white text-xs">oz</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] text-white/35 font-medium">Vendor</label>
                <Input value={editForm.vendor || ""} onChange={e => setEditForm(f => ({ ...f, vendor: e.target.value }))} className="mt-1 text-xs crm-input" />
              </div>
              <div>
                <label className="text-[11px] text-white/35 font-medium">Product Type</label>
                <Input value={editForm.product_type || ""} onChange={e => setEditForm(f => ({ ...f, product_type: e.target.value }))} className="mt-1 text-xs crm-input" />
              </div>
            </div>
            <div>
              <label className="text-[11px] text-white/35 font-medium">Tags (comma separated)</label>
              <Input value={(editForm.tags || []).join(", ")} onChange={e => setEditForm(f => ({ ...f, tags: e.target.value.split(",").map(t => t.trim()).filter(Boolean) }))} className="mt-1 text-xs crm-input" />
            </div>

            {/* Images */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] text-white/35 font-medium">Product Images</label>
                <Button variant="outline" size="sm" className="text-[10px] h-6 border-white/[0.06] text-white/30" onClick={() => editImageRef.current?.click()}>
                  {uploadingImage ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Plus className="h-3 w-3 mr-1" />}Add Image
                </Button>
                <input ref={editImageRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); if (editImageRef.current) editImageRef.current.value = ""; }} />
              </div>
              <div className="grid grid-cols-4 gap-2">
                {(editForm.images || []).map((img, i) => (
                  <div key={i} className="relative group rounded-lg overflow-hidden border border-white/[0.06]">
                    <img src={img.src} alt={img.alt || ""} className="w-full aspect-square object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button className="p-1.5 rounded-lg bg-white/10 text-white/70 hover:text-white" onClick={() => downloadImage(img.src, `product_${i}.jpg`)}><Download className="h-3 w-3" /></button>
                      <button className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:text-red-300" onClick={() => setEditForm(f => ({ ...f, images: (f.images || []).filter((_, idx) => idx !== i) }))}><X className="h-3 w-3" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Variants */}
            {editForm.variants && editForm.variants.length > 0 && (
              <div>
                <label className="text-[11px] text-white/35 font-medium mb-2 block">Variants ({editForm.variants.length})</label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {editForm.variants.map((v, i) => (
                    <div key={v.id || i} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] text-xs">
                      <span className="text-white/50 font-medium">{v.title || `Variant ${i + 1}`}</span>
                      <span className="text-emerald-400">${v.price}</span>
                      {v.sku && <span className="text-white/25 font-mono text-[10px]">{v.sku}</span>}
                      {v.inventory_quantity !== undefined && <span className="text-white/20 text-[10px]">Qty: {v.inventory_quantity}</span>}
                      <div className="ml-auto flex gap-1 text-[10px] text-white/20">
                        {v.option1 && <span>{v.option1}</span>}
                        {v.option2 && <span>/ {v.option2}</span>}
                        {v.option3 && <span>/ {v.option3}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 text-xs border-white/10 text-white/50" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button className="flex-1 text-xs" disabled={saving} onClick={handleSaveEdit} style={{ background: "linear-gradient(135deg, hsl(145 70% 40%), hsl(170 70% 45%))" }}>
                {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Export Creative to Store Dialog */}
      <Dialog open={exportCreativeOpen} onOpenChange={setExportCreativeOpen}>
        <DialogContent className="bg-[hsl(222,47%,8%)] border-white/[0.08] text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-400" />
              Export Creatives to Store
            </DialogTitle>
            <DialogDescription className="text-white/30 text-xs">
              Push AI-generated creatives directly to your connected store
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-[11px] text-white/35 font-medium">Target Store</label>
              <Select value={exportTarget} onValueChange={v => setExportTarget(v as any)}>
                <SelectTrigger className="mt-1 text-xs crm-input"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[hsl(220,40%,10%)] border-white/10">
                  {connectedPlatforms.shopify && <SelectItem value="shopify" className="text-white text-xs">Shopify</SelectItem>}
                  {connectedPlatforms.woocommerce && <SelectItem value="woocommerce" className="text-white text-xs">WooCommerce</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <ScrollArea className="max-h-60">
              <div className="grid grid-cols-3 gap-2">
                {generatedCreatives.length > 0 ? generatedCreatives.map((c, i) => (
                  <div key={i} className="rounded-lg overflow-hidden border border-white/[0.06] group relative cursor-pointer hover:border-purple-500/30 transition-colors" onClick={() => handleExportCreativeToStore(c.url)}>
                    <img src={c.url} alt="" className="w-full aspect-square object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button size="sm" className="text-[10px] h-7 bg-purple-500/80" disabled={exporting}>
                        {exporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowUpFromLine className="h-3 w-3 mr-1" />}
                        Export
                      </Button>
                    </div>
                  </div>
                )) : (
                  <div className="col-span-3 text-center py-8 text-white/20 text-xs">
                    No generated creatives yet. Use Creative Maker to generate images first.
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StoreManager;
