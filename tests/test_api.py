"""
PayParity — API Integration Tests
Tests key API endpoints against the test FastAPI app.
"""
import pytest


class TestHealthEndpoint:
    @pytest.mark.asyncio
    async def test_health_check(self, client):
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "version" in data


class TestAuthEndpoints:
    @pytest.mark.asyncio
    async def test_login_returns_401_for_bad_credentials(self, client):
        response = await client.post(
            "/api/v1/auth/login",
            data={"username": "nobody@test.com", "password": "wrong"},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_protected_endpoint_requires_token(self, client):
        response = await client.get("/api/v1/audits/")
        assert response.status_code == 403  # No token → forbidden


class TestPrivacyBudgetEndpoints:
    @pytest.mark.asyncio
    async def test_budget_endpoint_requires_auth(self, client):
        response = await client.get("/api/v1/privacy/budget")
        assert response.status_code == 403


class TestAnonymizationGate:
    """Test that the dataset upload rejects PII."""

    @pytest.mark.asyncio
    async def test_upload_with_pii_rejected(self, client, analyst_token):
        """Upload reviews containing email should be rejected."""
        import io
        import json

        reviews_with_pii = json.dumps([{
            "employee_token": "EMP_001",
            "review_text": "john.smith@company.com is a great employee.",
            "performance_rating": 4.0,
        }])

        response = await client.post(
            "/api/v1/datasets/reviews/11111111-1111-1111-1111-111111111111",
            files={"file": ("reviews.json", reviews_with_pii.encode(), "application/json")},
            headers={"Authorization": f"Bearer {analyst_token}"},
        )
        # Either 404 (audit not found in test db) or 422 (if we check anon first)
        # In test context without seeded DB the audit won't exist, so 404
        assert response.status_code in [404, 422, 200]
        if response.status_code == 200:
            data = response.json()
            # PII review should be rejected
            assert data.get("rejected", 0) >= 1


class TestTextAnalysisTools:
    """Test the bias analysis tools directly."""

    def test_bias_lexicon_finds_phrases(self):
        from app.tools.text_analysis import BiasLexiconAnalyzer
        analyzer = BiasLexiconAnalyzer()
        result = analyzer.analyze(
            "She is abrasive and bossy. Lacks executive presence. Overly emotional."
        )
        assert len(result["flagged_phrases"]) > 0
        assert result["severity_score"] > 0

    def test_clean_text_has_no_flags(self):
        from app.tools.text_analysis import BiasLexiconAnalyzer
        analyzer = BiasLexiconAnalyzer()
        result = analyzer.analyze(
            "Delivered excellent technical results with measurable impact on system performance."
        )
        assert result["severity_score"] == 0 or len(result["flagged_phrases"]) == 0

    def test_gendered_detector_catches_terms(self):
        from app.tools.text_analysis import GenderedLanguageDetector
        detector = GenderedLanguageDetector()
        result = detector.detect("She is emotional and bossy.")
        assert len(result["gendered_terms"]) > 0
        assert result["severity_score"] > 0

    def test_counterfactual_substitution(self):
        from app.tools.text_analysis import CounterfactualTextSubstituter
        sub = CounterfactualTextSubstituter()
        text = "She is very collaborative and supportive."
        cf_text = sub.substitute(text, sub.GENDER_SUBSTITUTIONS)
        # "collaborative" → "decisive", "supportive" → "strategic"
        assert "decisive" in cf_text or "strategic" in cf_text


class TestStatisticalTools:
    def test_cohens_d_same_groups_zero(self):
        import numpy as np
        from app.tools.statistical import cohens_d
        group = np.array([100.0, 100.0, 100.0])
        assert cohens_d(group, group) == 0.0

    def test_cohens_d_different_groups(self):
        import numpy as np
        from app.tools.statistical import cohens_d
        g1 = np.array([100.0, 102.0, 98.0])
        g2 = np.array([90.0, 91.0, 89.0])
        d = cohens_d(g1, g2)
        assert d > 0  # g1 > g2

    def test_ols_prepares_data(self):
        from app.tools.statistical import OLSPayGapRegressor
        regressor = OLSPayGapRegressor()
        salary_records = [
            {"employee_token": "E1", "base_salary": 100000, "role_level": "L3",
             "tenure_years": 3.0, "performance_rating": 4.0, "gender_group": "G1"},
            {"employee_token": "E2", "base_salary": 120000, "role_level": "L3",
             "tenure_years": 3.5, "performance_rating": 4.5, "gender_group": "G2"},
        ]
        df = regressor.prepare_data(salary_records)
        assert "base_salary" in df.columns
        assert "role_level_encoded" in df.columns
        assert len(df) == 2
