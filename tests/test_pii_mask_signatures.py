"""Testy PII mask — ochrona sygnatur akt sądowych, walidacja PESEL, spójne mapowanie."""
import pytest

from services.pii_mask import mask_pii, _is_valid_pesel, _EntityMapper


# ---------------------------------------------------------------------------
# Walidacja PESEL
# ---------------------------------------------------------------------------
class TestPeselValidation:
    def test_valid_pesel(self):
        # 44051401458 — poprawny PESEL (suma kontrolna OK)
        assert _is_valid_pesel("44051401458") is True

    def test_invalid_pesel_bad_checksum(self):
        assert _is_valid_pesel("12345678901") is False

    def test_too_short(self):
        assert _is_valid_pesel("1234567890") is False

    def test_non_digit(self):
        assert _is_valid_pesel("1234567890a") is False


# ---------------------------------------------------------------------------
# Ochrona sygnatur akt sądowych
# ---------------------------------------------------------------------------
class TestCourtSignatureProtection:
    def test_basic_signature_not_masked(self):
        text = "Sprawa I ACa 123/24 dotyczy odwołania."
        result = mask_pii(text)
        assert "I ACa 123/24" in result

    def test_sa_wr_signature(self):
        text = "Wyrok II SA/Wr 456/23 z dnia 15.01.2023."
        result = mask_pii(text)
        assert "II SA/Wr 456/23" in result

    def test_csk_signature(self):
        text = "Postanowienie IV CSK 78/22."
        result = mask_pii(text)
        assert "IV CSK 78/22" in result

    def test_czp_signature(self):
        text = "Uchwała III CZP 1/21 Sądu Najwyższego."
        result = mask_pii(text)
        assert "III CZP 1/21" in result

    def test_krs_not_masked(self):
        text = "KRS: 0000123456"
        result = mask_pii(text)
        assert "KRS" in result


# ---------------------------------------------------------------------------
# Maskowanie rzeczywistych PII
# ---------------------------------------------------------------------------
class TestPiiMasking:
    def test_valid_pesel_masked(self):
        result = mask_pii("PESEL: 44051401458")
        assert "44051401458" not in result
        assert "[PESEL_" in result

    def test_invalid_pesel_not_masked(self):
        # 12345678901 — błędna suma kontrolna → nie jest PESELem
        result = mask_pii("Numer: 12345678901")
        assert "12345678901" in result

    def test_email_masked(self):
        result = mask_pii("Kontakt: jan@example.com")
        assert "jan@example.com" not in result
        assert "[EMAIL_" in result

    def test_id_card_masked(self):
        result = mask_pii("Dowód: ABC123456")
        assert "ABC123456" not in result
        assert "[DOWÓD_" in result

    def test_phone_masked(self):
        result = mask_pii("Tel: +48 123 456 789")
        assert "123 456 789" not in result
        assert "[TELEFON_" in result

    def test_dates_not_masked(self):
        text = "Doręczono dnia 15.03.2024 roku."
        result = mask_pii(text)
        assert "15.03.2024" in result


# ---------------------------------------------------------------------------
# Spójne mapowanie encji
# ---------------------------------------------------------------------------
class TestConsistentMapping:
    def test_same_pesel_same_label(self):
        mapper = _EntityMapper()
        text1 = mask_pii("PESEL: 44051401458", mapper=mapper)
        text2 = mask_pii("Ponownie: 44051401458", mapper=mapper)
        # Oba powinny mieć ten sam label [PESEL_1]
        assert "[PESEL_1]" in text1
        assert "[PESEL_1]" in text2

    def test_different_emails_different_labels(self):
        mapper = _EntityMapper()
        text = mask_pii("a@x.com i b@y.com", mapper=mapper)
        assert "[EMAIL_1]" in text
        assert "[EMAIL_2]" in text

    def test_mapper_counter_increments(self):
        mapper = _EntityMapper()
        l1 = mapper.get_label("value1", "TEST")
        l2 = mapper.get_label("value2", "TEST")
        assert l1 == "[TEST_1]"
        assert l2 == "[TEST_2]"


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------
class TestEdgeCases:
    def test_empty_string(self):
        assert mask_pii("") == ""

    def test_none_like(self):
        assert mask_pii("") == ""

    def test_mixed_pii_and_signature(self):
        text = (
            "Pan Jan Kowalski, PESEL 44051401458, "
            "w sprawie I ACa 123/24, kontakt: jan@mail.com"
        )
        result = mask_pii(text)
        # Sygnatura chroniona
        assert "I ACa 123/24" in result
        # PII zamaskowane
        assert "44051401458" not in result
        assert "jan@mail.com" not in result
        # Imię/nazwisko NIE jest maskowane (brak regex na imiona)
        assert "Jan Kowalski" in result
