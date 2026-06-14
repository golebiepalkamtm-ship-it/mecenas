from services.context_relevance import assess_private_context_relevance


def test_relevance_explicit_markers():
    dec = assess_private_context_relevance(
        user_query="W mojej sprawie starosta chce mnie skierować na badania",
        masked_doc_text="...",
        masked_chat_history="",
    )
    assert dec.use_private_context is True


def test_relevance_generic_question_disables_private():
    dec = assess_private_context_relevance(
        user_query="Jak wygląda procedura kontroli drogowej policji?",
        masked_doc_text="sygnatura sprawy kd.5430 ... starosta ...",
        masked_chat_history="",
    )
    assert dec.use_private_context is False


def test_relevance_token_overlap_enables_private():
    dec = assess_private_context_relevance(
        user_query="Czy można umorzyć postępowanie KD.5430.664.2026?",
        masked_doc_text="... sygnatura sprawy KD.5430.664.2026.MB ...",
        masked_chat_history="",
    )
    assert dec.use_private_context is True

