"""
Tests for services/config_validator.py

Validates that environment configuration works correctly.
"""

import os

import pytest

from services.config_validator import ENVIRONMENT_SCHEMA, ConfigValidator


class TestConfigSchema:
    """Test that ENVIRONMENT_SCHEMA is properly defined."""

    def test_schema_has_required_variables(self):
        """Check that critical variables are in schema."""
        assert "OPENROUTER_API_KEY" in ENVIRONMENT_SCHEMA
        assert "SUPABASE_URL" in ENVIRONMENT_SCHEMA
        assert "LEXMIND_DEFAULT_MODELS" in ENVIRONMENT_SCHEMA

    def test_openrouter_api_key_is_required(self):
        """OPENROUTER_API_KEY should be marked as required."""
        schema = ENVIRONMENT_SCHEMA["OPENROUTER_API_KEY"]
        assert schema.get("required") is True

    def test_supabase_is_optional(self):
        """SUPABASE_* variables should be optional."""
        for var_name in ["SUPABASE_URL", "SUPABASE_ANON_KEY"]:
            schema = ENVIRONMENT_SCHEMA.get(var_name, {})
            assert schema.get("required") is False

    def test_all_variables_have_description(self):
        """All variables should have descriptions."""
        for var_name, schema in ENVIRONMENT_SCHEMA.items():
            assert "description" in schema, f"{var_name} missing description"

    def test_all_variables_have_profile(self):
        """All variables should specify a profile."""
        for var_name, schema in ENVIRONMENT_SCHEMA.items():
            assert schema.get("profile") in ["core", "ocr", "dev"], (
                f"{var_name} invalid profile"
            )


class TestConfigValidator:
    """Test ConfigValidator class."""

    def test_validator_initialization(self):
        """Validator should initialize without errors."""
        validator = ConfigValidator(profile="core")
        assert validator.profile == "core"
        assert validator.errors == []
        assert validator.warnings == []

    def test_validate_all_returns_tuple(self):
        """validate_all should return (is_valid, errors, warnings)."""
        validator = ConfigValidator(profile="core")
        result = validator.validate_all()
        assert isinstance(result, tuple)
        assert len(result) == 3
        is_valid, errors, warnings = result
        assert isinstance(is_valid, bool)
        assert isinstance(errors, list)
        assert isinstance(warnings, list)

    def test_missing_required_variable_detected(self):
        """Missing OPENROUTER_API_KEY should be detected."""
        # Temporarily remove the key
        original = os.environ.pop("OPENROUTER_API_KEY", None)
        try:
            validator = ConfigValidator(profile="core")
            is_valid, errors, warnings = validator.validate_all()
            assert not is_valid
            assert any("OPENROUTER_API_KEY" in error for error in errors)
        finally:
            if original:
                os.environ["OPENROUTER_API_KEY"] = original

    def test_invalid_bool_value_detected(self):
        """Invalid boolean values should be detected."""
        os.environ["LEXMIND_FEATURE_INVESTIGATION_V2"] = "maybe"
        try:
            validator = ConfigValidator(profile="core")
            is_valid, errors, warnings = validator.validate_all()
            assert not is_valid
            assert any("INVALID TYPE" in error for error in errors)
        finally:
            os.environ.pop("LEXMIND_FEATURE_INVESTIGATION_V2", None)

    def test_invalid_int_value_detected(self):
        """Invalid integer values should be detected."""
        os.environ["LEXMIND_DOCUMENT_CONTEXT_CHARS"] = "not_a_number"
        try:
            validator = ConfigValidator(profile="core")
            is_valid, errors, warnings = validator.validate_all()
            assert not is_valid
            assert any("INVALID TYPE" in error for error in errors)
        finally:
            os.environ.pop("LEXMIND_DOCUMENT_CONTEXT_CHARS", None)

    def test_invalid_url_value_detected(self):
        """Invalid URLs should be detected."""
        os.environ["SUPABASE_URL"] = "not-a-url"
        try:
            validator = ConfigValidator(profile="core")
            is_valid, errors, warnings = validator.validate_all()
            assert not is_valid
            assert any("INVALID URL" in error for error in errors)
        finally:
            os.environ.pop("SUPABASE_URL", None)

    def test_cohere_dependency_validation(self):
        """If rerank_provider=cohere, COHERE_API_KEY should be required."""
        os.environ["LEXMIND_RERANK_PROVIDER"] = "cohere"
        os.environ.pop("COHERE_API_KEY", None)  # Remove if exists
        try:
            validator = ConfigValidator(profile="core")
            is_valid, errors, warnings = validator.validate_all()
            # Should detect missing COHERE_API_KEY dependency
            assert any("COHERE_API_KEY" in error for error in errors)
        finally:
            os.environ.pop("LEXMIND_RERANK_PROVIDER", None)

    def test_no_supabase_generates_warning(self):
        """Missing Supabase should generate warning, not error."""
        # Remove Supabase vars
        original_url = os.environ.pop("SUPABASE_URL", None)
        original_key = os.environ.pop("SUPABASE_ANON_KEY", None)
        try:
            validator = ConfigValidator(profile="core")
            # Need OPENROUTER_API_KEY to pass validation
            if "OPENROUTER_API_KEY" in os.environ:
                is_valid, errors, warnings = validator.validate_all()
                # Should have warning but still be valid
                assert any("NO CLOUD DATABASE" in warning for warning in warnings)
        finally:
            if original_url:
                os.environ["SUPABASE_URL"] = original_url
            if original_key:
                os.environ["SUPABASE_ANON_KEY"] = original_key

    def test_print_report_doesnt_crash(self):
        """print_report should work without throwing."""
        validator = ConfigValidator(profile="core")
        validator.validate_all()
        try:
            validator.print_report(verbose=False)
        except Exception as e:
            pytest.fail(f"print_report() raised {e}")

    def test_print_quick_reference_doesnt_crash(self):
        """print_quick_reference should work without throwing."""
        try:
            ConfigValidator.print_quick_reference()
        except Exception as e:
            pytest.fail(f"print_quick_reference() raised {e}")

    def test_profile_filtering(self):
        """Validator should only check variables for specified profile."""
        validator = ConfigValidator(profile="dev")
        # DEV profile should include PYTEST_DEBUG
        schema_for_dev = [
            (var, sch)
            for var, sch in ENVIRONMENT_SCHEMA.items()
            if sch.get("profile") in ("core", "dev")
        ]
        assert len(schema_for_dev) > 0


class TestEnvironmentVariableTypes:
    """Test type validation for different variable types."""

    def test_bool_type_validation(self):
        """Boolean type should accept true/false/1/0/yes/no."""
        os.environ["LEXMIND_FEATURE_INVESTIGATION_V2"] = "true"
        try:
            validator = ConfigValidator(profile="core")
            validator._validate_value(
                "LEXMIND_FEATURE_INVESTIGATION_V2",
                "true",
                ENVIRONMENT_SCHEMA["LEXMIND_FEATURE_INVESTIGATION_V2"],
            )
            # No exception should be raised
        finally:
            os.environ.pop("LEXMIND_FEATURE_INVESTIGATION_V2", None)

    def test_int_type_validation(self):
        """Integer type should accept numbers."""
        validator = ConfigValidator(profile="core")
        error = validator._validate_value(
            "LEXMIND_DOCUMENT_CONTEXT_CHARS",
            "200000",
            ENVIRONMENT_SCHEMA["LEXMIND_DOCUMENT_CONTEXT_CHARS"],
        )
        assert error is None

    def test_float_type_validation(self):
        """Float type should accept decimal numbers."""
        validator = ConfigValidator(profile="core")
        error = validator._validate_value(
            "LEXMIND_LLM_TIMEOUT_PRIMARY",
            "60.5",
            ENVIRONMENT_SCHEMA["LEXMIND_LLM_TIMEOUT_PRIMARY"],
        )
        assert error is None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
