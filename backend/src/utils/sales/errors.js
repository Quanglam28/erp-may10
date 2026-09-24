'use strict';

/**
 * Module error hierarchy.
 *
 * The contract's response envelope (§9.3) and Core's `errorHandler`
 * (backend/src/middlewares/errorHandler.js) read `err.statusCode` and
 * `err.errorCode`, so every module error exposes both. `details` carries
 * field-level validation messages (`[{ field, message }]`) and is only rendered
 * by Core's error handler when NODE_ENV=development.
 */

class AppError extends Error {
  constructor(statusCode, errorCode, message, details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

class BadRequestError extends AppError {
  constructor(message = 'Yêu cầu không hợp lệ.', details = null) {
    super(400, 'BAD_REQUEST', message, details);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Yêu cầu xác thực. Token bị thiếu, hết hạn hoặc không hợp lệ.') {
    super(401, 'AUTH_UNAUTHORIZED', message);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Bạn không có quyền thực hiện thao tác này.') {
    super(403, 'AUTH_FORBIDDEN', message);
  }
}

class NotFoundError extends AppError {
  constructor(errorCode = 'NOT_FOUND', message = 'Không tìm thấy dữ liệu yêu cầu.') {
    super(404, errorCode, message);
  }
}

class ConflictError extends AppError {
  constructor(
    errorCode = 'DATABASE_CONFLICT',
    message = 'Thao tác xung đột với dữ liệu hiện có hoặc bị tranh chấp đồng thời.',
    details = null
  ) {
    super(409, errorCode, message, details);
  }
}

class ValidationError extends AppError {
  constructor(message = 'Dữ liệu đầu vào không hợp lệ.', details = null) {
    super(422, 'VALIDATION_ERROR', message, details);
  }
}

class InvalidCredentialsError extends AppError {
  constructor(message = 'Email hoặc mật khẩu không đúng.') {
    super(401, 'AUTH_INVALID_CREDENTIALS', message);
  }
}

class AccountInactiveError extends AppError {
  constructor(message = 'Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.') {
    super(403, 'AUTH_ACCOUNT_INACTIVE', message);
  }
}

module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  InvalidCredentialsError,
  AccountInactiveError,
};
