"""Server-side catalog of supported legal document types."""
from __future__ import annotations

DOCUMENT_TYPE_HINTS: dict[str, str] = {
    "pozew-zaplata": "To ma byc pozew o zaplate.",
    "pozew-rozwod": "To ma byc pozew o rozwod.",
    "pozew-alimenty": "To ma byc pozew o alimenty.",
    "pozew-eksmisja": "To ma byc pozew o eksmisje.",
    "odpowiedz-pozew": "To ma byc odpowiedz na pozew.",
    "sprzeciw-nakaz": "To ma byc sprzeciw od nakazu zaplaty.",
    "zarzuty-nakaz": "To ma byc pismo z zarzutami od nakazu zaplaty.",
    "apelacja-cywilna": "To ma byc apelacja cywilna.",
    "zazalenie-cywilne": "To ma byc zazalenie.",
    "wniosek-dowodowy": "To ma byc pismo zawierajace wnioski dowodowe.",
    "wniosek-uzasadnienie": "To ma byc wniosek o uzasadnienie orzeczenia.",
    "wniosek-przywrocenie-terminu": "To ma byc wniosek o przywrocenie terminu.",
    "odwolanie-decyzja-admin": "To ma byc odwolanie od decyzji administracyjnej.",
    "skarga-wsa": "To ma byc skarga do WSA.",
    "skarga-kasacyjna-nsa": "To ma byc skarga kasacyjna do NSA.",
    "ponaglenie-kpa": "To ma byc ponaglenie na bezczynnosc lub przewleklosc.",
    "wniosek-info-publiczna": "To ma byc wniosek o udostepnienie informacji publicznej.",
    "pismo-ogolne-epuap": "To ma byc pismo ogolne do podmiotu publicznego.",
    "wniosek-zaswiadczenie": "To ma byc wniosek o wydanie zaswiadczenia.",
    "wniosek-umorzenie-postepowania": "To ma byc wniosek o umorzenie postepowania administracyjnego.",
    "reklamacja-towaru": "To ma byc reklamacja towaru.",
    "reklamacja-uslugi": "To ma byc reklamacja uslugi.",
    "odstapienie-14-dni": "To ma byc oswiadczenie o odstapieniu od umowy zawartej na odleglosc.",
    "wezwanie-zaplaty": "To ma byc przedsadowe wezwanie do zaplaty.",
    "wezwanie-wykonanie-umowy": "To ma byc wezwanie do wykonania umowy.",
    "wezwanie-usuniecie-wad": "To ma byc wezwanie do usuniecia wad.",
    "wezwanie-zwrot-zaliczki": "To ma byc wezwanie do zwrotu zaliczki.",
    "wypowiedzenie-najem": "To ma byc wypowiedzenie umowy najmu.",
    "wypowiedzenie-telekom": "To ma byc wypowiedzenie umowy telekomunikacyjnej.",
    "odwolanie-wypowiedzenie-praca": "To ma byc odwolanie od wypowiedzenia umowy o prace.",
    "pozew-przywrocenie-pracy": "To ma byc pozew o przywrocenie do pracy.",
    "pozew-zalegle-wynagrodzenie": "To ma byc pozew o zalegle wynagrodzenie.",
    "odwolanie-zus": "To ma byc odwolanie od decyzji ZUS.",
    "wniosek-zasilek-zus": "To ma byc pismo dotyczace zasilku z ZUS.",
    "odwolanie-decyzja-us": "To ma byc odwolanie od decyzji urzedu skarbowego.",
    "czynny-zal": "To ma byc czynny zal.",
    "wniosek-raty-podatku": "To ma byc wniosek o rozlozenie podatku na raty.",
    "wniosek-umorzenie-zaleglosci": "To ma byc wniosek o umorzenie zaleglosci podatkowej.",
    "wniosek-nadplata": "To ma byc wniosek o stwierdzenie nadplaty.",
    "pelnomocnictwo-ogolne-info": "To ma byc pismo dotyczace pelnomocnictwa ogolnego PPO-1.",
    "zawiadomienie-przestepstwo": "To ma byc zawiadomienie o podejrzeniu popelnienia przestepstwa.",
    "wniosek-sciganie": "To ma byc wniosek o sciganie.",
    "zazalenie-umorzenie": "To ma byc zazalenie na umorzenie dochodzenia lub sledztwa.",
    "wniosek-obronca-z-urzedu": "To ma byc wniosek o obronce z urzedu.",
    "wniosek-kw-wpis": "To ma byc pismo do wniosku o wpis do ksiegi wieczystej.",
    "wniosek-kw-zalozenie": "To ma byc pismo do zalozenia ksiegi wieczystej.",
    "wezwanie-oproznienie-lokalu": "To ma byc wezwanie do oproznienia lokalu.",
    "oswiadczenie": "To ma byc formalne oswiadczenie.",
    "wniosek-ogolny": "To ma byc formalny wniosek.",
    "odpowiedz-na-pismo": "To ma byc odpowiedz na pismo urzedowe.",
    "pismo-przewodnie": "To ma byc pismo przewodnie.",
}


def get_document_type_hint(document_type: str | None) -> str:
    if not document_type:
        return ""
    return DOCUMENT_TYPE_HINTS.get(document_type, "")

