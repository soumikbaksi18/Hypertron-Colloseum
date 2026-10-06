import { HttpException, HttpStatus } from '@nestjs/common';

export interface HypertronErrorBody {
  type: string;
  code: string;
  message: string;
  param?: string;
}

export class HypertronException extends HttpException {
  constructor(
    status: HttpStatus,
    readonly error: HypertronErrorBody,
  ) {
    super({ error }, status);
  }
}

export class InvalidRequestException extends HypertronException {
  constructor(code: string, message: string, param?: string) {
    super(HttpStatus.BAD_REQUEST, {
      type: 'invalid_request_error',
      code,
      message,
      param,
    });
  }
}

export class AuthenticationException extends HypertronException {
  constructor(
    message = 'Invalid API key.',
    code = 'invalid_api_key',
  ) {
    super(HttpStatus.UNAUTHORIZED, {
      type: 'authentication_error',
      code,
      message,
    });
  }
}

export class ResourceNotFoundException extends HypertronException {
  constructor(message: string) {
    super(HttpStatus.NOT_FOUND, {
      type: 'invalid_request_error',
      code: 'resource_missing',
      message,
    });
  }
}

/// Raised when the caller asks for a lifecycle transition the intent cannot make.
export class StateTransitionException extends HypertronException {
  constructor(message: string) {
    super(HttpStatus.CONFLICT, {
      type: 'invalid_request_error',
      code: 'invalid_state_transition',
      message,
    });
  }
}

export class IdempotencyConflictException extends HypertronException {
  constructor(code: string, message: string) {
    super(HttpStatus.CONFLICT, {
      type: 'idempotency_error',
      code,
      message,
    });
  }
}
