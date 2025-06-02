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
    console.log('Link do Mundo 135 encontrado!');
    await waitRandom();

    await withRetry(() => page.click('a[href="/page/play/br135"] > span.world_button_active'), 3, 1000, 'Click world 135 link');
    await waitRandom();

    let atk_sender_index = 0;
    const atk_sender = [16953, 18085, 16916, 17086, 15646, 3481, 15124, 15117, 66896];

    await withRetry(() =>
        page.goto(`https://br135.tribalwars.com.br/game.php?village=${atk_sender[atk_sender_index]}&screen=overview`, { waitUntil: 'networkidle2' }),
        3, 2000, 'Go to overview of first village'
    );

    const barbariansWithDistance = await withRetry(() => page.evaluate(() => {
        return new Promise((resolve, reject) => {
            function findBarbarianVillages(villages) {
                return villages.filter(v => v[4] === '0');
            }
            function CSVToArray(strData, strDelimiter) {
                strDelimiter = strDelimiter || ',';
                var objPattern = new RegExp('(\\' + strDelimiter + '|\\r?\\n|\\r|^)' +
                    '(?:"([^"]*(?:""[^"]*)*)"|' + '([^"\\' + strDelimiter + '\\r\\n]*))', 'gi');
                var arrData = [[]];
                var arrMatches = null;
                while ((arrMatches = objPattern.exec(strData))) {
                    var strMatchedDelimiter = arrMatches[1];
                    if (strMatchedDelimiter.length && strMatchedDelimiter !== strDelimiter) {
                        arrData.push([]);
                    }
                    var strMatchedValue = arrMatches[2]
                        ? arrMatches[2].replace(new RegExp('""', 'g'), '"')
                        : arrMatches[3];
                    arrData[arrData.length - 1].push(strMatchedValue);
                }
                return arrData;
            }
            function calcDistanceFromCurrentVillage(village) {
                const x1 = game_data.village.x;
                const y1 = game_data.village.y;
                const x2 = village[2];
                const y2 = village[3];
                return Math.round(Math.hypot(x1 - x2, y1 - y2));
            }
            function filterBarbs(barbarians) {
                const minPoints = 26;
                const maxPoints = 250;
                const radius = 40;
                return barbarians
                    .filter(b => b[5] >= minPoints && b[5] <= maxPoints)
                    .filter(b => calcDistanceFromCurrentVillage(b) <= radius);
            }

            $.get('map/village.txt', function (data) {
                const villages = CSVToArray(data);
                const barbarians = findBarbarianVillages(villages);
                const filtered = filterBarbs(barbarians);
                const result = filtered.map(barb => [...barb, calcDistanceFromCurrentVillage(barb)]);
                result.sort((a, b) => a[7] - b[7]);
                resolve(result);
            }).fail(reject);
        });
    }), 3, 3000, 'Get barbarian villages');

    for (const [index, barb] of barbariansWithDistance.entries()) {
        const page_atk = await browser.newPage();
        const spy = 1;
        const light = 10;

        const url = `https://br135.tribalwars.com.br/game.php?screen=place&target=${barb[0]}&spy=${spy}&light=${light}`;
        await withRetry(() => page_atk.goto(url, { waitUntil: 'networkidle2' }), 3, 2000, 'Goto attack screen');

        await waitRandom();

        await withRetry(() => page_atk.waitForSelector('#unit_input_spy', { timeout: 10000 }), 3, 1500, 'Wait for spy selector');
        const all_spy = await page_atk.$eval('#unit_input_spy', el => el.getAttribute('data-all-count'));

        await withRetry(() => page_atk.waitForSelector('#unit_input_light', { timeout: 10000 }), 3, 1500, 'Wait for light selector');
        const all_light = await page_atk.$eval('#unit_input_light', el => el.getAttribute('data-all-count'));

        if (all_spy < spy || all_light < light) {
            console.log(`Ataque ${index + 1} não realizado: tropas insuficientes para atacar a aldeia ${barb[2]}|${barb[3]} (${barb[0]} | dist ${barb[7]})`);
            await page_atk.close();

            atk_sender_index++;
            if (atk_sender_index < atk_sender.length) {
                await withRetry(() =>
                    page.goto(`https://br135.tribalwars.com.br/game.php?village=${atk_sender[atk_sender_index]}&screen=overview`, { waitUntil: 'networkidle2' }),
                    3, 2000, `Go to next attacker village index ${atk_sender_index}`
                );
            } else {
                console.log('Todos os atacantes foram utilizados.');
                break;
            }
            continue;
        }

        await withRetry(() => page_atk.keyboard.press('Enter', { delay: randomDelay() }), 3, 5000, 'Confirm first attack step');
        await withRetry(() => page_atk.waitForNavigation({ waitUntil: 'networkidle2' }), 3, 2000, 'Wait for confirm page');
        await waitRandom();

        await withRetry(() => page_atk.keyboard.press('Enter', { delay: randomDelay() }), 3, 5000, 'Send final attack');
        await withRetry(() => page_atk.waitForNavigation({ waitUntil: 'networkidle2' }), 3, 2000, 'Wait for attack result');
        await waitRandom();

        await page_atk.close();

        console.log(`Ataque ${index + 1} iniciado para atacar a aldeia ${barb[2]}|${barb[3]} (${barb[0]} | dist ${barb[7]})`);
    }

    await page.evaluate(() => {
        alert('Script executado com sucesso!');
    });

})().catch(error => {
    console.error('Error:', error);
});
