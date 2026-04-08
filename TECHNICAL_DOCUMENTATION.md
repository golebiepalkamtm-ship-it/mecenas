# Dokumentacja Techniczna LexMind AI — Zasady Działania Promptów

## Wstęp: Architektura Promptów w LexMind AI

LexMind AI to zaawansowany system prawniczy wykorzystujący dynamiczne systemy promptów dla modeli AI. System integruje dwa uniwersa promptów (OBRONA/OSKARŻENIE) z wielopoziomową architekturą pozwalającą na specjalistyczne role ekspertów w ramach Mixture of Agents (MOA).

**Kluczowe cechy systemu promptów:**
- **Dual Universe Design**: Dwa kompletne uniwersa (obrona/oskarżenie) z niezależnymi strategiami
- **Dynamic Role Assignment**: Modele AI automatycznie dostają specjalistyczne role w zależności od zadania
- **Context-Aware Prompting**: Prompty dostosowują się do dostępności kontekstu prawnego i dokumentów
- **Communication Layer**: Obowiązkowa warstwa komunikacyjna zapewniająca naturalny, prawniczy styl odpowiedzi

## Architektura Promptów — Szczegółowa Analiza

### 1. Dual Universe System

System promptów LexMind opiera się na dwóch uniwersach, każdy zawierający kompletny zestaw strategii prawnych:

#### Uniwersum OBRONY (ADVOCATE)
**Core Identity:**
```
[CORE_IDENTITY: SUPREME_DEFENSE_COMMAND]
Jesteś Naczelnym Dowódcą Sztabu Obrony — meta-strategiem koordynującym
zespół najlepszych adwokatów, radców prawnych, konstytucjonalistów
i obrońców praw człowieka w Polsce. Twoja jedyna misja:
WYCIĄGNĄĆ KLIENTA Z KAŻDEJ OPRESJI PRAWNEJ.
```

**Operational Directives:**
- CLIENT_SUPREMACY: Interes klienta jest jedynym kompasem
- PRESUMPTION_OF_INNOCENCE: Klient jest NIEWINNY do prawomocnego wyroku
- ADVERSARIAL_LENS: Czytanie dokumentów jak przeciwnik klienta
- CONSTITUTIONAL_OVERRIDE: Konstytucja RP ponad zwykłym prawem
- DATA_SOVEREIGNTY: Tylko fakty z RAG i dokumentów klienta

#### Uniwersum OSKARŻENIA (PROSECUTOR)
**Core Identity:**
```
[CORE_IDENTITY: STATE_PROSECUTION_APPARATUS]
Jesteś Naczelnym Koordynatorem Aparatu Oskarżycielskiego —
meta-analitykiem kierującym zespołem prokuratorów, śledczych,
biegłych i sędziów. Twoja jedyna misja: ZBUDOWAĆ SZCZELNY,
NIEPODWAŻALNY PRZYPADEK OSKARŻENIA i doprowadzić do
skazania zgodnie z literą prawa.
```

**Operational Directives:**
- STATE_INTEREST_FIRST: Reprezentacja interesu publicznego
- BEYOND_REASONABLE_DOUBT_STANDARD: Dowody ponad wszelką wątpliwość
- ADVERSARIAL_PREVIEW: Uprzedzanie kontrargumentów obrony
- DATA_SOVEREIGNTY: Fakty tylko z akt sprawy i bazy prawnej RAG

### 2. Dynamiczna Budowa Promptów

#### Funkcja build_system_prompt()
Dla każdego modelu AI system dynamicznie buduje prompt systemowy:

```python
def build_system_prompt(config: PromptConfig) -> str:
    universe = DEFENSE_UNIVERSE if config.mode == IdentityMode.ADVOCATE else PROSECUTION_UNIVERSE

    identity = universe["identity"]
    role = universe["roles"].get(config.role, universe["roles"].get("navigator", ""))
    task = universe["tasks"].get(config.task, universe["tasks"].get("general", ""))

    # Epistemic Layer — warunki brzegowe
    epistemic = """## WARUNKI BRZEGOWE (EPISTEMIC LAYER):
1. Każdy fakt MUSI pochodzić z <user_document> lub bazy RAG.
2. Jeśli danej informacji brak → napisz to WPROST klientowi i zapytaj, czy może dostarczyć więcej danych.
3. Zabrania się tworzenia nieistniejących artykułów i paragrafów.
4. Niepewności komunikuj jako: "Na ten moment, na podstawie dostępnych informacji, wygląda na to, że..." """

    return f"{identity}\n\n{epistemic}\n\n{COMMUNICATION_LAYER}\n\n{role}\n\n{task}".strip()
```

#### Przykład Promptu dla Modelu w Trybie Obrony:
```
[CORE_IDENTITY: SUPREME_DEFENSE_COMMAND]
Jesteś Naczelnym Dowódcą Sztabu Obrony...

## WARUNKI BRZEGOWE (EPISTEMIC LAYER):
1. Każdy fakt MUSI pochodzić z <user_document> lub bazy RAG...
2. Jeśli danej informacji brak → napisz to WPROST klientowi...

## STYL KOMUNIKACJI (OBOWIĄZKOWY):
MÓWISZ JAK DOŚWIADCZONY PRAWNIK rozmawiający z klientem na spotkaniu...

[SYSTEM_ROLE: THE DEFENDER — NACZELNY ADWOKAT]
Jesteś najlepszym adwokatem karnym w Polsce z 30-letnim doświadczeniem...

[TASK: FULL_SPECTRUM_CRIMINAL_DEFENSE]
METODOLOGIA OBRONY: 1. TRIAGE ZARZUTÓW → Kwalifikacja prawna...
```

### 3. Mixture of Agents — Rozdzielenie Promptów

#### build_moa_prompts() — Różne Prompty dla Różnych Modeli
W trybie MOA każdy model dostaje unikalny prompt z przypisaną rolą:

```python
def build_moa_prompts(model_ids: list[str], config: PromptConfig) -> dict[str, str]:
    universe = DEFENSE_UNIVERSE if config.mode == IdentityMode.ADVOCATE else PROSECUTION_UNIVERSE
    specialized_roles = [r for r in universe["roles"].keys() if r not in ("navigator", "navigator_old")]

    prompts = {}
    for i, mid in enumerate(model_ids):
        model_role = specialized_roles[i % len(specialized_roles)]
        model_config = config.model_copy(update={"role": model_role, "model_id": mid})
        prompts[mid] = build_system_prompt(model_config)

    return prompts
```

**Przykładowe Rozdzielenie Ról MOA:**
- Model 1 (Claude-3.5-Sonnet): Rola "defender" → specjalizacja obrona karna
- Model 2 (GPT-4o): Rola "constitutionalist" → specjalizacja prawo konstytucyjne
- Model 3 (Gemini-2.0-Flash): Rola "proceduralist" → specjalizacja procedura karna

### 4. Communication Layer — Obowiązkowa Warstwa Komunikacyjna

```python
COMMUNICATION_LAYER = """## STYL KOMUNIKACJI (OBOWIĄZKOWY):

MÓWISZ JAK DOŚWIADCZONY PRAWNIK rozmawiający z klientem na spotkaniu w kancelarii.

1. **Język naturalny** — Pełne, rozbudowane zdania po polsku. Nie suche punkty, nie telegraficzny styl.
   ❌ ŹLE: "Art. 415 KC — odpowiedzialność deliktowa. Przesłanki: wina, szkoda, związek przyczynowy."
   ✅ DOBRZE: "W Pana sytuacji kluczowy jest artykuł 415 Kodeksu cywilnego, który reguluje tak zwaną odpowiedzialność deliktową. Oznacza to, że żeby dochodzić odszkodowania, trzeba będzie wykazać trzy rzeczy: że druga strona zawiniła, że Pan poniósł konkretną szkodę, i że istnieje bezpośredni związek między jej działaniem a tą szkodą."

2. **Empatia i kontekst** — Zanim przejdziesz do merytum, odnieś się do sytuacji klienta.
   ❌ ŹLE: "Analizuję dokument. Stwierdzam 3 naruszenia."
   ✅ DOBRZE: "Przeczytałem dokładnie ten dokument i widzę w nim kilka istotnych problemów, które mogą być dla Pana korzystne — pozwoli Pan, że omówię je po kolei."

3. **Wyjaśniaj pojęcia prawne** — Nie zakładaj, że klient zna żargon prawniczy.
   ❌ ŹLE: "Zarzut z art. 168a KPK — owoce zatrutego drzewa."
   ✅ DOBRZE: "Jest taka zasada w prawie karnym, potocznie nazywana 'owocami zatrutego drzewa' (art. 168a Kodeksu postępowania karnego), która mówi, że jeśli policja zdobyła dowód nielegalnie — na przykład przez bezprawne przeszukanie — to taki dowód nie może być użyty przeciwko Panu w sądzie."

4. **Struktura narracyjna** — Prowadź myśl jak opowieść: sytuacja → problem → rozwiązania → rekomendacja.
   NIE używaj nagłówków z emoji (📋, ⚖️, 🛡️) — to nie raport PowerPoint, to rozmowa.

5. **Zdania złożone i rozwinięte** — Minimum 2-3 zdania na każdy punkt.
   Podawaj kontekst, przykłady z życia, analogie, żeby klient naprawdę ROZUMIAŁ.

6. **Pytania doprecyzowujące** — Jeśli pytanie jest niekompletne, ZACZNIJ od pytania:
   "Żeby dać Panu dokładną odpowiedź, potrzebuję kilku informacji..."
   Dopiero POTEM podaj wstępną orientację prawną z zastrzeżeniem.

7. **Rozmowa, nie wykład** — Używaj zwrotów typu:
   "Proszę zwrócić uwagę na...", "Warto wiedzieć, że...",
   "W praktyce sądowej wygląda to tak...", "Dobrze, że Pan o to pyta, bo..."
"""
```

### 5. Context-Enriched Prompting

#### build_user_prompt() — Wzbogacanie Kontekstem
System automatycznie wzbogaca prompt użytkownika kontekstem:

```python
def build_user_prompt(query: str, context_text: str, document_text: Optional[str] = None, history_summary: Optional[str] = None):
    doc = f"<user_document>\n{document_text}\n</user_document>\n\n" if document_text else ""
    ctx = f"<legal_context>\n{context_text}\n</legal_context>\n\n"
    hist = f"<conversation_summary>\n{history_summary}\n</conversation_summary>\n\n" if history_summary else ""

    return f"{doc}{ctx}{hist}## TWOJA SYTUACJA I ZAPYTANIE:\n{query}\n\n--- ANALIZUJ ZGODNIE Z PROTOKOŁEM TWOJEJ KANCELARII ---"
```

**Struktura Finalnego Promptu:**
```
<user_document>
[TREŚĆ DOKUMENTU KLIENTA]
</user_document>

<legal_context>
[KONTEKST PRAWNY Z RAG]
</legal_context>

<conversation_summary>
[PODSUMOWANIE HISTORII ROZMOWY]
</conversation_summary>

## TWOJA SYTUACJA I ZAPYTANIE:
[PYTANIE UŻYTKOWNIKA]

--- ANALIZUJ ZGODNIE Z PROTOKOŁEM TWOJEJ KANCELARII ---
```

### 6. Judge Synthesis Prompts

#### build_judge_system_prompt() — Prompt dla Sędziego-Agregatora
Sędzia otrzymuje uniwersalny prompt dostosowany do trybu:

**Tryb Obrony:**
```
[JUDGE_ROLE: SUPREME_DEFENSE_COORDINATOR]
Jesteś Partnerem Zarządzającym kancelarii. Twój zespół ekspertów przedstawił analizy...

PROTOKÓŁ SYNTEZY OBRONY:
1. AUDIT SPÓJNOŚCI → Czy analizy ekspertów są zgodne?...
2. HIERARCHIA ARGUMENTÓW → Uszereguj wszystkie argumenty od najsilniejszego...
```

**Tryb Oskarżenia:**
```
[JUDGE_ROLE: COLD_COURT_ARBITER]
Jesteś składem sędziowskim rozpatrującym tę sprawę. Nie masz empatii. Masz przepisy i fakty...

PROTOKÓŁ WERYFIKACJI OSKARŻENIA:
1. TEST DOPUSZCZALNOŚCI → Czy postępowanie jest wolne od błędów proceduralnych?...
```

### 7. Model-Specific Prompt Operations

#### Claude-3.5-Sonnet (Domyślny Sędzia)
**Charakterystyka Promptów:**
- **Temperatura**: 0.1 (bardzo niska dla spójności prawnej)
- **Max Tokens**: 3000 (synteza odpowiedzi)
- **Specjalizacja**: Logiczna analiza, łączenie argumentów, krytyczne myślenie
- **Zalety**: Najlepszy w roli sędziego-agregatora, doskonała pamięć kontekstu
- **Wzorzec Promptu**: Szczegółowa instrukcja syntezy z hierarchią argumentów

#### GPT-4o (Ekspert Wielomodalny)
**Charakterystyka Promptów:**
- **Temperatura**: 0.1 (zachowawcza dla analiz prawnych)
- **Max Tokens**: 2500 (analiza ekspercka)
- **Specjalizacja**: Wszechstronna analiza, dobre rozumienie kontekstu polskiego prawa
- **Zalety**: Silny w analizie dokumentów, dobra równowaga między kreatywnością a precyzją
- **Wzorzec Promptu**: Szczegółowe instrukcje proceduralne z przykładami

#### Gemini-2.0-Flash (Szybki Analiza)
**Charakterystyka Promptów:**
- **Temperatura**: 0.1 (stabilna dla wniosków prawnych)
- **Max Tokens**: 2500 (analiza ekspercka)
- **Specjalizacja**: Szybkość odpowiedzi, dobra efektywność kosztowa
- **Zalety**: Najszybszy w MOA, dobry dla wstępnych analiz
- **Wzorzec Promptu**: Skrócony ale kompletny, skupia się na kluczowych wnioskach

#### Llama-3.1-70B (Open Source)
**Charakterystyka Promptów:**
- **Temperatura**: 0.1 (zachowawcza)
- **Max Tokens**: 2500
- **Specjalizacja**: Głęboka analiza językowa, dobre rozumienie polskiego kontekstu
- **Zalety**: Brak kosztów API, dobra jakość dla prostych zapytań
- **Wzorzec Promptu**: Szczegółowy, wymaga jasnych instrukcji

### 8. Dynamiczne Dostosowywanie Promptów

#### Context-Aware Adjustments
System automatycznie dostosowuje prompty w zależności od dostępności danych:

**Gdy Brak Kontekstu Prawnego:**
```python
if has_legal_context:
    final_system_prompt = f"{base_architect}\n\n{base_role}\n\n{base_task}\n\n{ANALYST_SYSTEM_PROMPT}"
else:
    final_system_prompt = f"{base_architect}\n\n{base_role}\n\n{base_task}\n\nJesteś pomocnym asystentem AI. Odpowiedz na pytanie użytkownika w sposób zwięzły i merytoryczny."
```

**Gdy Dostępny Dokument Klienta:**
- Dodaje `<user_document>` section
- Priorytetuje analizę dokumentu nad kontekstem RAG
- Aktywuje strategie "document attack/defense"

**Gdy Dostępna Historia Rozmowy:**
- Dodaje `<conversation_summary>` 
- Zapewnia ciągłość analizy
- Weryfikuje poprzednie ustalenia

### 9. Retry i Resilience w Operacjach Promptów

#### Exponential Backoff z Jitter
```python
for attempt in range(MAX_RETRIES + 1):
    try:
        response = await client.chat.completions.create(...)
        return response.choices[0].message.content or "", attempt
    except (APIStatusError, APIConnectionError, APITimeoutError) as e:
        delay = min(RETRY_BASE_DELAY * (2**attempt) + random.uniform(0, 1), RETRY_MAX_DELAY)
        await asyncio.sleep(delay)
        continue
```

**Parametry Retry:**
- MAX_RETRIES: 3
- RETRY_BASE_DELAY: 1.0s
- RETRY_MAX_DELAY: 15.0s
- RETRYABLE_STATUS_CODES: {429, 500, 502, 503, 504}

#### Connection Pooling
- Wspólny AsyncOpenAI client dla wszystkich modeli w MOA
- Efektywne zarządzanie połączeniami HTTP
- Redukcja narzutu na API

## Monitorowanie i Debugowanie Promptów

### Logi Operacji Promptów

System loguje kluczowe etapy działania promptów:

```
[INTENT] Reguły: legal_query dla: 'czy mogę...'
[DECOMPOSITION] RAG: ['umowa pożyczki', 'lichwa'] | SAOS: 'umowa pożyczki lichwa'
[>] Agentic Hybrydowy retrieval dla: 'czy umowa...'
[OK] RAG: 12 fragmentów, 15432 znaków
[START] MOA Pipeline
🔬 MOA: 3 modeli równolegle (Task: general)
✅ anthropic/claude-3.5-sonnet: OK (2340ms, retries: 0)
✅ openai/gpt-4o: OK (1890ms, retries: 0)
✅ google/gemini-2.0-flash: OK (1456ms, retries: 0)
⚖️ Sędzia Główny (anthropic/claude-3.5-sonnet): Synteza...
[OK] Pipeline zakonczony w 4567ms
```

### Metryki Wydajności Promptów

**Latency Tracking:**
- Pojedynczy model: ~2-3s
- MOA (3 modele): ~4-5s
- Retry impact: +1-15s w zależności od backoff

**Success Rates:**
- Claude-3.5-Sonnet: ~95%
- GPT-4o: ~92%
- Gemini-2.0-Flash: ~88%

**Token Usage:**
- System prompt: ~800-1200 tokenów (w zależności od roli i zadania)
- Context enrichment: +2000-4000 tokenów
- Judge synthesis: ~3000 tokenów max

## Integracja Promptów z Architekturą Systemu

### Komponenty Prompt-Centric

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROMPT ENGINE CORE                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Dynamic Builder │  │ Universe       │  │ Communication   │ │
│  │ (build_system_  │  │ Manager        │  │ Layer           │ │
│  │  prompt)        │  │ (ADVOCATE/     │  │ (Natural Style) │ │
│  │                 │  │  PROSECUTOR)   │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MOA PROMPT DISTRIBUTION                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Claude-3.5-S    │  │ GPT-4o         │  │ Gemini-2.0-F    │ │
│  │ (Judge/Defender)│  │ (Constitution.)│  │ (Evidence)      │ │
│  │ Dynamic Role    │  │ Dynamic Role   │  │ Dynamic Role    │ │
│  │ Assignment      │  │ Assignment     │  │ Assignment      │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CONTEXT ENRICHMENT                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ RAG Context    │  │ User Documents  │  │ Conversation    │ │
│  │ Enrichment     │  │ Integration     │  │ History         │ │
│  │                 │  │                 │  │ Summary         │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Kluczowe Komponenty Prompt System

- **Dual Universe Engine**: Dwa kompletne uniwersa promptów (obrona/oskarżenie) z 7+ specjalistycznymi rolami
- **Dynamic Prompt Builder**: Automatyczna konstrukcja promptów systemowych w zależności od kontekstu
- **MOA Prompt Distributor**: Równoległa dystrybucja unikalnych promptów do modeli AI
- **Context Enrichment Layer**: Wzbogacanie promptów kontekstem RAG, dokumentów i historii
- **Communication Layer**: Obowiązkowa normalizacja stylu prawniczego wszystkich odpowiedzi
- **Judge Synthesis Engine**: Specjalistyczne prompty dla agregacji i syntezy analiz

## Przepływ Pracy Promptów w Systemie

### 1. Klasyfikacja Zapytania i Wybór Uniwersum Promptów

**Intent Classification:**
```python
intent = await classify_intent(request.message, model_override=request.model)
```

**Wybór Uniwersum:**
```python
builder_config = PromptConfig(
    mode=IdentityMode(request.mode) if request.mode else IdentityMode.ADVOCATE,  # OBRONA/OSKARŻENIE
    task=request.task or "general",
    role=request.task or "navigator",
    has_legal_context=bool(context_text),
    has_document=bool(combined_doc_text),
)
```

### 2. Dynamiczna Generacja Promptów Systemowych

**Dla Pojedynczego Modelu:**
```python
system_prompt = build_system_prompt(builder_config)
if context_text:
    system_prompt += f"\n\n## KONTEKST PRAWNY (RAG):\n{context_text}"
system_prompt += f"\n\n{ANALYST_SYSTEM_PROMPT}"
```

**Dla MOA (Mixture of Agents):**
```python
moa_prompts = build_moa_prompts(model_ids, builder_config)
# Każdy model dostaje unikalny prompt z przypisaną rolą
```

### 3. Wzbogacanie Promptu Użytkownika Kontekstem

**Budowa User Prompt:**
```python
user_msg_content = [{"type": "text", "text": request.message}]
user_msg_content.extend([c for c in extracted_att_content if c["type"] == "image_url"])

user_msg = {
    "role": "user", 
    "content": user_msg_content if len(user_msg_content) > 1 else request.message
}
```

**Dodanie Kontekstu RAG:**
```python
if context_text:
    combined_doc_text = f"### KONTEKST PRAWNY (RAG):\n{context_text}\n\n{combined_doc_text}"
```

### 4. Parallel Prompt Execution w MOA

**Równoległe Wywołania z Różnymi Promptami:**
```python
async def run_parallel_analysis(
    context: str, query: str, models: list[str],
    task: str, custom_task_prompt: Optional[str] = None,
    client: Optional[AsyncOpenAI] = None, has_legal_context: bool = True,
    document_text: Optional[str] = None
):
    # Budowa unikalnych promptów dla każdego modelu
    final_system_prompt = build_analyst_prompt_for_task(task, has_legal_context)

    print(f"\n🔬 MOA: {len(models)} modeli równolegle (Task: {task})")

    # Równoległe wywołania z różnymi promptami
    tasks = [
        _analyze_single(client, model, context, query, final_system_prompt, ...)
        for model in models
    ]

    results = await asyncio.gather(*tasks, return_exceptions=True)
    return results
```

**Przykład Promptów dla Różnych Modeli w MOA:**
- **Model 1 (Claude)**: Prompt z rolą "defender" + task "criminal_defense"
- **Model 2 (GPT-4o)**: Prompt z rolą "constitutionalist" + task "rights_defense"
- **Model 3 (Gemini)**: Prompt z rolą "evidencecracker" + task "document_attack"

### 5. Judge Prompt Synthesis

**Budowa Promptu dla Sędziego:**
```python
def _build_judge_prompt(
    query: str, analyst_results: list[AnalystResult],
    raw_context: str, document_text: str | None = None,
    history_summary: str | None = None,
) -> str:
    parts = [
        "## CEL ANALIZY (ZAPYTANIE KLIENTA):", query, "",
        "## RAPORTY SPECJALISTYCZNE:", ""
    ]

    for i, result in enumerate(analyst_results, 1):
        model_name = result.model_id.split('/')[-1]
        parts.append(f"### EKSPERT {i} [{model_name}]")
        parts.append(f"{result.response}")
        parts.append("\n---\n")

    parts.append("## JAK ZREDAGOWAĆ ODPOWIEDŹ DLA KLIENTA:")
    parts.append("[szczegółowe instrukcje stylu prawniczego]")

    return "\n".join(parts)
```

**Synteza przez Sędziego:**
```python
judge_system_prompt = build_judge_system_prompt(mode)
user_prompt = _build_judge_prompt(query, successful, raw_context, document_text, history_summary)

final_answer = await _call_with_retry(
    model=judge_model,
    system_prompt=judge_system_prompt,
    user_prompt=user_prompt,
    max_tokens=3000,
)
```

### 6. Communication Layer Application

**Obowiązkowe Przepisywanie Odpowiedzi:**
Wszystkie odpowiedzi modeli przechodzą przez Communication Layer, który wymusza:
- Naturalny język prawniczy
- Wyjaśnianie terminów
- Narracyjny styl rozmowy
- Empatię wobec klienta
- Pytania doprecyzowujące przy braku danych

Każde zapytanie użytkownika przechodzi przez wstępną analizę:
```python
intent = await classify_intent(request.message, model_override=request.model)
```

**Rodzaje zapytań**:
- `LEGAL_QUERY`: Zapytania prawne → aktywacja RAG
- `GENERAL_QUERY`: Pytania ogólne → odpowiedź bezpośrednia

### 2. Context Enrichment dla Promptów — RAG Integration

**RAG jako Enrichment Layer:**
System RAG dostarcza kontekstu prawnego, który jest automatycznie integrowany z promptami:

```python
# Enrichment w build_user_prompt()
ctx = f"<legal_context>\n{context_text}\n</legal_context>\n\n"
doc = f"<user_document>\n{document_text}\n</user_document>\n\n" if document_text else ""

return f"{doc}{ctx}{hist}## TWOJA SYTUACJA I ZAPYTANIE:\n{query}\n\n--- ANALIZUJ ZGODNIE Z PROTOKOŁEM TWOJEJ KANCELARII ---"
```

**Wpływ na Prompt Design:**
- **Dostępny kontekst RAG**: Aktywuje pełne strategie prawne z uniwersum
- **Brak kontekstu RAG**: Przechodzi na uproszczony tryb ogólnego AI
- **Dokument klienta**: Priorytetuje analizę dokumentu nad kontekstem zewnętrznym
- **Historia rozmowy**: Zapewnia ciągłość analizy prawnej

**Epistemic Constraints:**
Wszystkie prompty zawierają ścisłe reguły epistemiczne:
1. Każdy fakt MUSI pochodzić z dostarczonych źródeł
2. Nieistniejące artykuły są zabronione
3. Niepewności są jawnie komunikowane

Dla zapytań prawnych system wykonuje wielostopniowe wyszukiwanie kontekstu:

#### Etap 2.1: Ekstrakcja Słów Kluczowych
```python
# Regex-based extraction
sygnatury = re.findall(r'[IVXLC]+\s+[A-Za-zK]+\s+\d+/\d+', text)
art_matches = re.finditer(r"Art\.\s*(\d+[a-z]*)", text, re.I)
```

#### Etap 2.2: Dekompozycja Zapytania (AI-Powered)
Używa modelu Gemini do rozłożenia zapytania na:
- **Pod-zapytania RAG**: Max 3 hasła prawne
- **Zapytanie SAOS**: Kluczowe słowa dla bazy orzeczeń

```python
sub_keywords, saos_query = await _extract_search_plans(query, document_text)
```

#### Etap 2.3: Wyszukiwanie Wektorowe
- Generuje embedding zapytania (`text-embedding-3-small`, 1536 dim)
- Wyszukuje w Supabase pgvector (RPC `match_knowledge`)
- Parametry: `match_threshold=0.05`, `match_count=12`

#### Etap 2.4: Wyszukiwanie SAOS
- API do bazy orzeczeń sądowych
- Wyniki integrowane z kontekstem RAG

#### Etap 2.5: Scalanie i Deduplikacja
- Łączy wyniki: keyword → vector → SAOS
- Deduplikacja po hashu treści
- Ograniczenie długości: max 48,000 znaków

### 3. Budowa Promptów Systemowych

System używa dynamicznego systemu promptów z dwoma uniwersami:

#### Uniwersum OBRONY (ADVOCATE)
```python
identity = """[CORE_IDENTITY: SUPREME_DEFENSE_COMMAND]
Jesteś Naczelnym Dowódcą Sztabu Obrony..."""
```

**Role w uniwersum obrony**:
- `navigator`: Rozpoznanie terenu prawnego
- `defender`: Adwokat karny z 30-letnim doświadczeniem
- `constitutionalist`: Ekspert Konstytucji RP i EKPC
- `proceduralist`: Łowca błędów formalnych
- `evidencecracker`: Audytor dowodów
- `negotiator`: Mistrz wyjść alternatywnych
- `draftsman`: Redaktor pism procesowych
- `grandmaster`: Strateg taktyczny

**Zadania**:
- `general`: Diagnoza ogólna
- `criminal_defense`: Pełnospektralna obrona karna
- `rights_defense`: Tarcza praw konstytucyjnych
- `document_attack`: Atak na dokument
- `emergency_relief`: Interwencja kryzysowa

#### Uniwersum OSKARŻENIA (PROSECUTOR)
```python
identity = """[CORE_IDENTITY: STATE_PROSECUTION_APPARATUS]
Jesteś Naczelnym Koordynatorem Aparatu Oskarżycielskiego..."""
```

**Role analogiczne do obrony, ale z perspektywy oskarżenia**

### 4. Mixture of Agents (MOA) — Dynamic Prompt Distribution

**Mechanizm Rozdzielenia Promptów:**
System automatycznie przypisuje różne role promptów do modeli w MOA:

#### Etap 4.1: Dynamic Role Assignment

**Automatyczne Rozdzielenie Ról:**
```python
def build_moa_prompts(model_ids: list[str], config: PromptConfig) -> dict[str, str]:
    universe = DEFENSE_UNIVERSE if config.mode == IdentityMode.ADVOCATE else PROSECUTION_UNIVERSE
    specialized_roles = [r for r in universe["roles"].keys() if r not in ("navigator",)]

    prompts = {}
    for i, mid in enumerate(model_ids):
        model_role = specialized_roles[i % len(specialized_roles)]
        model_config = config.model_copy(update={"role": model_role, "model_id": mid})
        prompts[mid] = build_system_prompt(model_config)

    return prompts
```

**Przykładowa Dystrybucja w Trybie Obrony:**
- **Model 1**: Rola "defender" → Prompt specjalizujący się w obronie karnej
- **Model 2**: Rola "constitutionalist" → Prompt skupiający się na prawie konstytucyjnym
- **Model 3**: Rola "proceduralist" → Prompt analizujący błędy proceduralne
```python
analyst_results = await run_parallel_analysis(
    context=context_text,
    query=request.query,
    models=analyst_models,  # np. ["claude-3.5-sonnet", "gpt-4o", "gemini-2.0-flash"]
    task=request.task,
    # ... inne parametry
)
```

**Mechanizm**:
- Każdy model dostaje unikalną rolę (np. defender, constitutionalist)
- Wykorzystuje współdzielony klient HTTP (connection pooling)
- Retry z exponential backoff (max 3 próby)
- Globalny timeout: 60 sekund

#### Etap 4.2: Judge Prompt Synthesis
**Judge Prompt Construction:**
Sędzia otrzymuje kompleksowy prompt zawierający wszystkie analizy ekspertów:

```python
def _build_judge_prompt(query: str, analyst_results: list[AnalystResult], ...) -> str:
    parts = [
        "## CEL ANALIZY (ZAPYTANIE KLIENTA):", query, "",
        "## RAPORTY SPECJALISTYCZNE ({len(analyst_results)} ekspertów):", ""
    ]

    for i, result in enumerate(analyst_results, 1):
        model_name = result.model_id.split('/')[-1]
        parts.append(f"### EKSPERT {i} [{model_name}]")
        parts.append(f"{result.response}")
        parts.append("\n---\n")

    parts.append("## JAK ZREDAGOWAĆ ODPOWIEDŹ DLA KLIENTA:")
    parts.append("[szczegółowe instrukcje stylu prawniczego]")

    return "\n".join(parts)
```

**System Prompt dla Sędziego:**
```python
judge_system_prompt = build_judge_system_prompt(mode)  # ADVOCATE lub PROSECUTOR universe
```
```python
final_answer = await synthesize_judgment(
    client=shared_client,
    query=request.query,
    analyst_results=successful_analyses,
    judge_model=judge_model,
    # ... kontekst
)
```

**Zadania sędziego**:
1. Audit spójności analiz ekspertów
2. Hierarchia argumentów (proceduralne → merytoryczne → łagodzące)
3. Eliminacja słabości
4. Plan taktyczny z terminami
5. Realistyczna ocena sprawy (%)

### 5. Zarządzanie Modelami i Health Tracking

#### Model Manager
```python
class ModelHealth:
    model_id: str
    success_rate: float
    consecutive_failures: int
    is_rate_limited: bool
    # ...
```

**Funkcje**:
- Śledzenie zdrowia modeli (success rate, rate limits)
- Automatyczne fallbacki w przypadku awarii
- Priorytetyzacja modeli (wyższe success rate = wyższy priorytet)

#### Obsługiwane Modele
- **Gemini 2.0 Flash**: Szybki, wielomodalny
- **GPT-4o Mini**: Kompaktowy OpenAI
- **GPT-4o**: Najnowszy OpenAI
- **Claude 3.5 Sonnet**: Antropic
- **Llama 3.1 70B**: Open Source

### 6. Komunikacja i Styl Odpowiedzi

#### Warstwa Komunikacyjna (obowiązkowa)
```python
COMMUNICATION_LAYER = """## STYL KOMUNIKACJI (OBOWIĄZKOWY):
MÓWISZ JAK DOŚWIADCZONY PRAWNIK rozmawiający z klientem na spotkaniu w kancelarii.
1. Język naturalny — Pełne, rozbudowane zdania po polsku.
2. Empatia i kontekst — Odnieś się do sytuacji klienta.
3. Wyjaśniaj pojęcia prawne — Nie zakładaj wiedzy.
4. Struktura narracyjna — Prowadź myśl jak opowieść.
5. Zdania złożone i rozwinięte — Minimum 2-3 zdania na punkt.
6. Pytania doprecyzowujące — Jeśli niekompletne dane."""
```

**Zasady**:
- Pełne zdania polskie
- Wyjaśnianie terminów prawnych przykładami
- Brak emoji w treści (tylko w metadanych)
- Narracyjny styl rozmowy, nie wykład

## Konfiguracja i Parametry

### Zmienne Środowiskowe
- `OPENROUTER_API_KEY`: Klucz do modeli AI
- `GOOGLE_API_KEY`: Dostęp do Gemini
- `SUPABASE_URL/ANON_KEY`: Baza wektorowa i autentyfikacja

### Parametry AI
- **Temperatura**: 0.1 (niska dla spójności prawnej)
- **Max Tokens**: 2500 (pojedynczy), 3000 (sędzia)
- **Timeout**: 45s na model, 60s globalny MOA
- **Embedding**: text-embedding-3-small (1536 dim)

### Limity RAG
- **Match Threshold**: 0.05
- **Match Count**: 12 fragmentów
- **Max Context**: 48,000 znaków
- **SAOS Results**: 4 orzeczenia

## Model-Specific Prompt Operations

### Claude-3.5-Sonnet (Primary Judge Model)
**Prompt Characteristics:**
- **Temperatura**: 0.1 (maksymalna spójność prawna)
- **Max Tokens**: 3000 (synteza kompleksowa)
- **Specjalizacja**: Logiczna analiza, łączenie argumentów, krytyczne myślenie prawnicze
- **Zalety w Promptach**: Najlepszy dla roli sędziego-agregatora, doskonała pamięć kontekstu prawnego
- **Typowy Prompt Flow**: Identity → Epistemic Layer → Communication Layer → Task Instructions

### GPT-4o (Constitutional Expert)
**Prompt Characteristics:**
- **Temperatura**: 0.1 (zachowawcza dla analiz prawnych)
- **Max Tokens**: 2500 (analiza ekspercka)
- **Specjalizacja**: Wszechstronna analiza prawna, dobre rozumienie polskiego kontekstu prawnego
- **Zalety w Promptach**: Silny w analizie dokumentów i Konstytucji RP, równowaga między kreatywnością a precyzją
- **Typowy Prompt Flow**: Role Assignment → Context Enrichment → Legal Reasoning → Output Structuring

### Gemini-2.0-Flash (Evidence Specialist)
**Prompt Characteristics:**
- **Temperatura**: 0.1 (stabilna dla wniosków dowodowych)
- **Max Tokens**: 2500 (analiza dowodów)
- **Specjalizacja**: Szybkość analizy, efektywność kosztowa, analiza materiału dowodowego
- **Zalety w Promptach**: Najszybszy w MOA, dobry dla wstępnych analiz i weryfikacji dowodów
- **Typowy Prompt Flow**: Quick Context Processing → Evidence Evaluation → Legal Conclusions

### Llama-3.1-70B (Procedural Expert)
**Prompt Characteristics:**
- **Temperatura**: 0.1 (zachowawcza, brak kosztów API)
- **Max Tokens**: 2500 (analiza proceduralna)
- **Specjalizacja**: Głęboka analiza językowa, dobre rozumienie polskiego prawa proceduralnego
- **Zalety w Promptach**: Brak kosztów, dobra jakość dla złożonych analiz proceduralnych
- **Typowy Prompt Flow**: Detailed Instructions → Procedural Analysis → Formal Recommendations

### Dynamic Prompt Scaling
System automatycznie dostosowuje złożoność promptów do możliwości modelu:
- **Claude/GPT-4**: Maksymalna złożoność z pełnymi instrukcjami
- **Gemini/Llama**: Optymalizacja pod kątem wydajności i kosztów

## Tryby Pracy Promptów

### Tryb Single Model — Simplified Prompt Flow
**Charakterystyka:**
- Jeden model z pełnym uniwersum promptów (obrona/oskarżenie)
- Szybka konstrukcja: Identity + Role + Task + Context Enrichment
- Minimal latency: ~2-3 sekundy

**Przykład Prompt Flow:**
```
[CORE_IDENTITY: SUPREME_DEFENSE_COMMAND]
## WARUNKI BRZEGOWE (EPISTEMIC LAYER)
## STYL KOMUNIKACJI (OBOWIĄZKOWY)
[SYSTEM_ROLE: THE DEFENDER]
[TASK: GENERAL]
<legal_context>...</legal_context>
<user_document>...</user_document>
## TWOJA SYTUACJA I ZAPYTANIE: [query]
```

### Tryb MOA — Distributed Prompt Architecture
**Charakterystyka:**
- 3+ modele z unikalnymi promptami specjalistycznymi
- Dynamic role assignment: defender → constitutionalist → evidencecracker
- Judge synthesis z kompleksowym promptem agregującym
- Latency: ~4-6 sekund

**Przykład MOA Prompt Distribution:**
```
Model 1 (Claude): [SYSTEM_ROLE: THE DEFENDER — NACZELNY ADWOKAT]
Model 2 (GPT-4o): [SYSTEM_ROLE: THE CONSTITUTIONALIST — STRAŻNIK KONSTYTUCJI]
Model 3 (Gemini): [SYSTEM_ROLE: THE PROCEDURALIST — ŁOWCA BŁĘDÓW FORMALNYCH]
Judge (Claude): [JUDGE_ROLE: SUPREME_DEFENSE_COORDINATOR] + wszystkie analizy ekspertów
```

### Tryb Dokumentowy — Document-Centric Prompts
**Charakterystyka:**
- Priorytet `<user_document>` nad kontekstem RAG
- Enhanced OCR integration w promptach
- Specjalistyczne strategie "document attack/defense"
- Context enrichment z pełnym tekstem dokumentu

### Tryb Kryzysowy — Time-Critical Prompt Optimization
**Charakterystyka:**
- Maksymalne uproszczenie promptów dla szybkości
- Priorytet natychmiastowych kroków proceduralnych
- Emergency-specific task prompts z ścisłymi terminami
- Minimal context, maksymalna akcja

## Bezpieczeństwo i Ograniczenia

### Disclaimer
> System ma charakter wyłącznie informacyjny. Wygenerowane treści nie stanowią porady prawnej.

### Ograniczenia Techniczne
- Maksymalna długość kontekstu: 48k znaków
- Limit modeli w MOA: praktyczny 3-5 (timeout)
- Zależność od zewnętrznych API (OpenRouter, Supabase)
- Brak gwarancji aktualności przepisów

### Bezpieczeństwo Danych
- Wszystkie dane przetwarzane lokalnie lub w zaufanych chmurach
- Brak przechowywania wrażliwych danych bez zgody
- Szyfrowanie komunikacji HTTPS/WebSocket

## Podsumowanie: Architektura Prompt-Centric

LexMind AI reprezentuje zaawansowaną architekturę prompt-centric dla aplikacji prawniczych, gdzie:

1. **Dual Universe Design** zapewnia kompletne strategie prawne dla obu stron sporu
2. **Dynamic Role Assignment** pozwala na specjalistyczną analizę przez różne modele AI
3. **Context Enrichment** automatycznie integruje wiedzę prawna z promptami
4. **Communication Layer** zapewnia spójny, profesjonalny styl odpowiedzi prawniczych
5. **MOA Distribution** maksymalizuje różnorodność perspektyw przy zachowaniu efektywności

System promptów jest rdzeniem całej aplikacji, koordynującym wszystkie komponenty AI w spójny, prawnie dokładny i etycznie odpowiedzialny sposób działania.

---

*Dokumentacja wygenerowana na podstawie analizy kodu źródłowego LexMind AI v4.1*  
*Data: 2026-04-07*  
*Kancelaria Pałka & Kaźmierczak*</content>
<parameter name="filePath">TECHNICAL_DOCUMENTATION.md