const { sendDiscordNotification } = require('../utils/discord');
const { withRetry } = require('../utils/helpers');

async function botProtectionVerify(page) {
  const botProtection = await page.$('.bot-protection-row');
  if (botProtection) {
    console.log('🔒 CAPTCHA detectado. Aguardando...');
    sendDiscordNotification('🔒 CAPTCHA detectado.');

    await page.waitForSelector('.bot-protection-row a.btn', { timeout: 10000 });
    const btn = await page.$('.bot-protection-row a.btn');

    if (btn) {
      await withRetry(() => btn.click(), 3, 2000, 'Clicar CAPTCHA');
      await withRetry(() =>
        page.waitForFunction(() => {
          const iframe = document.querySelector('iframe[src*="hcaptcha.com"]');
          return !iframe || iframe.offsetParent === null;
        }, { timeout: 120000 }), 1, 0, 'Esperar CAPTCHA'
      );
      console.log('🔓 CAPTCHA resolvido');
    }
  }
}

module.exports = { botProtectionVerify };
