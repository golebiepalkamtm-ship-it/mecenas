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

# Replace Appendix 1
html = re.sub(
    r'(ZAŁĄCZNIK NR 1.*?Data publikacji:).*?Autor:.*?</h1>.*?<p.*?</p>.*?<div style="font-size: 14px; text-align: justify;">.*?</div>',
    r'\1 2026-04-29 | <strong>Autor:</strong> Redakcja eLuban</p></div>\n' +
    r'<h1 style="font-family: \'Segoe UI\', Tahoma, sans-serif; font-size: 24px; color: #000; margin-bottom: 15px;">Poczta Polska w Lubaniu. Czy to koniec problemów z dostarczaniem listów?</h1>\n' +
    r'<div style="font-size: 14px; text-align: justify;"><p>' + art1_text + '</p></div>',
    html,
    flags=re.DOTALL
)

# Replace Appendix 2
html = re.sub(
    r'(ZAŁĄCZNIK NR 2.*?Data publikacji:).*?Autor:.*?</h1>.*?<p.*?</p>.*?<div style="font-size: 14px; text-align: justify;">.*?</div>',
    r'\1 2026-08-24 | <strong>Autor:</strong> Redakcja eLuban</p></div>\n' +
    r'<h1 style="font-family: \'Segoe UI\', Tahoma, sans-serif; font-size: 24px; color: #000; margin-bottom: 15px;">Policja na poczcie w Lubaniu. Fikcyjne awiza i worki z korespondencją do utylizacji</h1>\n' +
    r'<div style="font-size: 14px; text-align: justify;"><p>' + art2_text + '</p></div>',
    html,
    flags=re.DOTALL
)

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html)
