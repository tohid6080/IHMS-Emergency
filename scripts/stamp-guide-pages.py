#!/usr/bin/env python3
"""شماره‌گذاری صفحات PDF راهنمای IHMS — جلد بدون شماره، بدنه از ۱."""
import io
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

SRC = '/home/z/my-project/download/IHMS-Android-Deploy-Guide.pdf'
OUT = SRC  # in-place پس از ساخت

pdfmetrics.registerFont(TTFont('DejaVu', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))

reader = PdfReader(SRC)
writer = PdfWriter()
n = len(reader.pages)
PAGE_W, PAGE_H = 794, 1123

for i, page in enumerate(reader.pages):
    # جلد (i=0) و صفحه پایانی تیره (i=n-1) بدون شماره
    if i == 0 or i == n - 1:
        writer.add_page(page)
        continue
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=(PAGE_W, PAGE_H))
    c.setFont('DejaVu', 9)
    c.setFillColorRGB(0.553, 0.518, 0.506)  # #8d8481 muted
    c.drawCentredString(PAGE_W / 2, 22, str(i))  # بدنه از ۱ شروع می‌شود
    c.save()
    buf.seek(0)
    overlay = PdfReader(buf).pages[0]
    page.merge_page(overlay)
    writer.add_page(page)

with open(OUT, 'wb') as f:
    writer.write(f)
print(f'stamped {n - 2} body pages (1..{n - 2}), cover + ending skipped')
