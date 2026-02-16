import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Plus, Download, Pen, Check, Clock, X, Eye, Trash2, ArrowUpRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCreditAction } from "@/hooks/useCreditAction";
import CreditCostBadge from "./CreditCostBadge";

const CONTRACT_TEMPLATES: Record<string, { title: string; content: string }> = {
  nda: {
    title: "Non-Disclosure Agreement",
    content: `NON-DISCLOSURE AGREEMENT

This Non-Disclosure Agreement ("Agreement") is entered into as of [DATE].

BETWEEN:
[AGENCY NAME] ("Disclosing Party")
AND
[EMPLOYEE/CONTRACTOR NAME] ("Receiving Party")

1. CONFIDENTIAL INFORMATION
The Receiving Party agrees to hold in confidence all proprietary information including but not limited to: creator identities, account credentials, revenue data, business strategies, subscriber data, and messaging content.

2. OBLIGATIONS
The Receiving Party shall:
- Not disclose any Confidential Information to third parties
- Use Confidential Information only for authorized business purposes
- Return all materials upon termination of engagement

3. DURATION
This Agreement remains in effect for 2 years after the termination of the business relationship.

4. REMEDIES
Any breach may result in immediate termination and legal action.

SIGNATURES:
Disclosing Party: _________________________ Date: _________
Receiving Party: _________________________ Date: _________`,
  },
  creator_agreement: {
    title: "Creator Management Agreement",
    content: `CREATOR MANAGEMENT AGREEMENT

This Agreement is entered into as of [DATE].

BETWEEN:
[AGENCY NAME] ("Agency")
AND
[CREATOR NAME] ("Creator")

1. SERVICES
The Agency agrees to provide: account management, content strategy, messaging management, traffic generation, and revenue optimization.

2. COMPENSATION
Agency commission: [PERCENTAGE]% of gross revenue generated through managed platforms.

3. TERM
This Agreement is effective for [DURATION] months, renewable upon mutual agreement.

4. OBLIGATIONS
Creator agrees to: provide necessary account access, respond to communications within 24 hours, and maintain platform compliance.

Agency agrees to: provide professional management services, maintain confidentiality, and deliver monthly performance reports.

5. TERMINATION
Either party may terminate with 30 days written notice.

SIGNATURES:
Agency: _________________________ Date: _________
Creator: _________________________ Date: _________`,
  },
  contractor: {
    title: "Independent Contractor Agreement",
    content: `INDEPENDENT CONTRACTOR AGREEMENT

This Agreement is entered into as of [DATE].

BETWEEN:
[AGENCY NAME] ("Company")
AND
[CONTRACTOR NAME] ("Contractor")

1. SCOPE OF WORK
The Contractor is engaged to perform: [DESCRIBE SERVICES - e.g., messaging management, social media management, content creation support].

2. COMPENSATION
Contractor will be paid [AMOUNT] per [HOUR/WEEK/MONTH].

3. RELATIONSHIP
The Contractor is an independent contractor, not an employee.

4. CONFIDENTIALITY
Contractor agrees to maintain strict confidentiality of all business information.

5. TERM
This Agreement begins on [START DATE] and continues until terminated by either party with 14 days notice.

SIGNATURES:
Company: _________________________ Date: _________
Contractor: _________________________ Date: _________`,
  },
  custom: {
    title: "Custom Contract",
    content: `[YOUR CUSTOM CONTRACT CONTENT HERE]

Enter your contract terms, conditions, and clauses.

SIGNATURES:
Party A: _________________________ Date: _________
Party B: _________________________ Date: _________`,
  },
};

const statusColors: Record<string, string> = {
  draft: "bg-white/10 text-white/60",
  sent: "bg-blue-500/20 text-blue-400",
  signed: "bg-emerald-500/20 text-emerald-400",
  expired: "bg-red-500/20 text-red-400",
  cancelled: "bg-white/5 text-white/30",
};

const ContractsManager = () => {
  const [contracts, setContracts] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [viewContract, setViewContract] = useState<any | null>(null);
  const [signMode, setSignMode] = useState(false);
  const [signatureName, setSignatureName] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const { performAction } = useCreditAction();

  const [form, setForm] = useState({
    contract_type: "nda",
    title: "",
    content: "",
    account_id: "",
    team_member_id: "",
  });

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    const [c, a, t] = await Promise.all([
      supabase.from("contracts").select("*").order("created_at", { ascending: false }),
      supabase.from("managed_accounts").select("id, username, display_name"),
      supabase.from("team_members").select("id, name, email, role"),
    ]);
    setContracts(c.data || []);
    setAccounts(a.data || []);
    setTeamMembers(t.data || []);
  };

  const handleTemplateSelect = (type: string) => {
    const template = CONTRACT_TEMPLATES[type];
    setForm({ ...form, contract_type: type, title: template.title, content: template.content });
  };

  const handleCreate = async () => {
    if (!form.title) return toast.error("Title is required");
    await performAction('create_contract', async () => {
      const { error } = await supabase.from("contracts").insert({
        title: form.title,
        contract_type: form.contract_type,
        content: form.content,
        account_id: form.account_id || null,
        team_member_id: form.team_member_id || null,
      });
      if (error) { toast.error("Failed to create contract"); throw error; }
      toast.success("Contract created");
      setShowCreate(false);
      setForm({ contract_type: "nda", title: "", content: "", account_id: "", team_member_id: "" });
      loadAll();
    });
  };

  const handleSign = async (contract: any) => {
    const canvas = canvasRef.current;
    const signatureImage = canvas ? canvas.toDataURL() : null;
    await performAction('sign_contract', async () => {
      const { error } = await supabase.from("contracts").update({
        status: "signed",
        signed_at: new Date().toISOString(),
        signature_data: { signer_name: signatureName, signature_image: signatureImage, signed_at: new Date().toISOString() },
      }).eq("id", contract.id);
      if (error) { toast.error("Failed to sign"); throw error; }
      toast.success("Contract signed!");
      setSignMode(false);
      setViewContract(null);
      loadAll();
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this contract?")) return;
    await supabase.from("contracts").delete().eq("id", id);
    toast.success("Deleted");
    loadAll();
  };

  const handleStatusChange = async (id: string, status: string) => {
    await supabase.from("contracts").update({ status }).eq("id", id);
    toast.success("Status updated");
    loadAll();
  };

  // Canvas drawing
  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsDrawing(true);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };
  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#fff";
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };
  const stopDraw = () => setIsDrawing(false);
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Contracts & Agreements</h3>
          <p className="text-xs text-white/40">{contracts.length} contracts total</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1"><Plus className="h-3 w-3" /> New Contract</Button>
          </DialogTrigger>
          <DialogContent className="bg-[hsl(220,50%,12%)] border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create Contract</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-white/70 text-xs">Template</Label>
                <Select value={form.contract_type} onValueChange={handleTemplateSelect}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[hsl(220,50%,15%)] border-white/10">
                    <SelectItem value="nda" className="text-white">Non-Disclosure Agreement</SelectItem>
                    <SelectItem value="creator_agreement" className="text-white">Creator Management Agreement</SelectItem>
                    <SelectItem value="contractor" className="text-white">Independent Contractor Agreement</SelectItem>
                    <SelectItem value="custom" className="text-white">Custom Contract</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white/70 text-xs">Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-white/5 border-white/10 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-white/70 text-xs">Assign to Creator (optional)</Label>
                  <Select value={form.account_id} onValueChange={(v) => setForm({ ...form, account_id: v })}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent className="bg-[hsl(220,50%,15%)] border-white/10">
                      {accounts.map((a) => <SelectItem key={a.id} value={a.id} className="text-white">{a.display_name || a.username}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-white/70 text-xs">Assign to Team Member (optional)</Label>
                  <Select value={form.team_member_id} onValueChange={(v) => setForm({ ...form, team_member_id: v })}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent className="bg-[hsl(220,50%,15%)] border-white/10">
                      {teamMembers.map((t) => <SelectItem key={t.id} value={t.id} className="text-white">{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-white/70 text-xs">Contract Content</Label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="w-full min-h-[300px] p-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-mono leading-relaxed focus:border-accent focus:outline-none"
                />
              </div>
              <Button onClick={handleCreate} className="w-full">Create Contract</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        {["draft", "sent", "signed", "expired", "cancelled"].map((status) => (
          <Card key={status} className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold text-white">{contracts.filter((c) => c.status === status).length}</p>
              <p className="text-[10px] text-white/40 capitalize">{status}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Contracts List */}
      <div className="space-y-2">
        {contracts.length === 0 && (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-8 text-center">
              <FileText className="h-8 w-8 text-white/20 mx-auto mb-2" />
              <p className="text-white/30 text-sm">No contracts yet. Create your first one!</p>
            </CardContent>
          </Card>
        )}
        {contracts.map((contract) => {
          const acct = accounts.find((a) => a.id === contract.account_id);
          const member = teamMembers.find((t) => t.id === contract.team_member_id);
          return (
            <Card key={contract.id} className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/[0.08] transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white/10">
                    <FileText className="h-4 w-4 text-white/60" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{contract.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge className={`text-[9px] ${statusColors[contract.status] || statusColors.draft}`}>{contract.status}</Badge>
                      <span className="text-[10px] text-white/30">{contract.contract_type.replace("_", " ")}</span>
                      {acct && <span className="text-[10px] text-white/30">• {acct.display_name || acct.username}</span>}
                      {member && <span className="text-[10px] text-white/30">• {member.name}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-white/40 hover:text-white" onClick={() => setViewContract(contract)}>
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  {contract.status === "draft" && (
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-blue-400 hover:text-blue-300" onClick={() => handleStatusChange(contract.id, "sent")}>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400/50 hover:text-red-400" onClick={() => handleDelete(contract.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* View/Sign Contract Dialog */}
      {viewContract && (
        <Dialog open={!!viewContract} onOpenChange={() => { setViewContract(null); setSignMode(false); }}>
          <DialogContent className="bg-[hsl(220,50%,12%)] border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{viewContract.title}</span>
                <Badge className={statusColors[viewContract.status]}>{viewContract.status}</Badge>
              </DialogTitle>
            </DialogHeader>
            <pre className="whitespace-pre-wrap text-sm text-white/80 font-mono bg-white/5 p-4 rounded-lg border border-white/10 max-h-[400px] overflow-y-auto">
              {viewContract.content || "No content"}
            </pre>

            {viewContract.status === "signed" && viewContract.signature_data?.signer_name && (
              <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                <p className="text-xs text-emerald-400">✓ Signed by {viewContract.signature_data.signer_name} on {new Date(viewContract.signed_at).toLocaleDateString()}</p>
              </div>
            )}

            {viewContract.status !== "signed" && !signMode && (
              <Button onClick={() => setSignMode(true)} className="gap-2">
                <Pen className="h-3 w-3" /> Sign Contract
              </Button>
            )}

            {signMode && (
              <div className="space-y-3">
                <div>
                  <Label className="text-white/70 text-xs">Full Name</Label>
                  <Input value={signatureName} onChange={(e) => setSignatureName(e.target.value)} className="bg-white/5 border-white/10 text-white" placeholder="Enter full legal name" />
                </div>
                <div>
                  <Label className="text-white/70 text-xs">Draw Signature</Label>
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={120}
                    className="w-full bg-white/5 border border-white/10 rounded-lg cursor-crosshair"
                    onMouseDown={startDraw}
                    onMouseMove={draw}
                    onMouseUp={stopDraw}
                    onMouseLeave={stopDraw}
                  />
                  <Button size="sm" variant="ghost" onClick={clearCanvas} className="text-xs text-white/40 mt-1">Clear</Button>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handleSign(viewContract)} disabled={!signatureName} className="flex-1 gap-1">
                    <Check className="h-3 w-3" /> Confirm Signature
                  </Button>
                  <Button variant="ghost" onClick={() => setSignMode(false)} className="text-white/40">Cancel</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ContractsManager;
