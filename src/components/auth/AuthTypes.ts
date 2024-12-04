export interface Feature {
  icon: string;
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