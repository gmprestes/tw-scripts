const path = require('path');

module.exports = {
  MONGO_URI: 'mongodb+srv://admin:JFTTTceSMMPpc2MT@db-dev.erpsige.com.br/tw-gui?retryWrites=true&w=majority',
  DB_NAME: 'tw-gui',
  ATTACKERS_PATH: path.resolve(__dirname, '..', 'attackers.json'),
  VILLAGE_PATH: path.resolve(__dirname, '..', 'village.txt'),
  ERROR_LOG_PATH: path.resolve(__dirname, '..', 'errors.log'),
  DISCORD_WEBHOOK: 'https://discord.com/api/webhooks/1378019502427603015/_JKz_otOBT8AXcfQaZrslraMTPzj0q_THITmgCo9PVIQGALZAkRC7fvQkX4EWrh5tsig',
  MAX_ATTACK_DISTANCE: 40
};
