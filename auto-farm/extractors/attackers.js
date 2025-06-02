const fs = require('fs');
const { ATTACKERS_PATH } = require('../config/constants');

function getAttackersFile(filePath = ATTACKERS_PATH,) {
   return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

const isAttackersFileFresh = (filePath = ATTACKERS_PATH, maxAgeMs = 3600000) => {
  if (!fs.existsSync(filePath)) return false;
  const stats = fs.statSync(filePath);
  return Date.now() - stats.mtimeMs < maxAgeMs;
};

function saveAttackersFile(data) {
  // const dir = path.dirname(CACHE_FILE);
  // if (!fs.existsSync(dir)) 
  //   fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(ATTACKERS_PATH, JSON.stringify(data), 'utf-8');
}

module.exports = { saveAttackersFile, getAttackersFile, isAttackersFileFresh };
