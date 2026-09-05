import json
from pathlib import Path

def generate_dossier():
    json_path = Path("Dokumenty_Wszystkie/Zdjecia_i_Skany/ocr_results_full.json")
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    def get_txt(key):
        return data.get(key, {}).get("text", "").strip()

    lines = []
    lines.append("# 📑 ZESZYT DOWODOWY I TRANSKRYPCJA OCR SKANÓW — SPRAWA KARNA\n")
    lines.append("**Podejrzany / Oskarżony:** Marcin Pałka  ")
    lines.append("**Sygnatura akt (Prokuratura):** `4327-0.Ds.517.2025` (Prokuratura Rejonowa w Lubaniu)  ")
    lines.append("**Organ orzekający:** Sąd Rejonowy w Lubaniu, II Wydział Karny  ")
    lines.append("**Data sporządzenia zeszytu:** 18 sierpnia 2026 r.  \n")
    lines.append("---\n")
    
    lines.append("## 📌 SPIS TREŚCI")
    lines.append("1. [Część I: Zatrzymanie, przeszukanie i depozyt (Kwiecień 2025 r.)](#część-i-zatrzymanie-przeszukanie-i-depozyt-kwiecień-2025-r)")
    lines.append("2. [Część II: Postanowienia dowodowe i powołanie biegłych (Kwiecień - Lipiec 2025 r.)](#część-ii-postanowienia-dowodowe-i-powołanie-biegłych-kwiecień---lipiec-2025-r)")
    lines.append("3. [Część III: Pełna opinia sądowo-psychiatryczna i psychologiczna (16.08.2025 r.)](#część-iii-pełna-opinia-sądowo-psychiatryczna-i-psychologiczna-16082025-r)")
    lines.append("4. [Część IV: Zawiadomienia prokuratury i wezwania (Wrzesień - Październik 2025 r.)](#część-iv-zawiadomienia-prokuratury-i-wezwania-wrzesień---październik-2025-r)")
    lines.append("5. [Część V: Zmiana kwalifikacji prawnej i akt oskarżenia (Czerwiec 2026 r.)](#część-v-zmiana-kwalifikacji-prawnej-i-akt-oskarżenia-czerwiec-2026-r)")
    lines.append("6. [Część VI: Wyrok bazowy SR Wrocław-Krzyki (VII K 1140/21) — Wykluczenie recydywy](#część-vi-wyrok-bazowy-sr-wrocław-krzyki-vii-k-114021--wykluczenie-recydywy)")
    lines.append("7. [Część VII: Zestawienie kluczowych uchybień proceduralnych dla Sądu i Obrońcy](#część-vii-zestawienie-kluczowych-uchybień-proceduralnych-dla-sądu-i-obrońcy)\n")
    lines.append("---\n")

    # Część I
    lines.append("## Część I: Zatrzymanie, przeszukanie i depozyt (Kwiecień 2025 r.)\n")
    
    lines.append("### 1. Protokół zatrzymania osoby — Strona 1")

    lines.append("* **Data i miejsce:** 09.04.2025 r., Lubań, ul. Leśna 24 / KPP Lubań")
    lines.append("* **Jednostka:** Wydział Operacyjno-Śledczy I Zarządu w Bydgoszczy CBZC (kom. Marcin Kunsztowicz ID: 670488, kom. Maciej Głowacki, podkom. Bartosz Nowak)")
    lines.append("* **Podstawa prawna:** art. 244 § 1 k.p.k., art. 15a ustawy o Policji\n")
    lines.append("```text")
    lines.append(get_txt("IMG_20260227_114314629.jpg"))
    lines.append("```\n")

    lines.append("### 2. Protokół zatrzymania osoby — Strona 2 (Oświadczenia i pouczenia)")

    lines.append("* **Ważne oświadczenia:** Żądanie kontaktu z adwokatem (Wiesław Majewski, Jelenia Góra). Oświadczenie o braku leczenia psychiatrycznego i odwykowego w dacie zatrzymania. Powiadomienie małżonki (Maria Kaźmierczak-Pałka) oraz Prokurator Magdaleny Wesołowskiej.\n")
    lines.append("```text")
    lines.append(get_txt("IMG_20260227_114332654.jpg"))
    lines.append("```\n")

    lines.append("### 3. Kwit depozytowy nr 141/2025 (KPP w Lubaniu)")

    lines.append("* **Data:** 10.04.2025 r.")
    lines.append("* **Kluczowy element dowodowy:** Poz. 13 — Prawo jazdy nr `00362/12/0210` przyjęte do depozytu policji.\n")
    lines.append("```text")
    lines.append(get_txt("IMG_20260227_114446108.jpg"))
    lines.append("```\n")

    lines.append("### 4. Postanowienie o zatwierdzeniu przeszukania (4 strony)")

    lines.append("* **Data:** 11.04.2025 r. (prok. Magdalena Wesołowska, sygn. akt `4327-0.Ds.517.2025`)")
    lines.append("* **Kluczowy błąd proceduralny:** Brak wskazania dokładnego adresu przeszukiwanego lokalu w sentencji postanowienia (art. 94 § 1 pkt 5 k.p.k. w zw. z art. 168a k.p.k.).\n")
    lines.append("#### Strona 1:")
    lines.append("```text\n" + get_txt("IMG_20260405_140638153.jpg") + "\n```")
    lines.append("#### Strona 2:")
    lines.append("```text\n" + get_txt("IMG_20260405_140641613.jpg") + "\n```")
    lines.append("#### Strona 3:")
    lines.append("```text\n" + get_txt("IMG_20260405_140643107.jpg") + "\n```")
    lines.append("#### Strona 4:")
    lines.append("```text\n" + get_txt("IMG_20260405_140645449.jpg") + "\n```\n")

    lines.append("### 5. Protokoły oddania rzeczy i zabezpieczenia")

    lines.append("#### Protokół przeszukania / pouczenie:")
    lines.append("```text\n" + get_txt("IMG_20260405_140656679.jpg") + "\n```")
    lines.append("#### Protokół oddania rzeczy 1:")
    lines.append("```text\n" + get_txt("IMG_20260405_141059926.jpg") + "\n```")
    lines.append("#### Protokół oddania rzeczy 2:")
    lines.append("```text\n" + get_txt("IMG_20260405_141107384.jpg") + "\n```")
    lines.append("#### Wykaz oddanych rzeczy:")
    lines.append("```text\n" + get_txt("IMG_20260405_141111998.jpg") + "\n```\n")

    # Część II
    lines.append("## Część II: Postanowienia dowodowe i powołanie biegłych (Kwiecień - Lipiec 2025 r.)\n")
    lines.append("### 1. Postanowienie o powołaniu biegłych psychiatrów")

    lines.append("* **Data:** 21.07.2025 r. (prok. Magdalena Wesołowska)")
    lines.append("* **Kardynalny błąd prokuratury:** W treści powołano wątpliwości co do poczytalności **Magdaleny Markowskiej** zamiast podejrzanego Marcina Pałki.\n")
    lines.append("```text\n" + get_txt("IMG_20260405_141135408.jpg") + "\n```")
    lines.append("#### Pouczenie:")
    lines.append("```text\n" + get_txt("IMG_20260405_141149650.jpg") + "\n```\n")

    lines.append("### 2. Wyciąg z protokołu przesłuchania podejrzanego (karty 26-29)")

    lines.append("```text\n" + get_txt("IMG_20260405_141147099.jpg") + "\n```\n")

    # Część III
    lines.append("## Część III: Pełna opinia sądowo-psychiatryczna i psychologiczna (16.08.2025 r.)\n")
    lines.append("* **Biegli:** Lek. psychiatra Jacek Madejek, lek. psychiatra Andrzej Jurkowski, mgr psycholog Amelia Głowacka.")
    lines.append("* **Badanie:** 07.08.2025 r. (Oddział Psychiatrii Sądowej 5C, WSS Bolesławiec).")
    lines.append("* **Kluczowe tezy opinii:**")
    lines.append("  1. Brak choroby psychicznej w rozumieniu psychozy oraz brak upośledzenia umysłowego.")
    lines.append("  2. Zachowana pełna poczytalność *tempore criminis* (art. 31 § 1 i § 2 k.k. nie mają zastosowania).")
    lines.append("  3. Poziom procesów poznawczych w normie, myślenie logiczne, brak deficytów CUN.")
    lines.append("  4. Rozpoznanie: F19.2 (zespół uzależnienia mieszanego).\n")
    
    lines.append("#### Strona 1:")
    lines.append("```text\n" + get_txt("3.jpg") + "\n```")
    lines.append("#### Strona 2:")
    lines.append("```text\n" + get_txt("4.jpg") + "\n```")
    lines.append("#### Strona 3:")
    lines.append("```text\n" + get_txt("5.jpg") + "\n```")
    lines.append("#### Strona 4:")
    lines.append("```text\n" + get_txt("6.jpg") + "\n```")
    lines.append("#### Strona 5:")
    lines.append("```text\n" + get_txt("7.jpg") + "\n```")
    lines.append("#### Strona 6:")
    lines.append("```text\n" + get_txt("8.jpg") + "\n```\n")

    # Część IV
    lines.append("## Część IV: Zawiadomienia prokuratury i wezwania (Wrzesień - Październik 2025 r.)\n")
    lines.append("### 1. Zawiadomienie Prokuratury o wpłynięciu opinii biegłych")

    lines.append("* **Data:** 04.09.2025 r.\n")
    lines.append("```text\n" + get_txt("IMG_20250905_155515111.jpg") + "\n```\n")

    lines.append("### 2. Wezwanie na konsultację uzależnień (MONAR Jelenia Góra)")

    lines.append("* **Termin:** 07.10.2025 r., godz. 15:00\n")
    lines.append("```text\n" + get_txt("IMG_20260405_140900157.jpg") + "\n```\n")

    # Część V
    lines.append("## Część V: Zmiana kwalifikacji prawnej i akt oskarżenia (Czerwiec 2026 r.)\n")
    lines.append("### 1. Postanowienie o zmianie i uzupełnieniu zarzutów (19.06.2026 r.)")

    lines.append("* **Przełom procesowy:** Całkowite wycofanie zarzutu produkcji narkotyków z art. 53 u.p.n. Przejście na art. 62 ust. 1, art. 54 ust. 1, art. 61 u.p.n.\n")
    lines.append("#### Strona 1:")
    lines.append("```text\n" + get_txt("IMG_20260619_12073111111111111111111111114564.jpg") + "\n```")
    lines.append("#### Strona 2:")
    lines.append("```text\n" + get_txt("IMG_20260619_120734564.jpg") + "\n```\n")

    lines.append("### 2. Zawiadomienie o przesłaniu aktu oskarżenia do Sądu Rejonowego w Lubaniu")

    lines.append("* **Data:** 30.06.2026 r.\n")
    lines.append("```text\n" + get_txt("80879b40-b9e4-403b-9eb6-bce1900f16b1.jpg") + "\n```\n")

    # Część VI
    lines.append("## Część VI: Wyrok bazowy SR Wrocław-Krzyki (VII K 1140/21) — Wykluczenie recydywy\n")

    lines.append("* **Sąd:** Sąd Rejonowy dla Wrocławia-Krzyków, Wydział VII Karny")
    lines.append("* **Kary jednostkowe orzeczone w wyroku:**")
    lines.append("  - 5 miesięcy pozbawienia wolności (za czyn V z art. 56 ust. 3 u.p.n.)")
    lines.append("  - 1 miesiąc pozbawienia wolności (za czyn VI z art. 62 ust. 1 u.p.n.)")
    lines.append("  - Kara łączna: 6 miesięcy pozbawienia wolności (odbyta w całości w systemie dozoru elektronicznego SDE).")
    lines.append("* **Moc dowodowa:** Zgodnie z Uchwałą SN I KZP 24/01, odbycie kary łącznej złożonej z kar poniżej 6 miesięcy **wyklucza zastosowanie art. 64 § 1 k.k.** Zarzut recydywy jest bezprawny.\n")
    lines.append("#### Strona 1:")
    lines.append("```text\n" + get_txt("IMG_20260512_091917813.jpg") + "\n```")
    lines.append("#### Strona 2:")
    lines.append("```text\n" + get_txt("IMG_20260630_095055667.jpg") + "\n```")
    lines.append("#### Strona 3:")
    lines.append("```text\n" + get_txt("IMG_20260630_095129070.jpg") + "\n```\n")

    # Część VII
    lines.append("## Część VII: Zestawienie kluczowych uchybień proceduralnych dla Sądu i Obrońcy\n")
    lines.append("| Lp. | Dokument / Czynność | Naruszony przepis | Skutek procesowy dla obrony |")
    lines.append("|:---|:---|:---|:---|")
    lines.append("| 1. | **Akt oskarżenia — Recydywa** | art. 64 § 1 k.k. w zw. z Uchwałą SN I KZP 24/01 | Kary jednostkowe wynosiły 5 mies. i 1 mies. Zarzut recydywy musi zostać bezwzględnie wyeliminowany przez Sąd. |")
    lines.append("| 2. | **Postanowienie o zatwierdzeniu przeszukania** | art. 94 § 1 pkt 5 k.p.k., art. 220 k.p.k. | Brak adresu w sentencji postanowienia. Wniosek z art. 168a k.p.k. o niedopuszczalność dowodów z nielegalnego wejścia. |")
    lines.append("| 3. | **Tryb nagły przeszukania** | art. 220 § 3 k.p.k., art. 231 k.k. | Policjanci znali SMS-y przed wejściem. Fikcja „nagłości” w celu ukrycia nielegalnej inwigilacji operacyjnej. |")
    lines.append("| 4. | **Postanowienie o powołaniu biegłych** | art. 193 k.p.k., zasada staranności | Wpisanie „Magdaleny Markowskiej” — dowód na seryjne tworzenie pism metodą kopiuj-wklej bez badania realiów sprawy. |")
    lines.append("| 5. | **Opinia psychiatryczna z 16.08.2025 r.** | art. 31 § 1 i 2 k.k., ICD-10 | Potwierdzenie pełnej poczytalności i braku deficytów poznawczych. Wykazanie przed Starostą braku podstaw do zatrzymania PJ. |")
    lines.append("| 6. | **Kwit depozytowy nr 141/2025** | art. 102 u.k.p., art. 7 k.p.a. | Fizyczne zabezpieczenie PJ przez policję w kwietniu 2025 r. Organ administracji nie może zarzucać zaniechania zwrotu dokumentu. |")

    full_md = "\n".join(lines)
    out_file = Path("Dokumenty_Wszystkie/Sprawa_Karna/ZESZYT_DOWODOWY_SKANY_OCR_SPRAWA_KARNA.md")
    with open(out_file, "w", encoding="utf-8") as f:
        f.write(full_md)
    print(f"Zapisano Zeszyt Dowodowy OCR: {out_file} ({len(full_md)} znakow)")

if __name__ == "__main__":
    generate_dossier()
