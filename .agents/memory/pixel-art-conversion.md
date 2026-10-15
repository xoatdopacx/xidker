---
name: Turning the user's photos and videos into pixel art
description: Recipe and pitfalls for converting the user's meme photos/videos into the site's outlined pixel sprites with ImageMagick (the cats on /cam-on and the 404 page).
---

The user's cat memes are shown as pixel art, never as the original photos. Recipe that worked (magick only):
flood-fill the white background from the four corners (fuzz 6-8% for photos; 14% removed a video's soft floor
shadow but kept white paws), erode the alpha 1.5-2.5 px to drop the white fringe, resize to the art width,
threshold alpha at 50%, quantize to ~20-24 colors without dither, then add a 1px #1b2a1c outline by dilating
the alpha (Diamond:1). Shown at 3x with `.pixel`.

Pitfalls:
- Add a 1px transparent border before dilating, or the outline is missing wherever the art touches the canvas edge.
- `-quantize LAB` in the same command turns the later outline colour blue; do the outline in a separate magick call.
- Quantizing loses small dark features (a cat's eyes became brown smudges); paint eyes/closed-eye lines back by hand.
- A shared palette across all frames of an animation (`-remap`) keeps colours from flickering. A blue detail
  (jeans) vanished among the grey fur until saturation was raised before quantizing.
- Video memes often hold each pose for several frames; per-frame bounding boxes showed the 4.5s clip was a
  6-pose gallop at 10fps repeated, so the sprite needs only 6 frames.
- Save as PNG8: same pixels, about a third of the bytes.

**Why:** the user asked for their own cats to match the pixel-art site; these steps took several attempts.
**How to apply:** any new user-supplied picture or clip that should appear on the site.
