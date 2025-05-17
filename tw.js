(async function () {
    // === CONFIGURAÇÃO ===
    const scriptConfig = {
        scriptData: {
            prefix: 'barbsAttackPrep',
            name: 'Ataque Bárbaras',
            version: '1.0',
            author: 'RedAlert + ChatGPT',
            authorUrl: 'https://twscripts.dev/',
            helpLink: 'https://twscripts.dev/',
        },
        translations: {
            pt_BR: {
                'Prepare Attacks': 'Preparar Ataques',
                'Units to Send': 'Unidades para Enviar',
                'Filter': 'Filtrar',
                'Attack Links': 'Links de Ataque',
                'Raio:': 'Raio:',
                'Min Points:': 'Pontos Mínimos:',
                'Max Points:': 'Pontos Máximos:',
                'Coordinates Found:': 'Coordenadas Encontradas:',
                'Help': 'Ajuda',
            },
        },
        allowedMarkets: [],
        allowedScreens: [],
        allowedModes: [],
        isDebug: false,
        enableCountApi: true,
    };

    // Carrega SDK
    await $.getScript('https://twscripts.dev/scripts/twSDK.js');
    await twSDK.init(scriptConfig);
    const { villages } = await twSDK.worldDataAPI('village');

    // Interface
    function buildUI() {
        const unitsForm = twSDK.buildUnitsPicker([], ['militia'], 'number');

        const content = `
            <div class="ra-grid ra-grid-4">
                <div class="ra-mb15">
                    <label class="ra-label">${twSDK.tt('Raio:')}</label>
                    <input type="number" id="raRadius" value="20" class="ra-input">
                </div>
                <div class="ra-mb15">
                    <label class="ra-label">${twSDK.tt('Min Points:')}</label>
                    <input type="number" id="raMinPoints" value="26" class="ra-input">
                </div>
                <div class="ra-mb15">
                    <label class="ra-label">${twSDK.tt('Max Points:')}</label>
                    <input type="number" id="raMaxPoints" value="12154" class="ra-input">
                </div>
                <div class="ra-mb15">
                    <label class="ra-label">${twSDK.tt('Coordinates Found:')}</label>
                    <span id="raCoordsCount">0</span>
                </div>
            </div>
            <div class="ra-mb15">
                <label class="ra-label">${twSDK.tt('Units to Send')}</label>
                ${unitsForm}
            </div>
            <div class="ra-mb15">
                <a href="#" id="btnGenerateAttacks" class="btn btn-confirm-yes">${twSDK.tt('Filter')}</a>
            </div>
            <div class="ra-mb15">
                <label class="ra-label">${twSDK.tt('Attack Links')}</label>
                <div id="attackLinksList" class="ra-grid ra-grid-2"></div>
            </div>
        `;

        twSDK.renderBoxWidget(content, scriptConfig.scriptData.prefix, 'ra-barbs-attack-prep', '');
    }

    // Funções auxiliares
    function getSelectedUnits() {
        const inputs = document.querySelectorAll('input.ra-unit-selector');
        const units = {};
        inputs.forEach((input) => {
            if (parseInt(input.value) > 0) {
                units[input.value] = parseInt(input.value);
            }
        });
        return units;
    }

    function encodeUnits(units) {
        return Object.entries(units)
            .map(([unit, qty]) => `unit_${unit}=${qty}`)
            .join('&');
    }

    function prepareAttackLinks(coordsList, units) {
        const baseUrl = window.location.origin + game_data.link_base_pure;
        const unitParams = encodeUnits(units);
        return coordsList.map((coord) => {
            const [x, y] = coord.split('|');
            const url = `${baseUrl}screen=place&x=${x}&y=${y}&${unitParams}`;
            return `<a href="${url}" target="_blank" class="btn btn-confirm">${coord}</a>`;
        }).join(' ');
    }

    function filterBarbs() {
        const radius = parseInt(document.getElementById('raRadius').value);
        const minPoints = parseInt(document.getElementById('raMinPoints').value);
        const maxPoints = parseInt(document.getElementById('raMaxPoints').value);
        const current = game_data.village.coord;

        const barbCoords = villages
            .filter((v) => parseInt(v[4]) === 0) // bárbaras
            .filter((v) => {
                const pts = parseInt(v[5]);
                return pts >= minPoints && pts <= maxPoints;
            })
            .filter((v) => {
                const coord = `${v[2]}|${v[3]}`;
                return twSDK.calculateDistance(current, coord) <= radius;
            })
            .map((v) => `${v[2]}|${v[3]}`);

        document.getElementById('raCoordsCount').innerText = barbCoords.length;

        const units = getSelectedUnits();
        const html = prepareAttackLinks(barbCoords, units);
        document.getElementById('attackLinksList').innerHTML = html;
    }

    // Executa
    buildUI();
    document.getElementById('btnGenerateAttacks').addEventListener('click', (e) => {
        e.preventDefault();
        filterBarbs();
    });
})();
