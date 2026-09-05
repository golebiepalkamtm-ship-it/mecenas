import re
with open(r'e:\moj prawnik\Dokumenty_PDF_z_warstwa_wizualna\pismo_uzupelniajace_wsa.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace the long URL with just "Portal eLuban.pl"
html = re.sub(r'<a href="https://www\.eluban\.pl/artykul/[^"]+">[^<]+</a>', 'Portal eLuban.pl', html)

with open(r'e:\moj prawnik\Dokumenty_PDF_z_warstwa_wizualna\pismo_uzupelniajace_wsa.html', 'w', encoding='utf-8') as f:
    f.write(html)
