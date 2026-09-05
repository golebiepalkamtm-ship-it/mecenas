import re

html_path = r'e:\moj prawnik\Dokumenty_PDF_z_warstwa_wizualna\pismo_uzupelniajace_wsa.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

# Article 1 Clean Content
art1_subheadings = [
    "Zarządzanie kryzysowe i nowa kadra w lubańskim urzędzie",
    "Cyfrowa kontrola doręczeń i poprawa statystyk terminowości",
    "Apel do mieszkańców. Numeracja posesji i dostęp do skrzynek"
]

with open('art1.txt', 'r', encoding='utf-8') as f:
    lines1 = [l.strip() for l in f.readlines()[4:] if l.strip()]

# Remove footer donation text
clean_lines1 = []
for l in lines1:
    if "Postaw nam wirtualną kawę" in l or "Dobre dziennikarstwo" in l or "Każda \"kawa\"" in l:
        continue
    clean_lines1.append(l)

art1_body = ""
temp_p = []
for l in clean_lines1:
    if l in art1_subheadings:
        if temp_p:
            art1_body += f"<p>{' '.join(temp_p)}</p>\n"
            temp_p = []
        art1_body += f"<h3 style='font-family: \"Segoe UI\", sans-serif; font-size: 11pt; color: #1a237e; margin: 10px 0 4px 0; break-after: avoid;'>{l}</h3>\n"
    else:
        temp_p.append(l)
if temp_p:
    art1_body += f"<p>{' '.join(temp_p)}</p>\n"


# Article 2 Clean Content
art2_subheadings = [
    "Zmiany i program naprawczy",
    "Kilkadziesiąt worków z listami do utylizacji",
    "Nie tylko stare listy",
    "Fikcyjne awiza",
    "Jaki będzie ciąg dalszy?"
]

with open('art2.txt', 'r', encoding='utf-8') as f:
    lines2 = [l.strip() for l in f.readlines()[4:] if l.strip()]

art2_body = ""
temp_p = []
for l in lines2:
    if l in art2_subheadings:
        if temp_p:
            art2_body += f"<p>{' '.join(temp_p)}</p>\n"
            temp_p = []
        art2_body += f"<h3 style='font-family: \"Segoe UI\", sans-serif; font-size: 11pt; color: #1a237e; margin: 10px 0 4px 0; break-after: avoid;'>{l}</h3>\n"
    else:
        temp_p.append(l)
if temp_p:
    art2_body += f"<p>{' '.join(temp_p)}</p>\n"

IMG1 = "https://static2.eluban.pl/data/articles/xl-poczta-polska-w-lubaniu-czy-to-koniec-problemow-z-dostarczaniem-listow-1777456667.jpg"
IMG2 = "https://static2.eluban.pl/data/articles/xl-policja-na-poczcie-w-lubaniu-fikcyjne-awiza-i-worki-z-korespondencja-do-utylizacji-1787595387.jpg"

def format_appendix(idx, date, title, body_html, img_url):
    return f"""
    <div style="page-break-before: always; font-family: Cambria, Georgia, serif; line-height: 1.35; color: #222; padding: 10px 15px;">
        <table style="width: 100%; border-bottom: 2px solid #BF1E23; margin-bottom: 12px; padding-bottom: 5px;">
            <tr>
                <td style="vertical-align: middle;">
                    <img src="https://static2.eluban.pl/data/wysiwig/elubanLogo_RGB_H2_min.png" style="height: 34px;" />
                </td>
                <td style="text-align: right; font-family: 'Segoe UI', sans-serif; font-size: 9.5pt; color: #555;">
                    <strong style="color: #BF1E23; font-size: 10.5pt;">DOWÓD — ZAŁĄCZNIK NR {idx}</strong><br>
                    <strong>Źródło:</strong> Portal Informacyjny eLuban.pl | <strong>Data:</strong> {date}
                </td>
            </tr>
        </table>
        
        <h1 style="font-family: 'Segoe UI', Tahoma, sans-serif; font-size: 15pt; font-weight: bold; color: #111; margin: 0 0 10px 0; text-align: center; line-height: 1.25;">{title}</h1>
        
        <div style="text-align: center; margin-bottom: 12px;">
            <img src="{img_url}" style="max-width: 90%; max-height: 210px; border-radius: 4px; border: 1px solid #ccc; box-shadow: 0 2px 5px rgba(0,0,0,0.15);" />
        </div>
        
        <div style="font-size: 9.5pt; text-align: justify; column-count: 2; column-gap: 22px;">
            {body_html}
        </div>
    </div>"""

app1 = format_appendix(1, "29.04.2026 r.", "Poczta Polska w Lubaniu. Czy to koniec problemów z dostarczaniem listów?", art1_body, IMG1)
app2 = format_appendix(2, "24.08.2026 r.", "Policja na poczcie w Lubaniu. Fikcyjne awiza i worki z korespondencją do utylizacji", art2_body, IMG2)

# Replace everything from the first appendix to </body>
html_clean = re.sub(r'<div style="page-break-before: always;.*?</body>', app1 + '\n' + app2 + '\n</body>', html, flags=re.DOTALL)

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html_clean)

print("Appendices updated cleanly!")
