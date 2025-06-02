const fs = require('fs');
const { ERROR_LOG_PATH } = require('../config/constants');
const { sendDiscordNotification } = require('./discord');

function logError(message) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(ERROR_LOG_PATH, `[${timestamp}] ${message}\n`);
  sendDiscordNotification(`❌ Erro: ${message}`);
}

module.exports = { logError };
