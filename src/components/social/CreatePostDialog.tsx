import { useState, useRef } from 'react';
import { Image, X, Globe, Users, Lock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createPost } from '@/hooks/useSocial';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  onCreated: () => void;
  trigger?: React.ReactNode;
}

export default function CreatePostDialog({ onCreated, trigger }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [visibility, setVisibility] = useState('public');
  const [posting, setPosting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
    }
  };

  const handlePost = async () => {
    if (!user || (!caption.trim() && !file)) return;
    setPosting(true);
    const result = await createPost(user.id, caption.trim(), file || undefined, visibility);
    setPosting(false);
    if (result) {
      setCaption('');
      setFile(null);
      setPreview(null);
      setOpen(false);
      onCreated();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button className="bg-primary text-primary-foreground">New Post</Button>}
      </DialogTrigger>
      <DialogContent className="bg-card border-border/50 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground">Create Post</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            value={caption}
            onChange={e => setCaption(e.target.value)}
            placeholder="What's on your mind? Use #hashtags..."
            className="bg-muted/30 border-border/30 min-h-[120px] text-foreground"
          />

          {preview && (
            <div className="relative rounded-xl overflow-hidden">
              <img src={preview} alt="Preview" className="w-full max-h-80 object-cover" />
              <button onClick={() => { setFile(null); setPreview(null); }} className="absolute top-2 right-2 bg-background/80 rounded-full p-1">
                <X className="h-4 w-4 text-foreground" />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleFile} className="hidden" />
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="text-foreground border-border/50">
                <Image className="h-4 w-4 mr-1" /> Media
              </Button>
              <Select value={visibility} onValueChange={setVisibility}>
                <SelectTrigger className="w-36 h-8 text-xs bg-muted/30 border-border/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public"><div className="flex items-center gap-1"><Globe className="h-3 w-3" /> Public</div></SelectItem>
                  <SelectItem value="followers"><div className="flex items-center gap-1"><Users className="h-3 w-3" /> Followers</div></SelectItem>
                  <SelectItem value="private"><div className="flex items-center gap-1"><Lock className="h-3 w-3" /> Private</div></SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handlePost} disabled={posting || (!caption.trim() && !file)} className="bg-primary text-primary-foreground">
              {posting ? 'Posting...' : 'Post'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
