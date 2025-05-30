// Script otimizado com matching de menor distância, cache de aldeias já atacadas e fallback para tropas insuficientes

const fs = require('fs');
const path = require('path');
const randomUseragent = require('random-useragent');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const https = require('https');
puppeteer.use(StealthPlugin());

const NodeCache = require('node-cache');
const attackCache = new NodeCache({ stdTTL: 3600 });

const sleep = ms => new Promise(res => setTimeout(res, ms));
const waitRandom = (min = 800, max = 1500) => sleep(Math.floor(Math.random() * (max - min + 1)) + min);
const randomDelay = (min = 100, max = 300) => Math.floor(Math.random() * (max - min + 1)) + min;

const MAX_ATTACK_DISTANCE = 50;

async function withRetry(fn, retries = 3, delay = 1000, label = 'Operation') {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (err) {
            console.warn(`${label} failed on attempt ${i + 1}/${retries}: ${err.message}`);
            if (i < retries - 1) await sleep(delay);
        }
    }
    throw new Error(`${label} failed after ${retries} attempts`);
}

function sendDiscordNotification(message) {
    const webhookUrl = 'https://discord.com/api/webhooks/1378019502427603015/_JKz_otOBT8AXcfQaZrslraMTPzj0q_THITmgCo9PVIQGALZAkRC7fvQkX4EWrh5tsig';
    const url = new URL(webhookUrl);

    const chunks = [];
    for (let i = 0; i < message.length; i += 1900) {
        chunks.push(message.slice(i, i + 1900));
    }

    chunks.forEach(chunk => {
        const data = JSON.stringify({ content: chunk });
        const options = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };

        const req = https.request(options, res => {
            if (res.statusCode < 200 || res.statusCode >= 300) {
                console.error(`Erro ao enviar Discord webhook: ${res.statusCode}`);
            }
        });

        req.on('error', error => {
            console.error('Erro no webhook Discord:', error);
        });

        req.write(data);
        req.end();
    });

}

const villagePath = path.resolve(__dirname, 'village.txt');
const errorLogPath = path.resolve(__dirname, 'errors.log');

const isVillageFileFresh = (filePath, maxAgeMs = 3600000) => {
    if (!fs.existsSync(filePath)) return false;
    const stats = fs.statSync(filePath);
    const age = Date.now() - stats.mtimeMs;
    return age < maxAgeMs;
};

const logError = (message) => {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(errorLogPath, `[${timestamp}] ${message}\n`);
    sendDiscordNotification(`❌ Erro: ${message}`);
};

const downloadVillageTxt = async (page, outputPath = 'village.txt') => {
    return await page.evaluate(() => {
        return fetch('map/village.txt').then(res => res.text());
    }).then(data => {
        fs.writeFileSync(outputPath, data, 'utf8');
        console.log(`Arquivo village.txt salvo em: ${outputPath}`);
    }).catch(err => {
        console.error('Erro ao baixar village.txt:', err);
        throw err;
    });
};

const parseVillageTxt = (csvData) => {
    const lines = csvData.trim().split('\n');
    return lines.map(line => line.split(','));
};

(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    const attackCountByVillage = {};

    await withRetry(() => page.setUserAgent(randomUseragent.getRandom()), 3, 1000, 'Set user agent');
    await withRetry(() => page.goto('https://www.tribalwars.com.br/', { waitUntil: 'networkidle2' }), 3, 2000, 'Go to login page');

    await waitRandom();
    await withRetry(() => page.type("#user", "gmprestes", { delay: randomDelay() }), 3, 1500, 'Type username');
    await waitRandom();
    await withRetry(() => page.type("#password", "getuliocat#0", { delay: randomDelay() }), 3, 1500, 'Type password');
    await waitRandom();
    await withRetry(() => page.keyboard.press('Enter', { delay: randomDelay() }), 3, 1500, 'Press enter');

    await withRetry(() => page.waitForNavigation({ waitUntil: 'networkidle2' }), 3, 3000, 'Wait for post-login navigation');
    console.log('Login realizado com sucesso!');

    await withRetry(() =>
        page.waitForFunction(() => {
            const iframe = document.querySelector('iframe[src*="hcaptcha.com"]');
            return !iframe || iframe.offsetParent === null;
        }, { timeout: 120000 }),
        1, 0, 'Wait for captcha resolution'
    );
    console.log('Captcha resolvido!');

    await waitRandom();
    await withRetry(() => page.waitForSelector('a[href="/page/play/br135"] > span.world_button_active'), 3, 2000, 'Wait for world 135 link');
    await waitRandom();
    await withRetry(() => page.click('a[href="/page/play/br135"] > span.world_button_active'), 3, 1000, 'Click world 135 link');
    await waitRandom();

    const atk_sender = [16953, 18085, 16916, 17086, 15646, 3481, 15124, 15117, 66896];

    const attackers = [];
    for (const id of atk_sender) {
        await page.goto(`https://br135.tribalwars.com.br/game.php?village=${id}&screen=overview`, { waitUntil: 'networkidle2' });
        const { x, y } = await page.evaluate(() => game_data.village);
        attackers.push({ id, x, y });
    }

    if (!isVillageFileFresh(villagePath)) {
        await downloadVillageTxt(page, villagePath);
    } else {
        console.log('Usando village.txt do cache.');
    }

    const csvData = fs.readFileSync(villagePath, 'utf8');
    const allVillages = parseVillageTxt(csvData);

    const barbarians = allVillages.filter(v => v[4] === '0')
        .map(v => [v[0], v[1], parseInt(v[2]), parseInt(v[3])])
        .filter(v => !attackCache.has(v[0]));

    const assignedBarbs = new Set();
    const usedAttackers = new Set();
    const exhaustedAttackers = new Set();
    const fallbackQueue = [];

    for (const attacker of attackers) {
        const nearbyBarbs = barbarians
            .filter(barb => !assignedBarbs.has(barb[0]))
            .map(barb => {
                const dist = Math.hypot(attacker.x - barb[2], attacker.y - barb[3]);
                return { barb, dist };
            })
            .filter(entry => entry.dist <= MAX_ATTACK_DISTANCE)
            .sort((a, b) => a.dist - b.dist);

        for (const { barb } of nearbyBarbs) {
            if (!assignedBarbs.has(barb[0])) {
                assignedBarbs.add(barb[0]);
                fallbackQueue.push({ attacker, target: barb });
                //break; // apenas um ataque por atacante neste loop inicial
            }
        }
    }

    let lastAttacker = null;
    while (fallbackQueue.length > 0) {
        const { attacker, target } = fallbackQueue.shift();


        if (exhaustedAttackers.has(attacker.id)) continue;

        if (attacker.id !== lastAttacker?.id) {
            await page.goto(`https://br135.tribalwars.com.br/game.php?village=${attacker.id}&screen=overview`, { waitUntil: 'networkidle2' });
        }
        lastAttacker = attacker;

        const page_atk = await browser.newPage();

        const spy = 1;
        const light = 10;
        const url = `https://br135.tribalwars.com.br/game.php?screen=place&target=${target[0]}&spy=${spy}&light=${light}`;
        await page_atk.goto(url, { waitUntil: 'networkidle2' });

        const all_spy = await page_atk.$eval('#unit_input_spy', el => parseInt(el.getAttribute('data-all-count')));
        const all_light = await page_atk.$eval('#unit_input_light', el => parseInt(el.getAttribute('data-all-count')));

        if (all_spy >= spy && all_light >= light) {
            await page_atk.keyboard.press('Enter');
            await page_atk.waitForNavigation({ waitUntil: 'networkidle2' });
            await page_atk.keyboard.press('Enter');
            await page_atk.waitForNavigation({ waitUntil: 'networkidle2' });

            console.log(`✅ Ataque enviado de ${attacker.id} para ${target[2]}|${target[3]} (ID ${target[0]})`);
            //usedAttackers.add(attacker.id);
            attackCache.set(target[0], true);
            attackCountByVillage[attacker.id] = (attackCountByVillage[attacker.id] || 0) + 1;
        } else {
            exhaustedAttackers.add(attacker.id);
            const fallback = attackers.find(a => !usedAttackers.has(a.id) && !exhaustedAttackers.has(a.id) && a.id !== attacker.id);
            if (fallback) {
                console.log(`🔁 Tentando reassociar ${target[2]}|${target[3]} para outro atacante.`);
                fallbackQueue.push({ attacker: fallback, target });
            } else {
                console.log(`❌ Todos os atacantes estão sem tropas. Execução encerrada.`);
                break;
            }
        }

        await page_atk.close();
    }

    const summary = Object.entries(attackCountByVillage).map(([id, count]) => `Aldeia ${id}: ${count} ataque(s)`).join('\n');
    console.log('\n📊 Relatório Final:\n' + summary);
    sendDiscordNotification('📊 Relatório Final:\n' + summary);

    await page.evaluate(() => alert('Script executado com sucesso!'));

})().catch(error => {
    console.error('Erro geral no script:', error);
    logError(`Erro geral: ${error.message}`);
});
