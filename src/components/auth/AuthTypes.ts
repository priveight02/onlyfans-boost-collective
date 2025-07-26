import { LucideIcon } from "lucide-react";

export interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface Stat {
  number: string;
  label: string;
}

export interface AuthFormProps {
  isLogin: boolean;
  setIsLogin: (value: boolean) => void;
}