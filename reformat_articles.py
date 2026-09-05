import re

html_path = r'e:\moj prawnik\Dokumenty_PDF_z_warstwa_wizualna\pismo_uzupelniajace_wsa.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

with open('art1.txt', 'r', encoding='utf-8') as f:
    art1_lines = f.read().split('\n')
    
with open('art2.txt', 'r', encoding='utf-8') as f:
    art2_lines = f.read().split('\n')

art1_text = '</p><p>'.join([p.strip() for p in art1_lines[5:] if p.strip()])
art2_text = '</p><p>'.join([p.strip() for p in art2_lines[5:] if p.strip()])

IMG1 = "https://static2.eluban.pl/data/articles/xl-poczta-polska-w-lubaniu-czy-to-koniec-problemow-z-dostarczaniem-listow-1777456667.jpg"
IMG2 = "https://static2.eluban.pl/data/articles/xl-policja-na-poczcie-w-lubaniu-fikcyjne-awiza-i-worki-z-korespondencja-do-utylizacji-1787595387.jpg"

def format_appendix(idx, date, title, text, img_url):
    return f"""
    <div style="page-break-before: always; font-family: Cambria, Georgia, serif; line-height: 1.3; color: #333; padding: 20px;">
        <div style="text-align: left; margin-bottom: 10px;">
            <img src="https://static2.eluban.pl/data/wysiwig/elubanLogo_RGB_H2_min.png" style="height: 40px;" />
        </div>
        <div style="border-bottom: 2px solid #BF1E23; margin-bottom: 15px; padding-bottom: 5px;">
            <p style="margin: 0; font-size: 11pt; color: #666;"><strong>ZAŁĄCZNIK NR {idx}</strong></p>
            <p style="margin: 0; font-size: 11pt; color: #666;"><strong>Źródło:</strong> Portal eLuban.pl</p>
            <p style="margin: 0; font-size: 11pt; color: #666;"><strong>Data publikacji:</strong> {date} | <strong>Autor:</strong> Redakcja eLuban</p>
        </div>
        
        <h1 style="font-family: 'Segoe UI', Tahoma, sans-serif; font-size: 18pt; color: #000; margin-bottom: 15px; text-align: center;">{title}</h1>
        
        <div style="text-align: center; margin-bottom: 15px;">
            <img src="{img_url}" style="max-width: 100%; max-height: 250px; border: 1px solid #ccc; box-shadow: 2px 2px 5px rgba(0,0,0,0.1);" />
        </div>
        
        <div style="font-size: 10pt; text-align: justify; column-count: 2; column-gap: 20px;">
            <p>{text}</p>
        </div>
    </div>"""

app1 = format_appendix(1, "2026-04-29", "Poczta Polska w Lubaniu. Czy to koniec problemów z dostarczaniem listów?", art1_text, IMG1)
app2 = format_appendix(2, "2026-08-24", "Policja na poczcie w Lubaniu. Fikcyjne awiza i worki z korespondencją do utylizacji", art2_text, IMG2)

# Remove old appendices
# The first appendix starts with `<div style="page-break-before: always;` and contains `ZAŁĄCZNIK NR 1`
html = re.sub(r'<div style="page-break-before: always;.*?</body>', app1 + app2 + '\n</body>', html, flags=re.DOTALL)

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html)
