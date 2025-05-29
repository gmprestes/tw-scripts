const randomUseragent = require('random-useragent');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth')

puppeteer.use(StealthPlugin())
// Or import puppeteer from 'puppeteer-core';

const sleep = ms => new Promise(res => setTimeout(res, ms));

// Função para esperar um tempo aleatório entre min e max milissegundos
const waitRandom = (min = 800, max = 2000) =>
    sleep(Math.floor(Math.random() * (max - min + 1)) + min);

// Delay entre teclas (digitação humana)
const randomDelay = (min = 100, max = 300) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

(async () => {

    // Launch the browser and open a new blank page
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    // Set user agent.
    await page.setUserAgent(randomUseragent.getRandom());

    // Import random user agent library
    // Set screen size.
    await page.setViewport({ width: 1366, height: 768 });



    // Navigate the page to a URL.
    await page.goto('https://www.tribalwars.com.br/',
        {
            waitUntil: 'networkidle2'
        }
    );

    await waitRandom();
    await page.type("#user", "gmprestes", { delay: randomDelay() });
    await waitRandom();
    await page.type("#password", "getuliocat#0", { delay: randomDelay() });
    await waitRandom();
    await page.keyboard.press('Enter', { delay: randomDelay() });

    await page.goto('https://br135.tribalwars.com.br/game.php?screen=overview_villages&intro');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    //await browser.close();

}
)().catch(error => {
    console.error('Error:', error);
});
