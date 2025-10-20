import { useState } from "react"
import { toast } from "sonner"
import { resizeImage } from "../components/image-utils"

export function useImageAttachments() {
  const [attachedImages, setAttachedImages] = useState<string[]>([])

  const handleImageUpload = async (files: FileList | null) => {
    if (!files) return
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"))

    const remainingSlots = 4 - attachedImages.length
    if (remainingSlots <= 0) {
      toast.error("Maximum images reached", {
        description: "You can only attach up to 4 images per message.",
      })
      return
    }

    const filesToProcess = imageFiles.slice(0, remainingSlots)

    for (const file of filesToProcess) {
      try {
        const resizedDataUrl = await resizeImage(file)
        setAttachedImages((prev) => [...prev, resizedDataUrl])
      } catch (error) {
        console.error('Failed to process image:', error)
        toast.error("Failed to process image", {
          description: `Could not process ${file.name}. Please try another image.`,
        })
      }
    }

    if (imageFiles.length > remainingSlots) {
      toast.warning("Some images not added", {
        description: `Only added ${remainingSlots} image(s). Maximum 4 images total.`,
      })
    }
  }

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    if (attachedImages.length >= 4) {
      toast.error("Maximum images reached", {
        description: "You can only attach up to 4 images per message.",
      })
      return
    }

    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) {
          const files = new DataTransfer()
          files.items.add(file)
          handleImageUpload(files.files)
        }
      }
    }
  }

  const removeImage = (index: number) => {
    setAttachedImages((prev) => prev.filter((_, i) => i !== index))
  }

  const clearImages = () => {
    setAttachedImages([])
  }

  return {
    attachedImages,
    handleImageUpload,
    handlePaste,
    removeImage,
    clearImages,
  }
}
