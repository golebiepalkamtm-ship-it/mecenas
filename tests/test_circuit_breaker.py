from services.circuit_breaker import CircuitBreaker


def test_closed_allows_requests():
    t = [0.0]
    cb = CircuitBreaker(name="X", failure_threshold=2, open_seconds=10.0, half_open_max_calls=1, time_fn=lambda: t[0])
    assert cb.allow_request() is True


def test_opens_after_threshold():
    t = [0.0]
    cb = CircuitBreaker(name="X", failure_threshold=2, open_seconds=10.0, half_open_max_calls=1, time_fn=lambda: t[0])
    cb.on_failure("a")
    assert cb.allow_request() is True
    cb.on_failure("b")
    assert cb.allow_request() is False


def test_half_open_then_close_on_success():
    t = [0.0]
    cb = CircuitBreaker(name="X", failure_threshold=1, open_seconds=10.0, half_open_max_calls=1, time_fn=lambda: t[0])
    cb.on_failure("boom")
    assert cb.allow_request() is False
    t[0] = 11.0
    assert cb.allow_request() is True
    cb.on_success()
    assert cb.allow_request() is True


def test_half_open_reopens_on_failure():
    t = [0.0]
    cb = CircuitBreaker(name="X", failure_threshold=1, open_seconds=10.0, half_open_max_calls=1, time_fn=lambda: t[0])
    cb.on_failure("boom")
    t[0] = 11.0
    assert cb.allow_request() is True
    cb.on_failure("still bad")
    assert cb.allow_request() is False

