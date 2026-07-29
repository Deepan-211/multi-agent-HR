"""
PayParity — Custom Exception Hierarchy
"""
from typing import Optional


class PayParityException(Exception):
    """Base exception for all PayParity application errors."""
    status_code: int = 500
    code: str = "INTERNAL_ERROR"

    def __init__(self, message: str, code: Optional[str] = None):
        self.message = message
        if code:
            self.code = code
        super().__init__(message)


class NotFoundError(PayParityException):
    status_code = 404
    code = "NOT_FOUND"


class ValidationError(PayParityException):
    status_code = 422
    code = "VALIDATION_ERROR"


class AuthorizationError(PayParityException):
    status_code = 403
    code = "FORBIDDEN"


class PrivacyBudgetExhaustedError(PayParityException):
    """Raised when the differential privacy ε budget is exceeded."""
    status_code = 429
    code = "PRIVACY_BUDGET_EXHAUSTED"


class AnonymizationError(PayParityException):
    """Raised when data fails anonymization checks."""
    status_code = 422
    code = "ANONYMIZATION_REQUIRED"


class HITLGateError(PayParityException):
    """Raised when an action is blocked by the HITL guardrail."""
    status_code = 403
    code = "HITL_GATE_BLOCKED"


class AuditStateError(PayParityException):
    """Raised when an audit operation is invalid given its current state."""
    status_code = 409
    code = "INVALID_AUDIT_STATE"


class AgentExecutionError(PayParityException):
    """Raised when an agent fails during execution."""
    status_code = 500
    code = "AGENT_EXECUTION_ERROR"
