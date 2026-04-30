"""
Generate app icons from icon.jpg:
- Remove white border (make transparent)
- Apply rounded corners matching icon-fixed-v3.png style
- Export multiple sizes: 192x192, 512x512 (PWA), 180x180 (Apple), 32x32 (favicon)
"""
from PIL import Image, ImageDraw
import numpy as np
import os

SRC = r"C:\Users\Googl\source\repos\tabereco\public\icon.jpg"
OUT_DIR = r"C:\Users\Googl\source\repos\tabereco\public"

def remove_white_border(img: Image.Image, threshold: int = 240) -> Image.Image:
    """Convert near-white pixels around the rounded square to transparent."""
    img = img.convert("RGBA")
    data = np.array(img)
    r, g, b, a = data[:,:,0], data[:,:,1], data[:,:,2], data[:,:,3]
    # Pixels that are very white (all channels high)
    white_mask = (r > threshold) & (g > threshold) & (b > threshold)
    data[white_mask, 3] = 0
    return Image.fromarray(data)

def apply_rounded_corners(img: Image.Image, radius_ratio: float = 0.225) -> Image.Image:
    """Apply rounded corners matching iOS app icon style."""
    img = img.convert("RGBA")
    w, h = img.size
    radius = int(min(w, h) * radius_ratio)
    mask = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([(0, 0), (w-1, h-1)], radius=radius, fill=255)
    result = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    result.paste(img, mask=mask)
    return result

def generate_icon(size: int, filename: str):
    src = Image.open(SRC).convert("RGB")
    w, h = src.size
    
    # Crop the pink square area (removing the white outer border)
    # Based on the image, the pink area is approximately from 12% to 88%
    padding = int(min(w, h) * 0.12)
    src = src.crop((padding, padding, w - padding, h - padding))
    
    # Resize to target size
    src = src.resize((size, size), Image.LANCZOS)
    
    # For app icons (especially iOS), we SHOULD NOT have transparency.
    # The OS handles the rounding.
    out_path = os.path.join(OUT_DIR, filename)
    src.save(out_path, "PNG")
    print(f"Saved: {out_path} ({size}x{size})")

# PWA icons
generate_icon(192, "icon-192.png")
generate_icon(512, "icon-512.png")
# Apple touch icon
generate_icon(180, "apple-touch-icon.png")
# Favicon
generate_icon(32, "favicon-32.png")
# Also save a full-size version as the main icon
generate_icon(1024, "icon-1024.png")

print("Done!")
