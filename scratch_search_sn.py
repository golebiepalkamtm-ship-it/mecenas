import urllib.request
import json
import ssl
import re

# Baza orzeczeń SN / CBOSA / SAOS
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def test_sn_search():
    # SN search API or orzeczenia SN
    url = "https://www.sn.pl/orzecznictwo/SitePages/Baza_orzeczen.aspx"
    print("Testing SN connection...")
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5, context=ctx) as resp:
            print("SN status:", resp.status)
    except Exception as e:
        print("SN error:", e)

if __name__ == "__main__":
    test_sn_search()
