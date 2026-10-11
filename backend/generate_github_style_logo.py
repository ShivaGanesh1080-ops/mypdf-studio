import pymupdf
from PIL import Image

# GitHub-inspired MyPDF circular emblem:
# High-contrast solid charcoal backing (#0f172a), crisp folded document shape,
# bold red badge (#ef4444) with high-legibility "PDF" lettering.
svg_content = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <!-- GitHub-Style Circular Dark Silhouette -->
  <circle cx="256" cy="256" r="256" fill="#0f172a" />
  
  <!-- Subtle Crimson Outer Ring for Brand Accent -->
  <circle cx="256" cy="256" r="244" fill="none" stroke="#ef4444" stroke-width="12" />

  <!-- Crisp White Folded Document Sheet -->
  <path d="M 144 96 H 288 L 368 176 V 396 A 16 16 0 0 1 352 412 H 160 A 16 16 0 0 1 144 396 Z" fill="#ffffff" />
  
  <!-- Sleek Top-Right Corner Fold -->
  <path d="M 288 96 V 160 A 16 16 0 0 0 304 176 H 368 Z" fill="#cbd5e1" />

  <!-- Bold Crimson Center PDF Badge -->
  <rect x="112" y="228" width="248" height="108" rx="22" fill="#ef4444" />
  <text x="236" y="306" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="900" font-size="70" fill="#ffffff" text-anchor="middle" letter-spacing="2">PDF</text>
  
  <!-- Lower Document Accent Line -->
  <rect x="156" y="362" width="130" height="14" rx="7" fill="#cbd5e1" />
</svg>"""

# 1. Save SVG in frontend/public
with open('../frontend/public/favicon.svg', 'w', encoding='utf-8') as f:
    f.write(svg_content)

# 2. Render 512x512 PNG
doc = pymupdf.open(stream=svg_content.encode('utf-8'), filetype='svg')
page = doc[0]
pix512 = page.get_pixmap(alpha=True)
pix512.save('../frontend/public/icon-512.png')

# 3. Render 192x192 PNG for PWA
scale192 = 192.0 / page.rect.width
pix192 = page.get_pixmap(matrix=pymupdf.Matrix(scale192, scale192), alpha=True)
pix192.save('../frontend/public/icon-192.png')

# 4. Render 32x32 PNG for crisp tab favicon
scale32 = 32.0 / page.rect.width
pix32 = page.get_pixmap(matrix=pymupdf.Matrix(scale32, scale32), alpha=True)
pix32.save('../frontend/public/favicon-32x32.png')

# 5. Generate multi-resolution favicon.ico (16, 32, 48) using Pillow
img512 = Image.open('../frontend/public/icon-512.png')
img512.save('../frontend/public/favicon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])

print('SUCCESS: Generated favicon.svg, favicon-32x32.png, favicon.ico, icon-192.png, icon-512.png')
