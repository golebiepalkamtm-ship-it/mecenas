from services.timeline_builder import should_build_timeline


def test_should_build_timeline_on_procedural_keywords():
    assert should_build_timeline(
        document_text="",
        user_query="Kiedy mija termin na odwołanie?",
        attachments_count=0,
    )


def test_should_build_timeline_on_date_in_query():
    assert should_build_timeline(
        document_text="",
        user_query="Pismo doręczono 12.05.2026. Jaki mam termin?",
        attachments_count=0,
    )


def test_should_not_build_timeline_for_plain_question():
    assert not should_build_timeline(
        document_text="",
        user_query="Co oznacza art. 15 k.p.a.?",
        attachments_count=0,
    )

