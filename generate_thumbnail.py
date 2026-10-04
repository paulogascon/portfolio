import math
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1200, 630

# 1. Base Canvas
canvas = Image.new("RGBA", (W, H), (7, 10, 19, 255))

# 2. Ambient Glowing Orbs
glow_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
glow_draw = ImageDraw.Draw(glow_layer)

# Cyan/Emerald backlight behind ID card (right area)
glow_draw.ellipse([940 - 220, 320 - 220, 940 + 220, 320 + 220], fill=(0, 229, 255, 75))
glow_draw.ellipse([940 - 150, 320 - 150, 940 + 150, 320 + 150], fill=(16, 185, 129, 85))

# Soft Indigo & Teal ambiance on left
glow_draw.ellipse([200 - 180, 140 - 180, 200 + 180, 140 + 180], fill=(99, 102, 241, 40))
glow_draw.ellipse([320 - 180, 420 - 180, 320 + 180, 420 + 180], fill=(0, 229, 255, 35))

glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(75))
canvas = Image.alpha_composite(canvas, glow_layer)

# 3. High-tech Grid Overlay
grid_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
grid_draw = ImageDraw.Draw(grid_layer)
for x in range(0, W, 40):
    grid_draw.line([(x, 0), (x, H)], fill=(0, 229, 255, 14), width=1)
for y in range(0, H, 40):
    grid_draw.line([(0, y), (W, y)], fill=(0, 229, 255, 14), width=1)

canvas = Image.alpha_composite(canvas, grid_layer)

# 4. Outer Futuristic Tech Frame
frame_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
frame_draw = ImageDraw.Draw(frame_layer)
frame_draw.rounded_rectangle([20, 20, W - 20, H - 20], radius=24, outline=(0, 229, 255, 55), width=2)
# Sharp glowing corner markers
corner_len = 32
# Top-Left
frame_draw.line([(20, 20), (20 + corner_len, 20)], fill=(0, 255, 200, 220), width=3)
frame_draw.line([(20, 20), (20, 20 + corner_len)], fill=(0, 255, 200, 220), width=3)
# Top-Right
frame_draw.line([(W - 20 - corner_len, 20), (W - 20, 20)], fill=(0, 255, 200, 220), width=3)
frame_draw.line([(W - 20, 20), (W - 20, 20 + corner_len)], fill=(0, 255, 200, 220), width=3)
# Bottom-Left
frame_draw.line([(20, H - 20), (20 + corner_len, H - 20)], fill=(0, 255, 200, 220), width=3)
frame_draw.line([(20, H - 20 - corner_len), (20, H - 20)], fill=(0, 255, 200, 220), width=3)
# Bottom-Right
frame_draw.line([(W - 20 - corner_len, H - 20), (W - 20, H - 20)], fill=(0, 255, 200, 220), width=3)
frame_draw.line([(W - 20, H - 20 - corner_len), (W - 20, H - 20)], fill=(0, 255, 200, 220), width=3)

canvas = Image.alpha_composite(canvas, frame_layer)

# 5. Fonts setup
assets_dir = r"C:\Paulo files\My Projects\Portfolio Website Project - JP\assets"
font_script_path = os.path.join(assets_dir, "fonts", "modernline-bold.otf")

font_script = ImageFont.truetype(font_script_path, 72)
font_gascon = ImageFont.truetype("segoeuib.ttf", 54)
font_sans_large = ImageFont.truetype("segoeuib.ttf", 24)
font_sans_regular = ImageFont.truetype("segoeui.ttf", 18)
font_sans_small = ImageFont.truetype("segoeuib.ttf", 14)
font_mono_bold = ImageFont.truetype("consolab.ttf", 21)

draw = ImageDraw.Draw(canvas)

# 6. Top Status Pill
pill_x, pill_y = 65, 48
pill_w, pill_h = 410, 36
draw.rounded_rectangle([pill_x, pill_y, pill_x + pill_w, pill_y + pill_h], radius=18, fill=(15, 25, 45, 220), outline=(0, 229, 255, 90), width=1)
# Green pulse dot
draw.ellipse([pill_x + 15, pill_y + 12, pill_x + 27, pill_y + 24], fill=(16, 220, 140, 255))
draw.text((pill_x + 36, pill_y + 8), "OFFICIAL PORTFOLIO  •  BSIT 2ND YEAR", fill=(180, 235, 255), font=font_sans_small)

# 7. Name Section
# A) "Jhon Paulo" in THIN, ELEGANT script (exact website weight: single pass, gradient, gaussian glow)
jp_text = "Jhon Paulo"
dummy = Image.new("RGBA", (1, 1))
d_test = ImageDraw.Draw(dummy)
jp_bbox = d_test.textbbox((0, 0), jp_text, font=font_script)
jp_w = jp_bbox[2] - jp_bbox[0] + 60
jp_h = jp_bbox[3] - jp_bbox[1] + 60
jp_off_x = 30 - jp_bbox[0]
jp_off_y = 30 - jp_bbox[1]

# Thin single-pass mask (NO stroke thickening)
jp_mask = Image.new("L", (jp_w, jp_h), 0)
jp_m_draw = ImageDraw.Draw(jp_mask)
jp_m_draw.text((jp_off_x, jp_off_y), jp_text, font=font_script, fill=255)

# Mint to Emerald linear gradient (#00f5a0 -> #00d26a)
jp_c1 = (0, 245, 160)
jp_c2 = (0, 210, 106)
jp_grad_pixels = []
for py in range(jp_h):
    for px in range(jp_w):
        t = (px / max(1, jp_w)) * 0.7 + (py / max(1, jp_h)) * 0.3
        t = max(0.0, min(1.0, t))
        r = int(jp_c1[0] + (jp_c2[0] - jp_c1[0]) * t)
        g = int(jp_c1[1] + (jp_c2[1] - jp_c1[1]) * t)
        b = int(jp_c1[2] + (jp_c2[2] - jp_c1[2]) * t)
        jp_grad_pixels.append((r, g, b, 255))

jp_grad = Image.new("RGBA", (jp_w, jp_h))
jp_grad.putdata(jp_grad_pixels)
jp_grad.putalpha(jp_mask)

# Soft Gaussian glow behind Jhon Paulo (thin letter edges preserved)
jp_glow = Image.new("RGBA", (jp_w + 40, jp_h + 40), (0, 0, 0, 0))
jp_glow_mask = Image.new("L", (jp_w + 40, jp_h + 40), 0)
jp_gm_draw = ImageDraw.Draw(jp_glow_mask)
jp_gm_draw.text((jp_off_x + 20, jp_off_y + 20), jp_text, font=font_script, fill=255)

jp_neon = Image.new("RGBA", (jp_w + 40, jp_h + 40), (0, 245, 160, 130))
jp_neon.putalpha(jp_glow_mask)
jp_neon = jp_neon.filter(ImageFilter.GaussianBlur(8))

jp_base_x = 65
jp_base_y = 80
jp_paste_x = jp_base_x - jp_off_x
jp_paste_y = jp_base_y - jp_off_y
canvas.paste(jp_neon, (jp_paste_x - 20, jp_paste_y - 20), jp_neon)
canvas.paste(jp_grad, (jp_paste_x, jp_paste_y), jp_grad)

# B) "Gascon" in Title Case with the Website's Signature Accent Gradient (#00e5ff -> #3b82f6 -> #a855f7)
gascon_text = "Gascon"
g_bbox = d_test.textbbox((0, 0), gascon_text, font=font_gascon)
gw = g_bbox[2] - g_bbox[0] + 40
gh = g_bbox[3] - g_bbox[1] + 40
g_off_x = 20 - g_bbox[0]
g_off_y = 20 - g_bbox[1]

# 1. Text Mask
gascon_mask = Image.new("L", (gw, gh), 0)
g_mask_draw = ImageDraw.Draw(gascon_mask)
g_mask_draw.text((g_off_x, g_off_y), gascon_text, font=font_gascon, fill=255)

# 2. 135-deg Linear Gradient Image (#00e5ff -> #3b82f6 -> #a855f7)
c1 = (0, 229, 255)   # #00e5ff Cyan
c2 = (59, 130, 246)  # #3b82f6 Electric Blue
c3 = (168, 85, 247)  # #a855f7 Vibrant Purple

grad_pixels = []
for py in range(gh):
    for px in range(gw):
        t = (px / max(1, gw)) * 0.75 + (py / max(1, gh)) * 0.25
        t = max(0.0, min(1.0, t))
        if t < 0.5:
            f = t / 0.5
            r = int(c1[0] + (c2[0] - c1[0]) * f)
            g = int(c1[1] + (c2[1] - c1[1]) * f)
            b = int(c1[2] + (c2[2] - c1[2]) * f)
        else:
            f = (t - 0.5) / 0.5
            r = int(c2[0] + (c3[0] - c2[0]) * f)
            g = int(c2[1] + (c3[1] - c2[1]) * f)
            b = int(c2[2] + (c3[2] - c2[2]) * f)
        grad_pixels.append((r, g, b, 255))

gascon_grad = Image.new("RGBA", (gw, gh))
gascon_grad.putdata(grad_pixels)
gascon_grad.putalpha(gascon_mask)

# 3. Soft Gradient Drop-Shadow / Glow behind "Gascon"
glow_mask_expanded = Image.new("L", (gw + 40, gh + 40), 0)
gm_draw = ImageDraw.Draw(glow_mask_expanded)
gm_draw.text((g_off_x + 20, g_off_y + 20), gascon_text, font=font_gascon, fill=255)

cyan_glow = Image.new("RGBA", (gw + 40, gh + 40), (0, 229, 255, 120))
cyan_glow.putalpha(glow_mask_expanded)
cyan_glow = cyan_glow.filter(ImageFilter.GaussianBlur(10))

purple_glow = Image.new("RGBA", (gw + 40, gh + 40), (168, 85, 247, 130))
purple_glow.putalpha(glow_mask_expanded)
purple_glow = purple_glow.filter(ImageFilter.GaussianBlur(14))

gascon_x = jp_base_x + (jp_bbox[2] - jp_bbox[0]) + 16
gascon_y = 126
paste_x = gascon_x - g_off_x
paste_y = gascon_y - g_off_y
canvas.paste(cyan_glow, (paste_x - 20, paste_y - 20), cyan_glow)
canvas.paste(purple_glow, (paste_x - 20, paste_y - 20), purple_glow)
canvas.paste(gascon_grad, (paste_x, paste_y), gascon_grad)

# 8. Subtitle / Roles
sub_y = 224
draw = ImageDraw.Draw(canvas)
draw.text((66, sub_y), "UI/UX Prototyping  •  Motion Video Projects  •  Frontend Web", fill=(160, 195, 225), font=font_sans_regular)

# 9. STI University Card Panel
sti_card_x, sti_card_y = 65, 260
sti_card_w, sti_card_h = 575, 82
draw.rounded_rectangle([sti_card_x, sti_card_y, sti_card_x + sti_card_w, sti_card_y + sti_card_h], radius=16, fill=(12, 22, 38, 220), outline=(0, 229, 255, 60), width=1)

sti_logo_path = os.path.join(assets_dir, "images", "sti-logo.png")
if os.path.exists(sti_logo_path):
    sti_logo = Image.open(sti_logo_path).convert("RGBA")
    sti_logo = sti_logo.resize((54, 54), Image.Resampling.LANCZOS)
    canvas.paste(sti_logo, (sti_card_x + 16, sti_card_y + 14), sti_logo)
    text_offset = 84
else:
    text_offset = 20

draw.text((sti_card_x + text_offset, sti_card_y + 14), "STI West Negros University", fill=(255, 255, 255), font=font_sans_large)
draw.text((sti_card_x + text_offset, sti_card_y + 45), "Bachelor of Science in Information Technology (BSIT 2G)", fill=(150, 185, 215), font=font_sans_regular)

# 10. High-Visibility Highlighted Website URL Box
url_card_x, url_card_y = 65, 358
url_card_w, url_card_h = 575, 140
draw.rounded_rectangle([url_card_x, url_card_y, url_card_x + url_card_w, url_card_y + url_card_h], radius=18, fill=(10, 28, 50, 245), outline=(0, 240, 200, 230), width=2)

# Top label inside URL box
draw.text((url_card_x + 22, url_card_y + 14), "EXPLORE THE LIVE WEBSITE & INTERACTIVE BADGE:", fill=(0, 229, 255), font=font_sans_small)

# URL string in bold monospace with neon glow
url_text = "https://paulogascon.github.io/portfolio/"
draw.text((url_card_x + 22, url_card_y + 44), url_text, fill=(255, 255, 255), font=font_mono_bold)

# Sub-feature Pills inside the URL box
p1_x, p1_y = url_card_x + 22, url_card_y + 92
draw.rounded_rectangle([p1_x, p1_y, p1_x + 162, p1_y + 30], radius=8, fill=(0, 229, 255, 25), outline=(0, 229, 255, 80), width=1)
draw.text((p1_x + 10, p1_y + 6), "+ 3D Physics Lanyard", fill=(180, 240, 255), font=font_sans_small)

p2_x = p1_x + 172
draw.rounded_rectangle([p2_x, p1_y, p2_x + 158, p1_y + 30], radius=8, fill=(168, 85, 247, 25), outline=(168, 85, 247, 80), width=1)
draw.text((p2_x + 10, p1_y + 6), "+ Video Projects Reel", fill=(225, 190, 255), font=font_sans_small)

p3_x = p2_x + 168
draw.rounded_rectangle([p3_x, p1_y, p3_x + 168, p1_y + 30], radius=8, fill=(16, 185, 129, 25), outline=(16, 185, 129, 80), width=1)
draw.text((p3_x + 10, p1_y + 6), "+ Project Configurator", fill=(170, 245, 205), font=font_sans_small)

# 11. Bottom Action Hint / Tagline
draw.text((68, 555), "Open in Chrome, Messenger, or Safari  —  Interactive on Mobile & Desktop", fill=(115, 150, 185), font=font_sans_regular)


# ==============================================================================
# RIGHT SIDE: 3D STI ID CARD & LANYARD ASSEMBLY
# ==============================================================================

id_path = os.path.join(assets_dir, "images", "id-card-cropped.png")
hw_path = os.path.join(assets_dir, "images", "lanyard-hardware.png")
strap_path = os.path.join(assets_dir, "images", "lanyard-strap-final.png")

card_center_x = 975
card_top_y = 155

if os.path.exists(id_path):
    target_id_h = 420
    id_img = Image.open(id_path).convert("RGBA")
    id_w = int(id_img.width * (target_id_h / id_img.height))
    id_img = id_img.resize((id_w, target_id_h), Image.Resampling.LANCZOS)
    
    # Drop shadow & ambient backlight
    shadow_pad = 45
    shadow = Image.new("RGBA", (id_w + shadow_pad * 2, target_id_h + shadow_pad * 2), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle([shadow_pad - 10, shadow_pad - 10, id_w + shadow_pad + 10, target_id_h + shadow_pad + 10], radius=32, fill=(0, 0, 0, 210))
    shadow_draw.rounded_rectangle([shadow_pad - 6, shadow_pad - 6, id_w + shadow_pad + 6, target_id_h + shadow_pad + 6], radius=30, fill=(0, 229, 255, 75))
    shadow = shadow.filter(ImageFilter.GaussianBlur(28))
    
    canvas.paste(shadow, (card_center_x - id_w//2 - shadow_pad, card_top_y - shadow_pad + 15), shadow)
    
    # 1. Lanyard Strap running from top frame (y=0) down to hardware
    if os.path.exists(strap_path):
        strap = Image.open(strap_path).convert("RGBA")
        strap_w = 28
        strap_h = 80
        strap = strap.resize((strap_w, strap_h), Image.Resampling.LANCZOS)
        canvas.paste(strap, (card_center_x - strap_w//2, 0), strap)
        
    # 2. Lanyard Hardware (Buckle + STI Clamp + Metal Clasp)
    if os.path.exists(hw_path):
        hw = Image.open(hw_path).convert("RGBA")
        hw_w = 48
        hw_h = int(hw.height * (hw_w / hw.width))
        hw = hw.resize((hw_w, hw_h), Image.Resampling.LANCZOS)
        hw_y = card_top_y - hw_h + 38
        canvas.paste(hw, (card_center_x - hw_w//2, hw_y), hw)

    # 3. Paste ID Card
    canvas.paste(id_img, (card_center_x - id_w//2, card_top_y), id_img)

# 12. Floating Glass Badges cleanly placed without overlapping ID card or hardware
# Badge 1: Top-Left of Card
b1_x, b1_y = 680, 88
b1_w, b1_h = 220, 36
draw.rounded_rectangle([b1_x, b1_y, b1_x + b1_w, b1_y + b1_h], radius=18, fill=(10, 25, 45, 235), outline=(0, 229, 255, 190), width=1)
draw.ellipse([b1_x + 14, b1_y + 13, b1_x + 22, b1_y + 21], fill=(0, 229, 255, 255))
draw.text((b1_x + 30, b1_y + 8), "Interactive 3D Physics", fill=(0, 255, 220), font=font_sans_small)

# Badge 2: Right of Hardware (completely clear of buckle & clamp)
b2_x, b2_y = 998, 92
b2_w, b2_h = 176, 36
draw.rounded_rectangle([b2_x, b2_y, b2_x + b2_w, b2_y + b2_h], radius=18, fill=(18, 20, 44, 235), outline=(168, 85, 247, 190), width=1)
draw.ellipse([b2_x + 14, b2_y + 13, b2_x + 22, b2_y + 21], fill=(168, 85, 247, 255))
draw.text((b2_x + 30, b2_y + 8), "Watch Video Projects", fill=(225, 180, 255), font=font_sans_small)

# Badge 3: Cleanly placed in nook between URL card & ID Card
b3_x, b3_y = 635, 465
b3_w, b3_h = 205, 36
draw.rounded_rectangle([b3_x, b3_y, b3_x + b3_w, b3_y + b3_h], radius=18, fill=(12, 32, 45, 235), outline=(16, 185, 129, 190), width=1)
draw.ellipse([b3_x + 14, b3_y + 13, b3_x + 22, b3_y + 21], fill=(16, 185, 129, 255))
draw.text((b3_x + 30, b3_y + 8), "Project Configurator", fill=(140, 245, 190), font=font_sans_small)

# Save Outputs to all relevant destinations
output_v2_path = os.path.join(assets_dir, "images", "share-preview-v2.png")
output_og_path = os.path.join(assets_dir, "images", "og-preview.png")
output_fb_share = os.path.join(r"C:\Paulo files\My Projects", "facebook-share-thumbnail.png")

final_rgb = canvas.convert("RGB")
final_rgb.save(output_v2_path, "PNG", quality=95)
final_rgb.save(output_og_path, "PNG", quality=95)
final_rgb.save(output_fb_share, "PNG", quality=95)

print("Generated perfected thumbnail with THIN, elegant script Jhon Paulo!")
