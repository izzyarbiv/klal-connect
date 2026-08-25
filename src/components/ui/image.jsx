import * as React from "react"
import { cn } from "@/lib/utils"

// Shown when there is no image yet, or when one fails to load. Served from our
// own origin so a broken image never depends on a third party being up.
const FALLBACK_IMAGE_URL = "/brand/placeholder.svg"

/**
 * Image with a built-in fallback.
 *
 * Uploads are served from /api/files as-is, so there is no CDN transform step:
 * the browser gets the original file and CSS sizes it. `fittingType="fill"`
 * (the default) crops to fill the box; `"fit"` letterboxes inside it.
 *
 * Renders a real <img> in every state, including the empty one — callers size
 * it with className, and a placeholder <div> would break that contract.
 */
const Image = React.forwardRef(
  ({ src, fittingType = "fill", className, alt = "", ...props }, ref) => {
    const [imgSrc, setImgSrc] = React.useState(src || FALLBACK_IMAGE_URL)

    React.useEffect(() => {
      setImgSrc(src || FALLBACK_IMAGE_URL)
    }, [src])

    const isFallback = imgSrc === FALLBACK_IMAGE_URL

    return (
      <img
        ref={ref}
        src={imgSrc}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={cn(fittingType === "fit" ? "object-contain" : "object-cover", className)}
        // Guard against a loop: if the fallback itself fails, stop swapping.
        onError={() => { if (!isFallback) setImgSrc(FALLBACK_IMAGE_URL) }}
        data-empty-image={!src || undefined}
        {...props}
      />
    )
  }
)
Image.displayName = "Image"

export { Image, FALLBACK_IMAGE_URL }
