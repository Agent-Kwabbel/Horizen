import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast: "bg-black/90 backdrop-blur-md border-white/10 text-white",
          title: "text-white",
          description: "text-white/70",
          actionButton: "bg-white/10 text-white hover:bg-white/20",
          cancelButton: "bg-white/5 text-white/70 hover:bg-white/10",
          error: "bg-red-950/90 border-red-500/20",
          success: "bg-green-950/90 border-green-500/20",
          warning: "bg-yellow-950/90 border-yellow-500/20",
          info: "bg-blue-950/90 border-blue-500/20",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
