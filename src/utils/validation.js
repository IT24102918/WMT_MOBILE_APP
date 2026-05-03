const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^0\d{9}$/;

function isBlank(value) {
  return value == null || `${value}`.trim() === '';
}

function ensureRequired(body, fields) {
  const errors = [];
  fields.forEach((field) => {
    if (isBlank(body[field])) errors.push(`${field} is required`);
  });
  return errors;
}

function validateEmail(value) {
  return EMAIL_REGEX.test(`${value}`.trim());
}

function validatePhone(value) {
  return PHONE_REGEX.test(`${value}`.trim());
}

function parsePositiveNumber(value, fieldName, { allowZero = false } = {}) {
  const number = Number(value);
  if (Number.isNaN(number)) {
    return { error: `${fieldName} must be a valid number` };
  }
  if (allowZero ? number < 0 : number <= 0) {
    return { error: `${fieldName} must be ${allowZero ? 'zero or a positive' : 'a positive'} number` };
  }
  return { value: number };
}

function parseDateValue(value, fieldName = 'date') {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { error: `${fieldName} must be a valid date` };
  }
  return { value: date };
}

function normalizeDateOnly(value, fieldName = 'date') {
  const parsed = parseDateValue(value, fieldName);
  if (parsed.error) return parsed;
  parsed.value.setHours(0, 0, 0, 0);
  return parsed;
}

function isMongoIdLike(value) {
  return typeof value === 'string' && /^[a-fA-F0-9]{24}$/.test(value);
}

module.exports = {
  ensureRequired,
  isBlank,
  isMongoIdLike,
  normalizeDateOnly,
  parseDateValue,
  parsePositiveNumber,
  validateEmail,
  validatePhone,
};
