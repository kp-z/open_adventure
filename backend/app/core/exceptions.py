"""Custom exceptions for the application."""


class ClaudeManagerException(Exception):
    """Base exception for Claude Manager."""

    def __init__(self, message: str, details: dict = None):
        self.message = message
        self.details = details or {}
        super().__init__(self.message)


class DatabaseException(ClaudeManagerException):
    """Database operation failed."""

    pass


class AdapterException(ClaudeManagerException):
    """Adapter operation failed."""

    pass


class ClaudeNotFoundException(AdapterException):
    """Claude CLI or configuration not found."""

    pass


class ClaudeExecutionException(AdapterException):
    """Claude execution failed."""

    pass


class ValidationException(ClaudeManagerException):
    """Validation failed."""

    pass


class WorkflowException(ClaudeManagerException):
    """Workflow operation failed."""

    pass


class WorkflowValidationException(WorkflowException):
    """Workflow validation failed (e.g., cycle detected)."""

    pass


class ExecutionException(ClaudeManagerException):
    """Execution operation failed."""

    pass


class NotFoundException(ClaudeManagerException):
    """Resource not found."""

    pass


class ConflictException(ClaudeManagerException):
    """Resource conflict (e.g., duplicate name)."""

    pass
