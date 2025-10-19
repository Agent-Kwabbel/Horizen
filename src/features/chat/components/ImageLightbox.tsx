import { createPortal } from "react-dom"
import { Kbd } from "@/components/ui/kbd"

type ImageLightboxProps = {
  imageUrl: string | null
  onClose: () => void
}

export default function ImageLightbox({ imageUrl }: ImageLightboxProps) {
  if (!imageUrl) return null

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in">
      <div className="flex flex-col items-center gap-3">
        <img
          src={imageUrl}
          alt="Full size"
          className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
        />
        <div className="text-white/70 text-sm bg-black/50 px-4 py-2 rounded-full backdrop-blur">
          Press <Kbd>Esc</Kbd> to close
        </div>
      </div>
    </div>,
    document.body
  )
}
