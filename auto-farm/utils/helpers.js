const sleep = ms => new Promise(res => setTimeout(res, ms));
const waitRandom = (min = 800, max = 1500) => sleep(Math.floor(Math.random() * (max - min + 1)) + min);
const randomDelay = (min = 100, max = 300) => Math.floor(Math.random() * (max - min + 1)) + min;
const { MAX_ATTACK_DISTANCE } = require('../config/constants');

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



module.exports = { sleep, waitRandom,  randomDelay, withRetry, tryWithTimeout,  parseSaqueFromHTML };
