const fs = require('fs');
const path = require('path');
const randomUseragent = require('random-useragent');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const sleep = ms => new Promise(res => setTimeout(res, ms));
const waitRandom = (min = 800, max = 1500) => sleep(Math.floor(Math.random() * (max - min + 1)) + min);
const randomDelay = (min = 100, max = 300) => Math.floor(Math.random() * (max - min + 1)) + min;

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

const findBarbarians = (villages, gameX, gameY) => {
    const findBarbarianVillages = (villages) => villages.filter(v => v[4] === '0');
    const calcDistance = (village) => {
        const [x2, y2] = [parseInt(village[2]), parseInt(village[3])];
        return Math.round(Math.hypot(gameX - x2, gameY - y2));
    };
    const barbarians = findBarbarianVillages(villages).map(v => {
        const dist = calcDistance(v);
        return [...v, dist];
    });
    return barbarians
        .filter(v => v[5] >= 26 && v[5] <= 250 && v[7] <= 40)
        .sort((a, b) => a[7] - b[7]);
};

(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    await withRetry(() => page.setUserAgent(randomUseragent.getRandom()), 3, 1000, 'Set user agent');

    await withRetry(() =>
        page.goto('https://www.tribalwars.com.br/', { waitUntil: 'networkidle2' }),
        3, 2000, 'Go to login page'
    );

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
    let atk_sender_index = 0;

    await withRetry(() =>
        page.goto(`https://br135.tribalwars.com.br/game.php?village=${atk_sender[atk_sender_index]}&screen=overview`, { waitUntil: 'networkidle2' }),
        3, 2000, 'Go to overview of first village'
    );

    if (!isVillageFileFresh(villagePath)) {
        await downloadVillageTxt(page, villagePath);
    } else {
        console.log('Usando village.txt do cache.');
    }

    const csvData = fs.readFileSync(villagePath, 'utf8');
    const allVillages = parseVillageTxt(csvData);
    const { x: gameX, y: gameY } = await page.evaluate(() => game_data.village);
    const barbariansWithDistance = findBarbarians(allVillages, gameX, gameY);

    for (const [index, barb] of barbariansWithDistance.entries()) {
        try {
            const page_atk = await browser.newPage();
            const spy = 1;
            const light = 10;

            const url = `https://br135.tribalwars.com.br/game.php?screen=place&target=${barb[0]}&spy=${spy}&light=${light}`;
            await withRetry(() => page_atk.goto(url, { waitUntil: 'networkidle2' }), 3, 2000, `Goto attack screen for ${barb[0]}`);
            await waitRandom();

            await withRetry(() => page_atk.waitForSelector('#unit_input_spy', { timeout: 10000 }), 3, 1500, 'Wait for spy selector');
            const all_spy = await page_atk.$eval('#unit_input_spy', el => parseInt(el.getAttribute('data-all-count')));

            await withRetry(() => page_atk.waitForSelector('#unit_input_light', { timeout: 10000 }), 3, 1500, 'Wait for light selector');
            const all_light = await page_atk.$eval('#unit_input_light', el => parseInt(el.getAttribute('data-all-count')));

            if (all_spy < spy || all_light < light) {
                console.log(`⚠️ Ataque ${index + 1} não realizado: tropas insuficientes para ${barb[2]}|${barb[3]} (${barb[0]} | dist ${barb[7]})`);
                await page_atk.close();

                atk_sender_index++;
                if (atk_sender_index < atk_sender.length) {
                    await withRetry(() =>
                        page.goto(`https://br135.tribalwars.com.br/game.php?village=${atk_sender[atk_sender_index]}&screen=overview`, { waitUntil: 'networkidle2' }),
                        3, 2000, `Go to attacker ${atk_sender_index}`
                    );
                } else {
                    console.log('✅ Todos os atacantes foram utilizados.');
                    break;
                }
                continue;
            }

            await withRetry(() => page_atk.keyboard.press('Enter', { delay: randomDelay() }), 3, 1500, 'Confirm attack');
            await withRetry(() => page_atk.waitForNavigation({ waitUntil: 'networkidle2', timmeout: 15000 }), 3, 2000, 'Wait attack confirm');
            await waitRandom();
            await withRetry(() => page_atk.keyboard.press('Enter', { delay: randomDelay() }), 3, 1500, 'Send final attack');
            await withRetry(() => page_atk.waitForNavigation({ waitUntil: 'networkidle2',timeout: 15000 }), 3, 2000, 'Wait attack sent');

            await page_atk.close();
            console.log(`✅ Ataque ${index + 1} enviado para ${barb[2]}|${barb[3]} (${barb[0]} | dist ${barb[7]})`);

        } catch (err) {
            const errorMsg = `Erro ataque ${index + 1} (${barb[2]}|${barb[3]} ID: ${barb[0]}): ${err.message}`;
            console.error(`❌ ${errorMsg}`);
            logError(errorMsg);
            continue;
        }
    }

    await page.evaluate(() => alert('Script executado com sucesso!'));

})().catch(error => {
    console.error('Erro geral no script:', error);
    logError(`Erro geral: ${error.message}`);
});
