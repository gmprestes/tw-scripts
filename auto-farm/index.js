const { connectToMongo, getDb } = require('./services/mongo');
const { setupBrowser } = require('./services/puppeteer');
const { doAttack, sortAttackers, getBestAttackers, getAttackers } = require('./services/attack');
const { doLogin } = require('./services/login');

const { downloadVillageTxt, parseVillageTxt, isVillageFileFresh, getVillegeData } = require('./extractors/village');
const { withRetry } = require('./utils/helpers');
const { sendDiscordNotification } = require('./utils/discord');
const { botProtectionVerify } = require('./handlers/botProtection');
const { logError } = require('./utils/logger');

const NodeCache = require('node-cache');


const attackCache = new NodeCache({ stdTTL: 3600 });
const atk_sender = [18085, 16953, 16916, 17086, 15646, 3481, 15124, 15117, 66896];
const attackCountByVillage = {};
const config_attack = {
    spy: 1,
    light: 10
};



(async () => {
    try {

        const exhaustedAttackers = new Set();

        await connectToMongo();
        const { browser, page } = await setupBrowser();
        await doLogin(page);

        if (!isVillageFileFresh()) {
            console.log('📥 Baixando arquivo de aldeias...');
            await downloadVillageTxt(page);
        }
        else
            console.log('📂 Arquivo de aldeias já está atualizado, usando o cache.');

        const csvData = getVillegeData();
        const allVillages = parseVillageTxt(csvData);
        const barbarians = allVillages.filter(v => v[4] === '0')
            .map(v => [v[0], v[1], parseInt(v[2]), parseInt(v[3])])
            .filter(v => !attackCache.has(v[0]));

        const attackers = await getAttackers(page, atk_sender);

        let assignments = await getBestAttackers(barbarians, attackers, exhaustedAttackers);

            console.log(`🔍 Encontrados ${assignments.length} atacantes`);



        let fallbackQueue = [...assignments];
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

                console.log(`🚀 Enviando ataque de ${attacker.id} para ${target[2]}|${target[3]} (distância: ${distance})`);
                let status = await doAttack(page_atk, target, config_attack)
                if (status === 'success') {
                    await getDb().collection('ataques').insertOne({
                        atacante_id: attacker.id,
                        atacante_coord: { x: attacker.x, y: attacker.y },
                        alvo_id: target[0],
                        alvo_coord: { x: target[2], y: target[3] },
                        horario_envio: new Date(),
                        tropas: { spy: config_attack.spy, light: config_attack.light },
                        status: 'enviado'
                    });
                    console.log(`✅ Ataque enviado com sucesso para ${target[2]}|${target[3]}`);

                    attackCountByVillage[attacker.id] = (attackCountByVillage[attacker.id] || 0) + 1;
                } else if (status === 'no_troops') {
                    exhaustedAttackers.add(attacker.id);
                    console.log(`⚠️ Atacante ${attacker.id} está sem tropas disponiveis.`);

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

                    const redistributed = getBestAttackers(remainingTargets, attackers, exhaustedAttackers);

                    if (redistributed.length > 0) {
                        console.log(`🔄 Redistribuição concluída: ${redistributed.length} ataques redistribuídos.`);
                        fallbackQueue.push(...redistributed);
                        fallbackQueue = sortAttackers(fallbackQueue);
                    } else {
                        console.log(`❌ Nenhum alvo pôde ser redistribuído.`);
                        //break;
                    }
                }
                else {
                    console.error(`❌ Erro ao processar ataque para ${target[2]}|${target[3]}: ${err.message}`);
                    logError(`Erro ao processar ataque para ${target[2]}|${target[3]}: ${err.message}`);
                    fallbackQueue.push({ attacker: attacker, target: target, distance: distance });

                    //await tryWithTimeout(() => page_atk.close(), 5000, 'Close attack page on error');

                }
            }
            catch (error) {
                console.error('Error on main loop:', error);
                logError(`Erro ao processar ataque: ${error}`);
                break; // Para evitar loop infinito em caso de erro

            }
        }

        const summary = Object.entries(attackCountByVillage).map(([id, count]) => `Aldeia ${id}: ${count} ataque(s)`).join('\n');
        console.log('\n📊 Relatório Final:\n' + summary);
        sendDiscordNotification('📊 Relatório Final:\n' + summary);


        await page.evaluate(() => alert('Script executado com sucesso!'));


    } catch (error) {
        console.error('Erro na execução principal:', error);
    }
})();
