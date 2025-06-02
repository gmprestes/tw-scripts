
const { botProtectionVerify } = require('../handlers/botProtection');
const { withRetry } = require('../utils/helpers');
const { MAX_ATTACK_DISTANCE } = require('../config/constants');
const { isAttackersFileFresh, getAttackersFile, saveAttackersFile } = require('../extractors/attackers');
const NodeCache = require('node-cache');



async function getAttackers(page, atk_sender) {
    let attackers = [];

    if (isAttackersFileFresh()) {
        console.log('📂 Arquivo de atacantes já está atualizado, usando o cache.');
        attackers = getAttackersFile();
    }
    else {


        for (const id of atk_sender) {
            await page.goto(`https://br135.tribalwars.com.br/game.php?village=${id}&screen=overview`, { waitUntil: 'networkidle2' });
            await botProtectionVerify(page);
            const { x, y } = await page.evaluate(() => game_data.village);
            attackers.push({ id, x, y });
        }

        saveAttackersFile(attackers);
        console.log('📥 Arquivo de atacantes atualizado.');
    }

    return attackers;
}

function getBestAttackers(barbarians = [], attackers = [], exhaustedAttackers = new Set()) {

    let assignments = [];

    for (const barb of barbarians) {
        let closestAttacker = null;
        let closestDist = Infinity;
        for (const attacker of attackers) {

            if (exhaustedAttackers.has(attacker.id))
                continue;

            const dist = Math.hypot(attacker.x - barb[2], attacker.y - barb[3]);

            if (dist <= MAX_ATTACK_DISTANCE && dist < closestDist) {
                closestAttacker = attacker;
                closestDist = dist;
            }
        }
        if (closestAttacker) {
            assignments.push({ attacker: closestAttacker, target: barb, distance: Number(closestDist.toFixed(0)) });
        }
    }

    console.log(`🔍 Encontrados ${assignments.length} atacantes disponíveis para ${barbarians.length} alvos.`);

    return sortAttackers(assignments);
}

function sortAttackers(assignments = []) {
    return assignments.sort((a, b) => {
        if (a.distance !== b.distance) {
            return a.distance - b.distance;
        }
         return a.attacker.id - b.attacker.id;
    });
}

async function doAttack(page_atk, target, config) {
    try {
        const url = `https://br135.tribalwars.com.br/game.php?screen=place&target=${target[0]}&spy=${config.spy}&light=${config.light}`;
        await withRetry(() => page_atk.goto(url, { waitUntil: 'networkidle2' }), 3, 1500, 'Go to attacker overview');
        await botProtectionVerify(page_atk);

        //await waitRandom();
        const all_spy = await page_atk.$eval('#unit_input_spy', el => parseInt(el.getAttribute('data-all-count')));
        const all_light = await page_atk.$eval('#unit_input_light', el => parseInt(el.getAttribute('data-all-count')));

        if (all_spy >= config.spy && all_light >= config.light) {
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

            return 'success';
        }
        else
            return 'no_troops';
    }
    catch (err) {
        return 'error';
    }

}


module.exports = { doAttack, getAttackers, getBestAttackers, sortAttackers };