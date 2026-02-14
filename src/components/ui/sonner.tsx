import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"
import { Check, AlertCircle, Info, Loader2 } from "lucide-react"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-right"
      expand={false}
      richColors
      closeButton
      toastOptions={{
        duration: 4000,
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-[hsl(222,30%,12%)] group-[.toaster]:text-white group-[.toaster]:border-[rgba(255,255,255,0.12)] group-[.toaster]:shadow-[0_8px_32px_rgba(0,0,0,0.5)] group-[.toaster]:backdrop-blur-xl group-[.toaster]:rounded-xl group-[.toaster]:px-4 group-[.toaster]:py-3",
          title: "group-[.toast]:text-white group-[.toast]:font-semibold group-[.toast]:text-sm",
          description: "group-[.toast]:text-[rgba(255,255,255,0.6)] group-[.toast]:text-xs",
          actionButton:
            "group-[.toast]:bg-white group-[.toast]:text-[hsl(222,30%,12%)] group-[.toast]:font-semibold group-[.toast]:text-xs group-[.toast]:rounded-lg group-[.toast]:px-3 group-[.toast]:py-1.5 group-[.toast]:hover:bg-white/90",
          cancelButton:
            "group-[.toast]:bg-white/10 group-[.toast]:text-white/70 group-[.toast]:text-xs group-[.toast]:rounded-lg group-[.toast]:px-3 group-[.toast]:py-1.5 group-[.toast]:hover:bg-white/20 group-[.toast]:border-white/10",
          closeButton:
            "group-[.toast]:bg-white/10 group-[.toast]:text-white/60 group-[.toast]:border-white/10 group-[.toast]:hover:bg-white/20 group-[.toast]:hover:text-white group-[.toast]:rounded-lg",
          success:
            "group-[.toaster]:border-emerald-500/20 group-[.toaster]:bg-[hsl(222,30%,12%)]",
          error:
            "group-[.toaster]:border-red-500/20 group-[.toaster]:bg-[hsl(222,30%,12%)]",
          info:
            "group-[.toaster]:border-blue-500/20 group-[.toaster]:bg-[hsl(222,30%,12%)]",
          warning:
            "group-[.toaster]:border-amber-500/20 group-[.toaster]:bg-[hsl(222,30%,12%)]",
        },
      }}
      icons={{
        success: <Check className="h-4 w-4 text-emerald-400" />,
        error: <AlertCircle className="h-4 w-4 text-red-400" />,
        info: <Info className="h-4 w-4 text-blue-400" />,
        warning: <AlertCircle className="h-4 w-4 text-amber-400" />,
        loading: <Loader2 className="h-4 w-4 text-white/60 animate-spin" />,
      }}
      {...props}
    />
  )
}

export { Toaster }
