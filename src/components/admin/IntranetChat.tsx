import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageCircle, Plus, Send, Paperclip, Image, FileText, Users, Hash, Trash2, Settings, X, Download, File,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import CreditCostBadge from "./CreditCostBadge";
import { useCreditAction } from "@/hooks/useCreditAction";
import { useAuth } from "@/hooks/useAuth";

const IntranetChat = () => {
  const { user } = useAuth();
  const { performAction } = useCreditAction();
  const [rooms, setRooms] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showManageMembers, setShowManageMembers] = useState(false);
  const [roomForm, setRoomForm] = useState({ name: "", room_type: "group" });
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showContractPicker, setShowContractPicker] = useState(false);

  useEffect(() => {
    loadRooms();
    loadTeam();
    loadContracts();
  }, []);

  useEffect(() => {
    if (!selectedRoom) return;
    loadMessages(selectedRoom.id);
    loadRoomMembers(selectedRoom.id);

    const channel = supabase
      .channel(`room-${selectedRoom.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `room_id=eq.${selectedRoom.id}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedRoom?.id]);

  const loadRooms = async () => {
    const { data } = await supabase.from("chat_rooms").select("*").order("updated_at", { ascending: false });
    setRooms(data || []);
  };

  const loadTeam = async () => {
    const { data } = await supabase.from("team_members").select("*").order("name");
    setTeamMembers(data || []);
  };

  const loadContracts = async () => {
    const { data } = await supabase.from("contracts").select("id, title, contract_type, status").order("created_at", { ascending: false });
    setContracts(data || []);
  };

  const loadMessages = async (roomId: string) => {
    const { data } = await supabase.from("chat_messages").select("*").eq("room_id", roomId).order("created_at", { ascending: true });
    setMessages(data || []);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const loadRoomMembers = async (roomId: string) => {
    const { data } = await supabase.from("chat_room_members").select("*, team_members(name, role, email)").eq("room_id", roomId);
    setMembers(data || []);
  };

  const handleCreateRoom = async () => {
    if (!roomForm.name) return toast.error("Room name required");
    await performAction('create_chat_room', async () => {
      const { data, error } = await supabase.from("chat_rooms").insert({
        name: roomForm.name,
        room_type: roomForm.room_type,
        created_by: user?.id,
      }).select().single();
      if (error) throw error;

      // Add selected members
      if (selectedMembers.length > 0) {
        const memberInserts = selectedMembers.map((tmId) => ({ room_id: data.id, team_member_id: tmId, user_id: null }));
        await supabase.from("chat_room_members").insert(memberInserts);
      }
      // Add self
      await supabase.from("chat_room_members").insert({ room_id: data.id, user_id: user?.id, team_member_id: null });

      toast.success("Room created!");
      setShowCreateRoom(false);
      setRoomForm({ name: "", room_type: "group" });
      setSelectedMembers([]);
      loadRooms();
      setSelectedRoom(data);
    });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedRoom) return;
    const { error } = await supabase.from("chat_messages").insert({
      room_id: selectedRoom.id,
      sender_name: user?.email?.split("@")[0] || "Admin",
      sender_id: user?.id,
      content: newMessage,
      message_type: "text",
    });
    if (error) return toast.error("Failed to send");
    setNewMessage("");
    // Update room timestamp
    await supabase.from("chat_rooms").update({ updated_at: new Date().toISOString() }).eq("id", selectedRoom.id);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedRoom) return;
    setUploading(true);

    const filePath = `${selectedRoom.id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("chat-files").upload(filePath, file);
    if (uploadError) {
      setUploading(false);
      return toast.error("Upload failed");
    }

    const { data: urlData } = supabase.storage.from("chat-files").getPublicUrl(filePath);
    const isImage = file.type.startsWith("image/");

    await supabase.from("chat_messages").insert({
      room_id: selectedRoom.id,
      sender_name: user?.email?.split("@")[0] || "Admin",
      sender_id: user?.id,
      content: isImage ? "" : file.name,
      message_type: isImage ? "image" : "file",
      file_url: urlData.publicUrl,
      file_name: file.name,
      file_size: file.size,
    });

    await supabase.from("chat_rooms").update({ updated_at: new Date().toISOString() }).eq("id", selectedRoom.id);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendContract = async (contract: any) => {
    if (!selectedRoom) return;
    await supabase.from("chat_messages").insert({
      room_id: selectedRoom.id,
      sender_name: user?.email?.split("@")[0] || "Admin",
      sender_id: user?.id,
      content: `📄 Contract: ${contract.title}`,
      message_type: "contract",
      contract_id: contract.id,
      metadata: { contract_title: contract.title, contract_type: contract.contract_type, contract_status: contract.status },
    });
    setShowContractPicker(false);
    toast.success("Contract shared");
  };

  const handleAddMember = async (teamMemberId: string) => {
    if (!selectedRoom) return;
    const exists = members.find((m) => m.team_member_id === teamMemberId);
    if (exists) return toast.error("Already a member");
    await supabase.from("chat_room_members").insert({ room_id: selectedRoom.id, team_member_id: teamMemberId });
    toast.success("Member added");
    loadRoomMembers(selectedRoom.id);
  };

  const handleRemoveMember = async (memberId: string) => {
    await supabase.from("chat_room_members").delete().eq("id", memberId);
    toast.success("Removed");
    loadRoomMembers(selectedRoom.id);
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm("Delete this room and all messages?")) return;
    await supabase.from("chat_rooms").delete().eq("id", roomId);
    if (selectedRoom?.id === roomId) setSelectedRoom(null);
    toast.success("Room deleted");
    loadRooms();
  };

  const toggleMemberSelect = (id: string) => {
    setSelectedMembers((prev) => prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]);
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-280px)] min-h-[500px]">
      {/* Sidebar - Rooms */}
      <div className="w-72 shrink-0 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white">Channels</h3>
            <CreditCostBadge cost={0} variant="header" label="free" />
          </div>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-white/40 hover:text-white" onClick={() => setShowCreateRoom(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="space-y-1">
            {rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => setSelectedRoom(room)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors group ${
                  selectedRoom?.id === room.id ? "bg-accent/20 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Hash className="h-4 w-4 shrink-0 text-white/30" />
                <span className="text-sm truncate flex-1">{room.name}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteRoom(room.id); }}
                  className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-opacity"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </button>
            ))}
            {rooms.length === 0 && (
              <p className="text-xs text-white/20 px-3 py-4 text-center">No channels yet</p>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white/[0.02] rounded-xl border border-white/10 overflow-hidden">
        {selectedRoom ? (
          <>
            {/* Room Header */}
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-accent" />
                <span className="text-sm font-bold text-white">{selectedRoom.name}</span>
                <Badge variant="outline" className="text-[9px] border-white/10 text-white/30">{members.length} members</Badge>
              </div>
              <Button size="sm" variant="ghost" className="h-7 text-xs text-white/40 gap-1" onClick={() => setShowManageMembers(true)}>
                <Users className="h-3 w-3" /> Members
              </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 px-4 py-3">
              <div className="space-y-3">
                {messages.map((msg) => {
                  const isOwn = msg.sender_id === user?.id;
                  return (
                    <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[70%] ${isOwn ? "bg-accent/20 border-accent/30" : "bg-white/5 border-white/10"} border rounded-xl px-3 py-2`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-medium text-accent">{msg.sender_name}</span>
                          <span className="text-[9px] text-white/20">{formatTime(msg.created_at)}</span>
                        </div>

                        {msg.message_type === "text" && (
                          <p className="text-sm text-white/80 whitespace-pre-wrap">{msg.content}</p>
                        )}

                        {msg.message_type === "image" && (
                          <div>
                            <img src={msg.file_url} alt={msg.file_name} className="max-w-full max-h-[300px] rounded-lg object-cover" />
                            <p className="text-[10px] text-white/30 mt-1">{msg.file_name}</p>
                          </div>
                        )}

                        {msg.message_type === "file" && (
                          <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                            <File className="h-5 w-5 text-blue-400 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs text-white truncate">{msg.file_name}</p>
                              {msg.file_size && <p className="text-[9px] text-white/30">{formatSize(msg.file_size)}</p>}
                            </div>
                            <Download className="h-3 w-3 text-white/30 shrink-0" />
                          </a>
                        )}

                        {msg.message_type === "contract" && (
                          <div className="flex items-center gap-2 p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
                            <FileText className="h-5 w-5 text-purple-400 shrink-0" />
                            <div>
                              <p className="text-xs text-white font-medium">{msg.metadata?.contract_title || msg.content}</p>
                              <div className="flex items-center gap-1 mt-0.5">
                                <Badge className="text-[8px] bg-purple-500/20 text-purple-400">{msg.metadata?.contract_type}</Badge>
                                <Badge className="text-[8px] bg-white/10 text-white/40">{msg.metadata?.contract_status}</Badge>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="px-4 py-3 border-t border-white/10">
              <div className="flex items-center gap-2">
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-white/30 hover:text-white" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-white/30 hover:text-white" onClick={() => { fileInputRef.current?.setAttribute("accept", "image/*"); fileInputRef.current?.click(); }} disabled={uploading}>
                  <Image className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-purple-400/50 hover:text-purple-400" onClick={() => setShowContractPicker(true)}>
                  <FileText className="h-4 w-4" />
                </Button>
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/20 h-8 text-sm"
                  disabled={uploading}
                />
                <Button size="sm" onClick={handleSendMessage} disabled={!newMessage.trim() || uploading} className="h-8 w-8 p-0">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              {uploading && <p className="text-[10px] text-accent mt-1 animate-pulse">Uploading file...</p>}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-white/20">
            <MessageCircle className="h-12 w-12 mb-3" />
            <p className="text-sm">Select a channel or create one</p>
            <p className="text-xs mt-1">Private team communication</p>
          </div>
        )}
      </div>

      {/* Create Room Dialog */}
      <Dialog open={showCreateRoom} onOpenChange={setShowCreateRoom}>
        <DialogContent className="bg-[hsl(220,50%,12%)] border-white/10 text-white">
          <DialogHeader><DialogTitle>Create Channel</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-white/70 text-xs">Channel Name</Label>
              <Input value={roomForm.name} onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })} className="bg-white/5 border-white/10 text-white" placeholder="e.g. general, strategy, content-team" />
            </div>
            <div>
              <Label className="text-white/70 text-xs">Type</Label>
              <Select value={roomForm.room_type} onValueChange={(v) => setRoomForm({ ...roomForm, room_type: v })}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[hsl(220,50%,15%)] border-white/10">
                  <SelectItem value="group" className="text-white">Group Channel</SelectItem>
                  <SelectItem value="direct" className="text-white">Direct Message</SelectItem>
                  <SelectItem value="announcement" className="text-white">Announcement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-white/70 text-xs">Add Members</Label>
              <div className="space-y-1 max-h-[200px] overflow-y-auto mt-2">
                {teamMembers.map((tm) => (
                  <button
                    key={tm.id}
                    onClick={() => toggleMemberSelect(tm.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                      selectedMembers.includes(tm.id) ? "bg-accent/20 border border-accent/30" : "bg-white/5 border border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-white font-bold">
                      {tm.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white truncate">{tm.name}</p>
                      <p className="text-[10px] text-white/30">{tm.role}</p>
                    </div>
                    {selectedMembers.includes(tm.id) && <Badge className="text-[8px] bg-accent/30 text-accent">Added</Badge>}
                  </button>
                ))}
                {teamMembers.length === 0 && <p className="text-xs text-white/30 text-center py-2">No team members yet</p>}
              </div>
            </div>
            <Button onClick={handleCreateRoom} className="w-full">Create Channel</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Members Dialog */}
      <Dialog open={showManageMembers} onOpenChange={setShowManageMembers}>
        <DialogContent className="bg-[hsl(220,50%,12%)] border-white/10 text-white">
          <DialogHeader><DialogTitle>Channel Members</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between px-3 py-2 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-[10px] text-accent font-bold">
                      {(m.team_members?.name || "A")[0]}
                    </div>
                    <div>
                      <p className="text-xs text-white">{m.team_members?.name || "Admin"}</p>
                      <p className="text-[10px] text-white/30">{m.team_members?.role || "admin"}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-400/40 hover:text-red-400" onClick={() => handleRemoveMember(m.id)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            <div>
              <Label className="text-white/70 text-xs">Add Member</Label>
              <Select onValueChange={handleAddMember}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1"><SelectValue placeholder="Select team member" /></SelectTrigger>
                <SelectContent className="bg-[hsl(220,50%,15%)] border-white/10">
                  {teamMembers.filter((tm) => !members.find((m) => m.team_member_id === tm.id)).map((tm) => (
                    <SelectItem key={tm.id} value={tm.id} className="text-white">{tm.name} ({tm.role})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contract Picker Dialog */}
      <Dialog open={showContractPicker} onOpenChange={setShowContractPicker}>
        <DialogContent className="bg-[hsl(220,50%,12%)] border-white/10 text-white">
          <DialogHeader><DialogTitle>Share Contract</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {contracts.map((c) => (
              <button
                key={c.id}
                onClick={() => handleSendContract(c)}
                className="w-full flex items-center gap-3 px-3 py-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors text-left"
              >
                <FileText className="h-5 w-5 text-purple-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{c.title}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Badge className="text-[8px] bg-purple-500/20 text-purple-400">{c.contract_type}</Badge>
                    <Badge className="text-[8px] bg-white/10 text-white/40">{c.status}</Badge>
                  </div>
                </div>
              </button>
            ))}
            {contracts.length === 0 && <p className="text-xs text-white/30 text-center py-4">No contracts created yet</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IntranetChat;
