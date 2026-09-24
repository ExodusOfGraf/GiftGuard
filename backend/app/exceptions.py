class DomainError(Exception):
    """Base error mapped to a safe client response."""


class NotFoundError(DomainError):
    pass


class AuthorizationError(DomainError):
    pass


class InvalidTransition(DomainError):
    pass


class DrawError(DomainError):
    pass


class TelegramCheckUnavailable(DomainError):
    pass
