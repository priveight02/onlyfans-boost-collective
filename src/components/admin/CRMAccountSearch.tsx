import { useState } from "react";
import { Search, Plus, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import CreditCostBadge from "./CreditCostBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CRMAccountSearchProps {
  onSearch: (query: string) => void;
  onFilterStatus: (status: string) => void;
  onFilterTier: (tier: string) => void;
  onAddAccount: () => void;
}

const CRMAccountSearch = ({ onSearch, onFilterStatus, onFilterTier, onAddAccount }: CRMAccountSearchProps) => {
  const [query, setQuery] = useState("");

  const handleSearch = (value: string) => {
    setQuery(value);
    onSearch(value);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
        <Input
          placeholder="Search by username, display name, or email..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-accent h-10"
        />
      </div>
      <div className="flex gap-2">
        <Select onValueChange={onFilterStatus} defaultValue="all">
          <SelectTrigger className="w-[130px] bg-white/5 border-white/10 text-white/70 h-10">
            <Filter className="h-3.5 w-3.5 mr-1.5" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-[hsl(220,60%,13%)] border-white/10">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="onboarding">Onboarding</SelectItem>
          </SelectContent>
        </Select>
        <Select onValueChange={onFilterTier} defaultValue="all">
          <SelectTrigger className="w-[130px] bg-white/5 border-white/10 text-white/70 h-10">
            <SelectValue placeholder="Tier" />
          </SelectTrigger>
          <SelectContent className="bg-[hsl(220,60%,13%)] border-white/10">
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="premium">Premium</SelectItem>
            <SelectItem value="vip">VIP</SelectItem>
            <SelectItem value="enterprise">Enterprise</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={onAddAccount} className="bg-accent hover:bg-accent/80 text-white gap-1.5 h-10">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Account</span>
          <CreditCostBadge cost={5} />
        </Button>
      </div>
    </div>
  );
};

export default CRMAccountSearch;
