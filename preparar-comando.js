(function () {
    const CORRECAO_MS = 300;
    const seletorDoBotao = 'input[type="submit"]';

    let baseHoraServidor = null;
    let basePerformance = null;
    let intervaloEstimador = null;

    function pad(num, length) {
        return String(num).padStart(length, '0');
    }

    function parseHoraInputs(h, m, s, ms) {
        const d = new Date();
        d.setHours(Number(h), Number(m), Number(s), Number(ms) || 0);
        return d;
    }

    function getHoraEstimada() {
        const elapsed = performance.now() - basePerformance;
        return new Date(baseHoraServidor.getTime() + elapsed);
    }

    function monitorarRelativeTime(callback) {
        let textoAnterior = $('.relative_time').text();
        const observer = setInterval(() => {
            const textoAtual = $('.relative_time').text();
            if (textoAtual !== textoAnterior) {
                textoAnterior = textoAtual;
                const match = textoAtual.match(/\d{2}:\d{2}:\d{2}/);
                if (match) {
                    const [h, m, s] = match[0].split(':').map(Number);
                    baseHoraServidor = new Date();
                    baseHoraServidor.setHours(h, m, s, 0);
                    baseHoraServidor = new Date(baseHoraServidor.getTime() - CORRECAO_MS);
                    basePerformance = performance.now();
                    clearInterval(observer);
                    callback();
                }
            }
        }, 30);
    }

    function validarEntradas() {
        const campos = [
            { id: 'horaH', max: 23, digits: 2 },
            { id: 'horaM', max: 59, digits: 2 },
            { id: 'horaS', max: 59, digits: 2 },
            { id: 'horaMS', max: 999, digits: 3 },
            { id: 'delayMs', max: 2000, digits: 4 },
        ];

        for (let campo of campos) {
            const input = document.getElementById(campo.id);
            const val = input.value.trim();

            if (!/^\d+$/.test(val)) {
                alert(`O campo ${campo.id} deve conter apenas números.`);
                return false;
            }

            const num = parseInt(val, 10);
            if (num > campo.max) {
                alert(`O campo ${campo.id} deve ser no máximo ${campo.max}.`);
                return false;
            }

            input.value = pad(num, campo.digits);
        }

        return true;
    }

    function agendarCliqueComInputs() {
        if (!validarEntradas()) return;

        const h = document.getElementById('horaH').value;
        const m = document.getElementById('horaM').value;
        const s = document.getElementById('horaS').value;
        const ms = document.getElementById('horaMS').value;
        const delay = parseInt(document.getElementById('delayMs').value) || 700;

        ['horaH', 'horaM', 'horaS', 'horaMS', 'delayMs'].forEach(id => {
            document.getElementById(id).disabled = true;
        });
        document.getElementById('btnAtacar').style.display = 'none';

        const horaAlvo = parseHoraInputs(h, m, s, ms);
        const horaDisparo = new Date(horaAlvo.getTime() - delay);

        document.getElementById('logArea').innerText =
            `⏱️ Agendado para ${horaAlvo.toLocaleTimeString("pt-BR", { hour12: false })}.${pad(horaAlvo.getMilliseconds(), 3)} (delay ${delay}ms)`;

        intervaloEstimador = setInterval(() => {
            const estimada = getHoraEstimada();
            const restante = horaDisparo - estimada;

            if (restante <= 0) {
                clearInterval(intervaloEstimador);
                const btn = document.querySelector(seletorDoBotao);
                const agora = new Date();

                if (btn) {
                    btn.click();
                    document.getElementById('logArea').innerText =
                        `✅ Clique feito às ${agora.toLocaleTimeString("pt-BR", { hour12: false })}.${pad(agora.getMilliseconds(), 3)}`;
                } else {
                    document.getElementById('logArea').innerText = "❌ Botão não encontrado.";
                }

                return;
            }

            const seg = Math.floor(restante / 1000);
            const mseg = restante % 1000;
            document.getElementById('logArea').innerText = `⏳ Ataque em ${seg}s e ${mseg}ms`;
        }, 100);
    }

    function abrirPainelConfiguracao() {
        const html = `
            <div class="ra-flex ra-mb10">
                <div class="ra-flex-4">
                    <label>Delay (ms)</label>
                    <input type="number" id="delayMs" class="ra-form-control" value="700" min="0" max="2000">
                </div>
            </div>
            <div class="ra-flex ra-mb10">
                <div class="ra-flex-4">
                    <label>Hora</label>
                    <input type="number" id="horaH" class="ra-form-control" placeholder="HH" min="0" max="23">
                </div>
                <div class="ra-flex-4">
                    <label>Minuto</label>
                    <input type="number" id="horaM" class="ra-form-control" placeholder="MM" min="0" max="59">
                </div>
                <div class="ra-flex-4">
                    <label>Segundo</label>
                    <input type="number" id="horaS" class="ra-form-control" placeholder="SS" min="0" max="59">
                </div>
                <div class="ra-flex-4">
                    <label>Milissegundos</label>
                    <input type="number" id="horaMS" class="ra-form-control" placeholder="ms" min="0" max="999">
                </div>
            </div>
            <a href="javascript:void(0);" id="btnAtacar" onClick="startAutoClick();" class="btn btn-confirm-yes">Agendar Ataque</a>
            <div id="logArea" class="ra-mt10" style="margin-top:10px; font-size: 12px;"></div>
        `;

        const popupContent = preparePopupContent(html);
        Dialog.show('Agendamento de Ataque', popupContent);
    }

    function preparePopupContent(content) {
        return `
            <style>
                .popup_box_content { overflow-x: hidden; }
                .ra-form-control { width: 100%; padding: 4px; box-sizing: border-box; font-size: 12px; }
                .ra-flex { display: flex; gap: 6px; flex-wrap: wrap; }
                .ra-flex-4 { flex: 1 1 22%; min-width: 70px; }
                .btn { margin-top: 10px; padding: 5px 8px; display: inline-block; text-align: center; background: #c1a264; color: #000; font-weight: bold; }
                label { font-size: 12px; display: block; margin-bottom: 4px; }
            </style>
            <div style="min-width: 500px; max-width: 540px;">${content}</div>
        `;
    }

    window.startAutoClick = () => {
        monitorarRelativeTime(agendarCliqueComInputs);
    };

    abrirPainelConfiguracao();
})();
