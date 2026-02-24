import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShoppingBag, RefreshCw, Package, DollarSign, FileText, Plus, Loader2 } from "lucide-react";

interface Props { selectedAccount: string; selectedPage?: any; }

const FBCommerceHub = ({ selectedAccount }: Props) => {
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("catalogs");
  const [catalogs, setCatalogs] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [selectedCatalog, setSelectedCatalog] = useState("");
  const [commerceAccountId, setCommerceAccountId] = useState("");
  // New product
  const [prodName, setProdName] = useState("");
  const [prodPrice, setProdPrice] = useState("");
  const [prodImageUrl, setProdImageUrl] = useState("");
  const [prodUrl, setProdUrl] = useState("");

  const callApi = useCallback(async (action: string, params?: any) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("facebook-api", { body: { action, account_id: selectedAccount, params } });
      if (error) { toast.info(error.message); return null; }
      if (!data?.success) { toast.info(data?.error || "Action failed"); return null; }
      return data.data;
    } catch (e: any) { toast.info(e.message); return null; }
    finally { setLoading(false); }
  }, [selectedAccount]);

  const fetchCatalogs = async () => {
    const d = await callApi("get_catalogs");
    if (d?.data) {
      const allCatalogs: any[] = [];
      d.data.forEach((biz: any) => {
        if (biz.owned_product_catalogs?.data) allCatalogs.push(...biz.owned_product_catalogs.data);
      });
      setCatalogs(allCatalogs);
      toast.success(`${allCatalogs.length} catalogs found`);
    }
  };

  const fetchProducts = async (catalogId: string) => {
    setSelectedCatalog(catalogId);
    const d = await callApi("get_catalog_products", { catalog_id: catalogId });
    if (d?.data) setProducts(d.data);
  };

  const createProduct = async () => {
    if (!selectedCatalog || !prodName || !prodPrice) { toast.error("Select catalog, enter name & price"); return; }
    const d = await callApi("create_catalog_product", {
      catalog_id: selectedCatalog, name: prodName,
      price: `${parseFloat(prodPrice) * 100} USD`,
      image_url: prodImageUrl, url: prodUrl,
    });
    if (d?.id) { toast.success("Product added!"); setProdName(""); setProdPrice(""); setProdImageUrl(""); setProdUrl(""); fetchProducts(selectedCatalog); }
  };

  const fetchOrders = async () => {
    if (!commerceAccountId) { toast.error("Enter commerce account ID"); return; }
    const d = await callApi("get_commerce_orders", { commerce_account_id: commerceAccountId });
    if (d?.data) { setOrders(d.data); toast.success(`${d.data.length} orders`); }
  };

  const fetchReports = async () => {
    if (!commerceAccountId) { toast.error("Enter commerce account ID"); return; }
    const d = await callApi("get_commerce_reports", { commerce_account_id: commerceAccountId });
    if (d?.data) { setReports(d.data); toast.success(`${d.data.length} transactions`); }
  };

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-muted/50 border border-border p-0.5 rounded-lg gap-0.5">
          <TabsTrigger value="catalogs" className="text-xs px-2 py-1 rounded-md"><Package className="h-3 w-3 mr-1" />Catalogs</TabsTrigger>
          <TabsTrigger value="orders" className="text-xs px-2 py-1 rounded-md"><ShoppingBag className="h-3 w-3 mr-1" />Orders</TabsTrigger>
          <TabsTrigger value="reports" className="text-xs px-2 py-1 rounded-md"><FileText className="h-3 w-3 mr-1" />Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="catalogs" className="space-y-3 mt-3">
          <Button size="sm" variant="outline" onClick={fetchCatalogs} disabled={loading}><RefreshCw className="h-3.5 w-3.5 mr-1" />Load Catalogs</Button>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {catalogs.map(c => (
              <Card key={c.id} className={`border-border/50 cursor-pointer hover:border-primary/30 ${selectedCatalog === c.id ? "border-primary/50 bg-primary/5" : ""}`} onClick={() => fetchProducts(c.id)}>
                <CardContent className="p-3">
                  <p className="text-xs font-semibold text-foreground">{c.name}</p>
                  <p className="text-[10px] text-muted-foreground">{c.product_count || 0} products · {c.vertical}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {selectedCatalog && (
            <Card className="border-border/50">
              <CardContent className="p-4 space-y-3">
                <h4 className="text-xs font-bold text-foreground">Add Product</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Product name" value={prodName} onChange={e => setProdName(e.target.value)} className="text-sm" />
                  <Input placeholder="Price ($)" value={prodPrice} onChange={e => setProdPrice(e.target.value)} className="text-sm" type="number" />
                  <Input placeholder="Image URL" value={prodImageUrl} onChange={e => setProdImageUrl(e.target.value)} className="text-sm" />
                  <Input placeholder="Product URL" value={prodUrl} onChange={e => setProdUrl(e.target.value)} className="text-sm" />
                </div>
                <Button size="sm" onClick={createProduct} disabled={loading}><Plus className="h-3.5 w-3.5 mr-1" />Add Product</Button>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            {products.map(p => (
              <Card key={p.id} className="border-border/50">
                <CardContent className="p-3 flex items-center gap-3">
                  {p.image_url && <img src={p.image_url} className="h-10 w-10 rounded object-cover" alt="" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground">{p.brand} · {p.availability}</p>
                  </div>
                  <span className="text-xs font-bold text-green-400">{p.price} {p.currency}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="orders" className="space-y-3 mt-3">
          <div className="flex gap-2">
            <Input placeholder="Commerce Account ID" value={commerceAccountId} onChange={e => setCommerceAccountId(e.target.value)} className="text-sm flex-1" />
            <Button size="sm" onClick={fetchOrders} disabled={loading}><RefreshCw className="h-3.5 w-3.5 mr-1" />Load</Button>
          </div>
          <div className="space-y-2">
            {orders.map(o => (
              <Card key={o.id} className="border-border/50">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-foreground">Order #{o.merchant_order_id || o.id?.substring(0, 8)}</p>
                      <p className="text-[10px] text-muted-foreground">{o.items?.length || 0} items · {o.channel}</p>
                    </div>
                    <Badge variant="outline" className="text-[9px]">{o.order_status?.state || o.order_status}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-3 mt-3">
          <div className="flex gap-2">
            <Input placeholder="Commerce Account ID" value={commerceAccountId} onChange={e => setCommerceAccountId(e.target.value)} className="text-sm flex-1" />
            <Button size="sm" onClick={fetchReports} disabled={loading}><RefreshCw className="h-3.5 w-3.5 mr-1" />Load</Button>
          </div>
          <div className="space-y-2">
            {reports.map(r => (
              <Card key={r.id} className="border-border/50">
                <CardContent className="p-2 flex items-center justify-between text-xs">
                  <span className="text-foreground">{r.transaction_type}</span>
                  <span className="text-green-400 font-semibold">${((r.gross_amount?.amount || 0) / 100).toFixed(2)}</span>
                  <span className="text-muted-foreground">{r.transaction_date ? new Date(r.transaction_date).toLocaleDateString() : ""}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FBCommerceHub;
