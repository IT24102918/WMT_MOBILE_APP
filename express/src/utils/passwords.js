const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

function looksHashed(value = '') {
  return /^\$2[aby]\$\d{2}\$/.test(`${value}`);
}

async function hashPassword(value) {
  return bcrypt.hash(`${value}`, SALT_ROUNDS);
}

async function verifyPassword(plainPassword, storedPassword) {
  if (!storedPassword) return false;

  if (looksHashed(storedPassword)) {
    return bcrypt.compare(`${plainPassword}`, storedPassword);
  }

  return `${storedPassword}` === `${plainPassword}`;
}

module.exports = {
  hashPassword,
  looksHashed,
  verifyPassword,
};
