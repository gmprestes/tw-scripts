const { withRetry, randomDelay, waitRandom } = require('../utils/helpers');

const doLogin = async (page) => {
    await withRetry(() => page.goto('https://www.tribalwars.com.br/', { waitUntil: 'networkidle2' }), 3, 2000, 'Go to login page');
    await withRetry(() => page.type("#user", "gmprestes", { delay: randomDelay() }), 3, 1500, 'Type username');
    await withRetry(() => page.type("#password", "getuliocat#0", { delay: randomDelay() }), 3, 1500, 'Type password');
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
    await withRetry(() => page.click('a[href="/page/play/br135"] > span.world_button_active'), 3, 1000, 'Click world 135 link');
}

module.exports = { doLogin };