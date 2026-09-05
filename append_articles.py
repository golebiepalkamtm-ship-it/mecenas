import requests
from bs4 import BeautifulSoup

URL1 = "https://www.eluban.pl/artykul/36928,poczta-polska-w-lubaniu-czy-to-koniec-problemow-z-dostarczaniem-listow"
URL2 = "https://www.eluban.pl/artykul/37762,policja-na-poczcie-w-lubaniu-fikcyjne-awiza-i-worki-z-korespondencja-do-utylizacji"

LOGO_URL = "https://static2.eluban.pl/data/wysiwig/elubanLogo_RGB_H2_min.png"

def fetch_article(url):
    response = requests.get(url)
    soup = BeautifulSoup(response.content, 'html.parser')
    
    title = soup.find('h1', class_='text-title').get_text(strip=True) if soup.find('h1', class_='text-title') else ''
    lead = soup.find('div', class_='text-lead').get_text(strip=True) if soup.find('div', class_='text-lead') else ''
    
    author = ''
    author_elem = soup.find('li', class_='article-author')
    if author_elem:
        author = author_elem.get_text(strip=True)
        
    date = ''
    date_elem = soup.find('li', class_='article-date')
    if date_elem:
        date = date_elem.get_text(strip=True)
        
    main_img = ''
    img_container = soup.find('div', class_='article-image')
    if img_container:
        img_elem = img_container.find('img')
        if img_elem and img_elem.has_attr('src'):
            main_img = img_elem['src']
            
    content_html = ""
    content_div = soup.find('div', id='article-content')
    if content_div:
        # Remove widgets and scripts
        for widget in content_div.find_all(class_='widget'):
            widget.decompose()
        for script in content_div.find_all('script'):
            script.decompose()
        for img in content_div.find_all('img'):
            if not img.get('style'):
                img['style'] = "max-width: 100%; height: auto; margin: 10px 0;"
        content_html = content_div.encode_contents().decode('utf-8')
        
    return {
        "url": url,
        "title": title,
        "lead": lead,
        "author": author,
        "date": date,
        "main_img": main_img,
        "content_html": content_html
    }

art1 = fetch_article(URL1)
art2 = fetch_article(URL2)

def generate_html_for_article(art, index):
    html = f"""
    <div style="page-break-before: always; font-family: Cambria, Georgia, serif; line-height: 1.5; color: #333; padding: 40px;">
        <div style="text-align: left; margin-bottom: 20px;">
            <img src="{LOGO_URL}" style="height: 50px;" />
        </div>
        <div style="border-bottom: 2px solid #BF1E23; margin-bottom: 20px; padding-bottom: 10px;">
            <p style="margin: 0; font-size: 14px; color: #666;"><strong>ZAŁĄCZNIK NR {index}</strong></p>
            <p style="margin: 0; font-size: 14px; color: #666;"><strong>Źródło:</strong> <a href="{art['url']}">{art['url']}</a></p>
            <p style="margin: 0; font-size: 14px; color: #666;"><strong>Data publikacji:</strong> {art['date']} | <strong>Autor:</strong> {art['author']}</p>
        </div>
        
        <h1 style="font-family: 'Segoe UI', Tahoma, sans-serif; font-size: 24px; color: #000; margin-bottom: 15px;">{art['title']}</h1>
        <p style="font-weight: bold; font-size: 16px; margin-bottom: 20px;">{art['lead']}</p>
        """
        
    if art['main_img']:
        html += f"""
        <div style="text-align: center; margin-bottom: 20px;">
            <img src="{art['main_img']}" style="max-width: 100%; max-height: 400px; border: 1px solid #ccc;" />
        </div>
        """
        
    html += f"""
        <div style="font-size: 14px; text-align: justify;">
            {art['content_html']}
        </div>
    </div>
    """
    return html

html_append = generate_html_for_article(art1, 1) + generate_html_for_article(art2, 2)

html_file = r"e:\moj prawnik\Dokumenty_PDF_z_warstwa_wizualna\pismo_uzupelniajace_wsa.html"

with open(html_file, 'r', encoding='utf-8') as f:
    content = f.read()

if 'ZAŁĄCZNIK NR 1' in content:
    print("Załączniki już dodane!")
else:
    # Insert before </body>
    if '</body>' in content:
        content = content.replace('</body>', html_append + '\n</body>')
    else:
        content += html_append

    with open(html_file, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Articles appended successfully.")
