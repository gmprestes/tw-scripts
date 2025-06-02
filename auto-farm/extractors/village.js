const fs = require('fs');
const { VILLAGE_PATH } = require('../config/constants');

async function downloadVillageTxt(page, outputPath = VILLAGE_PATH) {
  const data = await page.evaluate(() => fetch('map/village.txt').then(res => res.text()));
  fs.writeFileSync(outputPath, data, 'utf8');
  console.log(`Arquivo salvo em: ${outputPath}`);
}

function parseVillageTxt(csvData) {
  const lines = csvData.trim().split('\n');
  return lines.map(line => line.split(','));
}

const isVillageFileFresh = (filePath = VILLAGE_PATH, maxAgeMs = 3600000) => {
    if (!fs.existsSync(filePath)) return false;
    const stats = fs.statSync(filePath);
    return Date.now() - stats.mtimeMs < maxAgeMs;
};

const getVillegeData = (filePath = VILLAGE_PATH) => {
  return fs.readFileSync(filePath, 'utf8');
}

module.exports = { downloadVillageTxt, parseVillageTxt, isVillageFileFresh, getVillegeData };
