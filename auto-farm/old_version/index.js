// Script Tribal Wars com salvamento no MongoDB Atlas e distribuição por distância ótima

const fs = require('fs');
const path = require('path');
const https = require('https');
const randomUseragent = require('random-useragent');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { MongoClient } = require('mongodb');
const NodeCache = require('node-cache');

puppeteer.use(StealthPlugin());

const mongoUri = 'mongodb+srv://admin:JFTTTceSMMPpc2MT@db-dev.erpsige.com.br/tw-gui?retryWrites=true&w=majority';
const dbName = 'tw-gui';
let db;

const attackCache = new NodeCache({ stdTTL: 3600 });

const MAX_ATTACK_DISTANCE = 30;
const villagePath = path.resolve(__dirname, 'village.txt');
const errorLogPath = path.resolve(__dirname, 'errors.log');

const sleep = ms => new Promise(res => setTimeout(res, ms));
const waitRandom = (min = 800, max = 1500) => sleep(Math.floor(Math.random() * (max - min + 1)) + min);
const randomDelay = (min = 100, max = 300) => Math.floor(Math.random() * (max - min + 1)) + min;

async function connectToMongo() {
    const client = new MongoClient(mongoUri);
    await client.connect();
    db = client.db(dbName);
    console.log('📦 Conectado ao MongoDB Atlas');
}

async function tryWithTimeout(fn, timeoutMs = 5000, descricao = 'Operação') {
    try {
        const resultado = await Promise.race([
            fn(),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('timeout')), timeoutMs)
            )
        ]);
        return resultado;
    } catch (err) {
        console.warn(`${descricao} falhou: ${err.message}`);
        return null;
    }
}

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

const isVillageFileFresh = (filePath, maxAgeMs = 3600000) => {
    if (!fs.existsSync(filePath)) return false;
    const stats = fs.statSync(filePath);
    return Date.now() - stats.mtimeMs < maxAgeMs;
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

function parseSaqueFromHTML(text) {
    const valores = text.match(/\d+/g)?.map(Number) || [];
    const [madeira = 0, barro = 0, ferro = 0, total = 0, capacidade_total = 0] = valores;
    const eficiencia = capacidade_total > 0 ? total / capacidade_total : 0;

    return {
        madeira,
        barro,
        ferro,
        total,
        capacidade_total,
        eficiencia: parseFloat(eficiencia.toFixed(4))
    };
}

function redistributeAttacks({ pendingTargets, attackers, exhaustedAttackers, MAX_ATTACK_DISTANCE }) {
    const reassigned = [];

    for (const target of pendingTargets) {
        let closestAttacker = null;
        let closestDist = Infinity;

        for (const attacker of attackers) {
            if (exhaustedAttackers.has(attacker.id))
                continue;

            const dist = Math.hypot(attacker.x - target[2], attacker.y - target[3]);

            if (dist <= MAX_ATTACK_DISTANCE && dist < closestDist) {
                closestAttacker = attacker;
                closestDist = dist;
            }
        }

        if (closestAttacker) {
            reassigned.push({ attacker: closestAttacker, target, distance: closestDist });
        }
    }

    reassigned.sort((a, b) => a.distance - b.distance);
    return reassigned;
}

const botProtectionVerify = async (page) => {
    // Verifica se o CAPTCHA está presente
    const botProtection = await page.$('.bot-protection-row');
    if (botProtection) {
        console.log('🔒 Proteção contra bots detectada. Aguardando resolução do CAPTCHA...');
        sendDiscordNotification('🔒 Proteção contra bots detectada. Aguardando resolução do CAPTCHA...');

        // Aguarda o botão dentro da célula com a classe .bot-protection-row
        await page.waitForSelector('.bot-protection-row a.btn', { timeout: 10000 });

        const btn = await page.$('.bot-protection-row a.btn');

        if (btn) {
            await withRetry(() => btn.click(), 3, 2000, 'Click bot protection button');

            await withRetry(() =>
                page.waitForFunction(() => {
                    const iframe = document.querySelector('iframe[src*="hcaptcha.com"]');
                    return !iframe || iframe.offsetParent === null;
                }, { timeout: 120000 }), 1, 0, 'Wait for captcha resolution'
            );

            console.log('🔓 CAPTCHA resolvido com sucesso!');

        }
    }
}
(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await connectToMongo();



    const attackCountByVillage = {};

    //await withRetry(() => page.setUserAgent(randomUseragent.getRandom()), 3, 1000, 'Set user agent');
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

    await botProtectionVerify(page);

    const atk_sender = [18085, 16953, 16916, 17086, 15646, 3481, 15124, 15117, 66896];


    const attackers = [];
    for (const id of atk_sender) {
        await page.goto(`https://br135.tribalwars.com.br/game.php?village=${id}&screen=overview`, { waitUntil: 'networkidle2' });
        await botProtectionVerify(page);
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

    const assignments = [];

    for (const barb of barbarians) {
        let closestAttacker = null;
        let closestDist = Infinity;
        for (const attacker of attackers) {
            const dist = Math.hypot(attacker.x - barb[2], attacker.y - barb[3]);
            if (dist <= MAX_ATTACK_DISTANCE && dist < closestDist) {
                closestAttacker = attacker;
                closestDist = dist;
            }
        }
        if (closestAttacker) {
            assignments.push({ attacker: closestAttacker, target: barb, distance: closestDist });
        }
    }

    assignments.sort((a, b) => a.distance - b.distance);

    let fallbackQueue = [...assignments];
    const exhaustedAttackers = new Set();
    let lastAttacker = null;

    console.log(`🔍 Encontrados ${fallbackQueue.length} alvos disponíveis para ataque.`);

    let page_atk;
    while (fallbackQueue.length > 0) {

        const { attacker, target, distance } = fallbackQueue.shift();
        try {
            if (exhaustedAttackers.has(attacker.id))
                continue;

            if (attacker.id !== lastAttacker?.id) {
                await withRetry(() => page.goto(`https://br135.tribalwars.com.br/game.php?village=${attacker.id}&screen=overview`, { waitUntil: 'networkidle2' }), 3, 1500, 'Go to attacker overview');
                await botProtectionVerify(page);
            }

            lastAttacker = attacker;
            if (!page_atk)
                page_atk = await browser.newPage();

            const spy = 1;
            const light = 10;

            const url = `https://br135.tribalwars.com.br/game.php?screen=place&target=${target[0]}&spy=${spy}&light=${light}`;
            await withRetry(() => page_atk.goto(url, { waitUntil: 'networkidle2' }), 3, 1500, 'Go to attacker overview');
            await botProtectionVerify(page_atk);

            //await waitRandom();
            const all_spy = await page_atk.$eval('#unit_input_spy', el => parseInt(el.getAttribute('data-all-count')));
            const all_light = await page_atk.$eval('#unit_input_light', el => parseInt(el.getAttribute('data-all-count')));

            if (all_spy >= spy && all_light >= light) {
                await withRetry(() => page_atk.waitForSelector('#target_attack'), 3, 2000, 'Wait for attack button');
                await withRetry(() => page_atk.click('#target_attack'), 3, 2000, 'Click attack button');

                //await waitRandom();
                //await withRetry(() => page_atk.keyboard.press('Enter'), 3, 1500, 'Press Enter to send attack');

                await withRetry(() => page_atk.waitForNavigation({ waitUntil: 'networkidle2' }), 3, 2000, 'Wait for attack confirmation page');
                await botProtectionVerify(page_atk);
                // await waitRandom();

                await withRetry(() => page_atk.waitForSelector('#troop_confirm_submit'), 3, 2000, 'Wait for confirm attack button');
                await withRetry(() => page_atk.click('#troop_confirm_submit'), 3, 2000, 'Click confirm attack button');

                //await withRetry(() => page_atk.keyboard.press('Enter'), 3, 1500, 'Confirm attack');
                await withRetry(() => page_atk.waitForNavigation({ waitUntil: 'networkidle2', timeout: 5000 }), 3, 2000, 'Wait for attack result page');
                //await waitRandom();
                console.log(`✅ Ataque enviado de ${attacker.id} para ${target[2]}|${target[3]} (ID ${target[0]}) | Distância: ${distance.toFixed(2)}`);

                await db.collection('ataques').insertOne({
                    atacante_id: attacker.id,
                    atacante_coord: { x: attacker.x, y: attacker.y },
                    alvo_id: target[0],
                    alvo_coord: { x: target[2], y: target[3] },
                    horario_envio: new Date(),
                    tropas: { spy, light },
                    status: 'enviado'
                });

                attackCache.set(target[0], true);
                attackCountByVillage[attacker.id] = (attackCountByVillage[attacker.id] || 0) + 1;
            } else {
                exhaustedAttackers.add(attacker.id);
                console.log(`⚠️ Atacante ${attacker.id} está exausto.`);



                const attackersAvailable = attackers.filter(a => !exhaustedAttackers.has(a.id));
                if (attackersAvailable.length === 0) {
                    console.log(`❌ Todos os atacantes estão sem tropas. Fim da execução.`);
                    break;
                }

                const remainingTargets = fallbackQueue
                    .filter(task => task.attacker.id === attacker.id)
                    .map(task => task.target);

                // Filtra a fila para manter apenas ataques de outros atacantes
                fallbackQueue = fallbackQueue.filter(task => task.attacker.id !== attacker.id);



                console.log(`🔁 Redistribuindo ${remainingTargets.length} alvos restantes...`);

                const redistributed = redistributeAttacks({
                    pendingTargets: remainingTargets,
                    attackers,
                    exhaustedAttackers,
                    MAX_ATTACK_DISTANCE
                });

                if (redistributed.length > 0) {
                    console.log(`🔄 Redistribuição concluída: ${redistributed.length} ataques redistribuídos.`);
                    fallbackQueue.push(...redistributed);
                    fallbackQueue.sort((a, b) => a.distance - b.distance);
                } else {
                    console.log(`❌ Nenhum alvo pôde ser redistribuído.`);
                    //break;
                }
            }

            //await page_atk.close();
            //await withRetry(page_atk.close(), 3, 1000, 'Close attack page');
           // await waitRandom();
        }
        catch (err) {
            console.error(`❌ Erro ao processar ataque para ${target[2]}|${target[3]}: ${err.message}`);
            logError(`Erro ao processar ataque para ${target[2]}|${target[3]}: ${err.message}`);
            fallbackQueue.push({ attacker: attacker, target: target, distance: distance });

            await tryWithTimeout(() => page_atk.close(), 5000, 'Close attack page on error');
            console.log('Reiniciando página de ataque...');
            page_atk = await browser.newPage();
           // await waitRandom();
            continue;
        }
    }

    const summary = Object.entries(attackCountByVillage).map(([id, count]) => `Aldeia ${id}: ${count} ataque(s)`).join('\n');
    console.log('\n📊 Relatório Final:\n' + summary);
    sendDiscordNotification('📊 Relatório Final:\n' + summary);


    await page.evaluate(() => alert('Script executado com sucesso!'));

    await waitRandom();
    await waitRandom();

    // Acesso à página de retornos
    await page.goto('https://br135.tribalwars.com.br/game.php?village=18085&screen=overview_villages&mode=commands&type=return', {
        waitUntil: 'networkidle2'
    });

    await botProtectionVerify(page);

    console.log('⏳ Extraindo comandos com data-id...');
    const commandIds = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('span.quickedit'))
            .map(el => el.getAttribute('data-id'))
        //.filter(Boolean);
    });

    await waitRandom();

    let atualizados = 0;
let cmdPage;
    for (const id of commandIds) {

        const cmdUrl = `https://br135.tribalwars.com.br/game.php?village=18085&screen=info_command&id=${id}&type=own`;
        if(!cmdPage) {
            cmdPage = await browser.newPage();
        }

        try {
            await cmdPage.goto(cmdUrl, { waitUntil: 'networkidle2' });
            await botProtectionVerify(page);
            const resultado = await cmdPage.evaluate(() => {
                const coordText = Array.from(document.querySelectorAll('table.vis td'))
                    .map(td => td.innerText)
                    .find(text => /\(\d+\|\d+\)/.test(text));

                const coordMatch = coordText?.match(/\((\d+)\|(\d+)\)/);
                const x = coordMatch ? parseInt(coordMatch[1]) : null;
                const y = coordMatch ? parseInt(coordMatch[2]) : null;

                let saqueText = '';
                const tds = Array.from(document.querySelectorAll('table.vis td'));
                for (let i = 0; i < tds.length; i++) {
                    if (tds[i].innerText.trim() === 'Saque:' && tds[i + 1]) {
                        saqueText = tds[i + 1].innerText;
                        break;
                    }
                }

                return { x, y, saqueText };
            });

            console.log(`🔍 Processando comando ${id} - Coordenadas: (${resultado.x}|${resultado.y})`);
            console.log('Resultado do comando:', resultado);

            

            if (!resultado) {
                console.warn(`⚠️ Resultado vazio para o comando ${id}`);
                continue;
            }
            if (!resultado?.x || !resultado?.y || !resultado?.saqueText) {
                console.warn(`⚠️ Dados incompletos no comando ${id}`);
                continue;
            }



            const saque = parseSaqueFromHTML(resultado.saqueText);

            console.log(`Saque extraído: ${JSON.stringify(saque)}`);


            const updateResult = await db.collection('ataques').updateOne(
                {
                    'alvo_coord.x': resultado.x,
                    'alvo_coord.y': resultado.y,
                    status: { $ne: 'completo' }
                },
                {
                    $set: {
                        status: 'completo',
                        saque,
                        atualizado_em: new Date()
                    }
                }
            );

            if (updateResult.modifiedCount > 0) {
                console.log(`✅ (${resultado.x}|${resultado.y}) - Total: ${saque.total} / Capacidade: ${saque.capacidade_total} → Eficiência: ${(saque.eficiencia * 100).toFixed(1)}%`);
                atualizados++;
            }

        } catch (err) {
            console.warn(`❌ Erro ao processar comando ${id}: ${err.message}`);
            await tryWithTimeout(cmdPage.close(),5000, 'Close command page on error');
            logError(`Erro ao processar comando ${id}: ${err.message}`);
        }
    }

    console.log(`\n🎯 ${atualizados} ataques atualizados com saque e eficiência.`);

})().catch(error => {
    console.error('Erro geral no script:', error);
    logError(`Erro geral: ${error.message}`);
});
