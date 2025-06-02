const https = require('https');
const { DISCORD_WEBHOOK } = require('../config/constants');

function sendDiscordNotification(message) {
    const url = new URL(DISCORD_WEBHOOK);
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

module.exports = { sendDiscordNotification };
