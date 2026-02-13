import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShoppingBag, Search, RefreshCw, Tag, Package, AlertCircle, ExternalLink } from "lucide-react";

interface Props { selectedAccount: string; }

const IGShoppingManager = ({ selectedAccount }: Props) => {
  const [loading, setLoading] = useState(false);
  const [catalogs, setCatalogs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCatalog, setSelectedCatalog] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [mediaIdForTag, setMediaIdForTag] = useState("");
  const [productTagId, setProductTagId] = useState("");
  const [mediaTags, setMediaTags] = useState<any>(null);

  const callApi = async (action: string, params: any) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("instagram-api", {
        body: { action, account_id: selectedAccount, params },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "API error");
      return data.data;
    } finally { setLoading(false); }
  };

  const loadCatalogs = async () => {
    try {
      const result = await callApi("get_available_catalogs", {});
      setCatalogs(result?.data || []);
      toast.success(`Found ${result?.data?.length || 0} catalogs`);
    } catch (e: any) { toast.error(e.message); }
  };

  const searchProducts = async () => {
    if (!selectedCatalog || !searchQuery) { toast.error("Select catalog and enter search query"); return; }
    try {
      const result = await callApi("get_product_catalog", { catalog_id: selectedCatalog, query: searchQuery });
      setProducts(result?.data || []);
      toast.success(`Found ${result?.data?.length || 0} products`);
    } catch (e: any) { toast.error(e.message); }
  };

  const getProductTags = async () => {
    if (!mediaIdForTag) { toast.error("Enter media ID"); return; }
    try {
      const result = await callApi("get_product_tags", { media_id: mediaIdForTag });
      setMediaTags(result);
      toast.success("Product tags loaded");
    } catch (e: any) { toast.error(e.message); }
  };

  const tagProduct = async () => {
    if (!mediaIdForTag || !productTagId) { toast.error("Enter media ID and product ID"); return; }
    try {
      await callApi("tag_products", {
        media_id: mediaIdForTag,
        product_tags: [{ product_id: productTagId, x: 0.5, y: 0.5 }],
      });
      toast.success("Product tagged successfully!");
    } catch (e: any) { toast.error(e.message); }
  };

  const appealRejection = async (mediaId: string, reason: string) => {
    try {
      await callApi("appeal_product_rejection", { media_id: mediaId, reason });
      toast.success("Appeal submitted");
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4 pt-3">
      {/* Catalogs */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-foreground">Product Catalogs</p>
          <Button size="sm" onClick={loadCatalogs} disabled={loading} className="h-7 text-xs">
            {loading ? <RefreshCw className="h-3 w-3 animate-spin mr-1" /> : <Package className="h-3 w-3 mr-1" />}
            Load Catalogs
          </Button>
        </div>
        {catalogs.length > 0 && (
          <div className="space-y-1">
            {catalogs.map((cat: any) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCatalog(cat.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                  selectedCatalog === cat.id ? "bg-primary/15 text-primary border border-primary/30" : "bg-muted/30 text-foreground hover:bg-muted/50"
                }`}
              >
                <span className="font-medium">{cat.name}</span>
                <Badge variant="outline" className="ml-2 text-[10px]">{cat.product_count || 0} products</Badge>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product Search */}
      {selectedCatalog && (
        <div>
          <p className="text-xs font-semibold text-foreground mb-2">Search Products</p>
          <div className="flex gap-2">
            <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search products..." className="text-sm" />
            <Button size="sm" onClick={searchProducts} disabled={loading}>
              <Search className="h-3.5 w-3.5" />
            </Button>
          </div>
          {products.length > 0 && (
            <ScrollArea className="max-h-[200px] mt-2">
              <div className="space-y-1">
                {products.map((p: any, i: number) => (
                  <div key={i} className="bg-muted/30 rounded-lg p-2 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-foreground">{p.product_name || p.name || `Product ${i + 1}`}</p>
                      <p className="text-[10px] text-muted-foreground">ID: {p.product_id || p.id}</p>
                    </div>
                    <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setProductTagId(p.product_id || p.id)}>
                      <Tag className="h-3 w-3 mr-1" />Select
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      )}

      {/* Product Tagging */}
      <div>
        <p className="text-xs font-semibold text-foreground mb-2">Tag Products on Media</p>
        <div className="grid grid-cols-2 gap-2">
          <Input value={mediaIdForTag} onChange={e => setMediaIdForTag(e.target.value)} placeholder="Media ID" className="text-sm" />
          <Input value={productTagId} onChange={e => setProductTagId(e.target.value)} placeholder="Product ID" className="text-sm" />
        </div>
        <div className="flex gap-2 mt-2">
          <Button size="sm" onClick={getProductTags} disabled={loading} variant="outline" className="text-xs">
            View Tags
          </Button>
          <Button size="sm" onClick={tagProduct} disabled={loading} className="text-xs">
            <Tag className="h-3 w-3 mr-1" />Tag Product
          </Button>
        </div>
        {mediaTags && (
          <div className="mt-2 bg-muted/30 rounded-lg p-2">
            <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap">{JSON.stringify(mediaTags, null, 2)}</pre>
          </div>
        )}
      </div>

      {!catalogs.length && !loading && (
        <div className="text-center py-4">
          <ShoppingBag className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-xs text-muted-foreground">Load your product catalogs to start tagging</p>
          <p className="text-[10px] text-muted-foreground mt-1">Requires catalog_management permission</p>
        </div>
      )}
    </div>
  );
};

export default IGShoppingManager;
