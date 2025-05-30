/*
 * Script Name: Barbs Finder
 * Version: v1.4.0
 * Last Updated: 2021-03-16
 * Author: RedAlert
 * Author URL: https://twscripts.ga/
 * Author Contact: RedAlert#9859 (Discord)
 * Approved: t13981993
 * Approved Date: 2020-05-27
 * Mod: JawJaw
 */

var scriptData = {
	name: 'Barbs Finder',
	version: 'v1.4.0',
	author: 'RedAlert',
	authorUrl: 'https://twscripts.ga/',
	helpLink: 'https://forum.tribalwars.net/index.php?threads/barb-finder-with-filtering.285289/',
};

// Configurable defaults
var defaultSpy = 1;
var defaultLight = 10;

// User Input
if (typeof DEBUG !== 'boolean') DEBUG = false;

// CONSTANTS
var VILLAGE_TIME = 'mapVillageTime'; // localStorage key name
var VILLAGES_LIST = 'mapVillagesList'; // localStorage key name
var TIME_INTERVAL = 60 * 60 * 1000; // fetch data every hour

// Globals
var villages = [];
var barbarians = [];

// Translations
var translations = {
	en_DK: {
		'Barbs Finder': 'Barbs Finder',
		'Min Points:': 'Min Points:',
		'Max Points:': 'Max Points:',
		'Radius:': 'Radius:',
		'Barbs found:': 'Barbs found:',
		'Coordinates:': 'Coordinates:',
		'Error while fetching "village.txt"!': 'Error while fetching "village.txt"!',
		Coords: 'Coords',
		Points: 'Points',
		'Dist.': 'Dist.',
		Attack: 'Attack',
		Filter: 'Filter',
		Reset: 'Reset',
		'No barbarian villages found!': 'No barbarian villages found!',
		'Current Village:': 'Current Village:',
		'Sequential Scout Script:': 'Sequential Scout Script:',
		Help: 'Help',
	},
	en_US: {
		'Barbs Finder': 'Barbs Finder',
		'Min Points:': 'Min Points:',
		'Max Points:': 'Max Points:',
		'Radius:': 'Radius:',
		'Barbs found:': 'Barbs found:',
		'Coordinates:': 'Coordinates:',
		'Error while fetching "village.txt"!': 'Error while fetching "village.txt"!',
		Coords: 'Coords',
		Points: 'Points',
		'Dist.': 'Dist.',
		Attack: 'Attack',
		Filter: 'Filter',
		Reset: 'Reset',
		'No barbarian villages found!': 'No barbarian villages found!',
		'Current Village:': 'Current Village:',
		'Sequential Scout Script:': 'Sequential Scout Script:',
		Help: 'Help',
	},
	sk_SK: {
		'Barbs Finder': 'HÄ¾adaÄ barbariek',
		'Min Points:': 'Min bodov:',
		'Max Points:': 'Max bodov:',
		'Radius:': 'VzdialenosÅ¥:',
		'Barbs found:': 'NÃ¡jdenÃ© barbarky:',
		'Coordinates:': 'SÃºradnice:',
		'Error while fetching "village.txt"!': 'Chyba pri naÄÃ­tanÃ­ "village.txt"!',
		Coords: 'SÃºradnice',
		Points: 'Body',
		'Dist.': 'Vzdial.',
		Attack: 'Ãštok',
		Filter: 'Filter',
		Reset: 'Reset',
		'No barbarian villages found!': 'Neboli nÃ¡jdenÃ© Å¾iadne dediny barbarov!',
		'Current Village:': 'SÃºÄasnÃ¡ dedina:',
		'Sequential Scout Script:': 'Sequential Scout Script:',
		Help: 'Pomoc',
	},
	fr_FR: {
		'Barbs Finder': 'Recherche de Barbares',
		'Min Points:': 'Points Min.:',
		'Max Points:': 'Points Max.:',
		'Radius:': 'Radius:',
		'Barbs found:': 'Barbs found:',
		'Coordinates:': 'Coordinates:',
		'Error while fetching "village.txt"!': 'Error while fetching "village.txt"!',
		Coords: 'Coords',
		Points: 'Points',
		'Dist.': 'Dist.',
		Attack: 'Attaquer',
		Filter: 'Filtrer',
		Reset: 'RÃ©initialiser',
		'No barbarian villages found!': 'No barbarian villages found!',
		'Current Village:': 'Village Actuel:',
		'Sequential Scout Script:': 'Sequential Scout Script:',
		Help: 'Help',
	},
	pt_PT: {
		'Barbs Finder': 'Procurador de BÃ¡rbaras',
		'Min Points:': 'Pontos mÃ­nimos:',
		'Max Points:': 'Pontos mÃ¡ximos:',
		'Radius:': 'Raio:',
		'Barbs found:': 'BÃ¡rbaras encontradas:',
		'Coordinates:': 'Coordenadas:',
		'Error while fetching "village.txt"!': 'Erro ao procurar "village.txt"!',
		Coords: 'Coords',
		Points: 'Pontos',
		'Dist.': 'Dist.',
		Attack: 'Attack',
		Filter: 'Filtro',
		Reset: 'Reset',
		'No barbarian villages found!': 'NÃ£o foram encontradas bÃ¡rbaras!',
		'Current Village:': 'Aldeia Atual:',
		'Sequential Scout Script:': 'Sequential Scout Script:',
		Help: 'Ajuda',
	},
	pt_BR: {
		'Barbs Finder': 'Buscador de aldeias bárbaras',
		'Min Points:': 'Pontos mínimos:',
		'Max Points:': 'Pontos máximos:',
		'Radius:': 'Campo:',
		'Barbs found:': 'Bárbaras encontradas:',
		'Coordinates:': 'Coordenadas:',
		'Error while fetching "village.txt"!': 'Erro ao procurar "village.txt"!',
		Coords: 'Coords',
		Points: 'Pontos',
		'Dist.': 'Dist.',
		Attack: 'Attack',
		Filter: 'Filtro',
		Reset: 'Reset',
		'No barbarian villages found!': 'Não foram encontradas aldeias bárbaras!',
		'Current Village:': 'Aldeia Atual:',
		'Sequential Scout Script:': 'Coordenadas para uso em script:',
		Help: 'Ajuda',
	},
	hr_HR: {
		'Barbs Finder': 'Barbari Koordinati',
		'Min Points:': 'Minimalno Poena:',
		'Max Points:': 'Maksimalno Poena:',
		'Radius:': 'Radius:',
		'Barbs found:': 'Barbara pronaÄ‘eno:',
		'Coordinates:': 'Koordinati:',
		'Error while fetching "village.txt"!': 'GreÅ¡ka u dohvaÄ‡anju podataka "village.txt"!',
		Coords: 'Koordinati',
		Points: 'Poeni',
		'Dist.': 'Distanca.',
		Attack: 'Napad',
		Filter: 'Filter',
		Reset: 'Reset',
		'No barbarian villages found!': 'Nisu pronaÄ‘ena barbarska sela!',
		'Current Village:': 'Trenutno Selo:',
		'Sequential Scout Script:': 'Sekvencijalna izviÄ‘aÄka skripta:',
		Help: 'PomoÄ‡',
	},
	pl_PL: {
		'Barbs Finder': 'Znajdz wioski opuszczone',
		'Min Points:': 'Minimalna iloÅ›Ä‡ punktÃ³w:',
		'Max Points:': 'Maksymalna iloÅ›Ä‡ punktÃ³w:',
		'Radius:': 'PromieÅ„:',
		'Barbs found:': 'Znaleziono wiosek:',
		'Coordinates:': 'Kordynaty:',
		'Error while fetching "village.txt"!': 'BÅ‚Ä…d podczas wyszukiwania plikuâ€ž village.txt â€!',
		Coords: 'Koordy',
		Points: 'Punkty',
		'Dist.': 'OdlegÅ‚oÅ›Ä‡',
		Attack: 'Atak',
		Filter: 'ZnajdÅº',
		Reset: 'Reset',
		'No barbarian villages found!': 'Nie znaleziono wiosek barbarzyÅ„skich',
		'Current Village:': 'Obecna wioska:',
		'Sequential Scout Script:': 'Sequential Scout Script:',
		Help: 'Pomoc',
	},
	sv_SE: {
		'Barbs Finder': 'Hitta Barbarby',
		'Min Points:': 'Min PoÃ¤ng:',
		'Max Points:': 'Max PoÃ¤ng:',
		'Radius:': 'Radius:',
		'Barbs found:': 'Barbarby hittade:',
		'Coordinates:': 'Koordinater:',
		'Error while fetching "village.txt"!': 'Fel vid hÃ¤mtning av "village.txtâ€!',
		Coords: 'Kords',
		Points: 'PoÃ¤ng',
		'Dist.': 'AvstÃ¥nd',
		Attack: 'Attackera',
		Filter: 'Filter',
		Reset: 'Ã…terstÃ¤ll',
		'No barbarian villages found!': 'Inga barbarbyar hittade!',
		'Current Village:': 'Nuvarande by:',
		'Sequential Scout Script:': 'Sequential Scout Script:',
		Help: 'HjÃ¤lp',
	},
};

// Init Debug
initDebug();

// Init Translations Notice
initTranslationsNotice();

// Auto-update localStorage villages list
if (localStorage.getItem(TIME_INTERVAL) != null) {
	var mapVillageTime = parseInt(localStorage.getItem(VILLAGE_TIME));
	if (Date.parse(new Date()) >= mapVillageTime + TIME_INTERVAL) {
		// hour has passed, refetch village.txt
		fetchVillagesData();
	} else {
		// hour has not passed, work with village list from localStorage
		var data = localStorage.getItem(VILLAGES_LIST);
		villages = CSVToArray(data);
		init();
	}
} else {
	// Fetch village.txt
	fetchVillagesData();
}

// Fetch 'village.txt' file
function fetchVillagesData() {
	$.get('map/village.txt', function (data) {
		villages = CSVToArray(data);
		localStorage.setItem(VILLAGE_TIME, Date.parse(new Date()));
		localStorage.setItem(VILLAGES_LIST, data);
	})
		.done(function () {
			init();
		})
		.fail(function (error) {
			console.error(`${scriptInfo()} Error:`, error);
			UI.ErrorMessage(`${tt('Error while fetching "village.txt"!')}`, 4000);
		});
}

// Initialize Script
function init() {
	// Filter out only Barbarian villages
	findBarbarianVillages();
	// Show popup
	var content = `
		<div class="ra-mb15">
			<strong>${tt('Current Village:')}</strong>
			<a href="/game.php?screen=info_village&id=${game_data.village.id}" target="_blank" rel="noopener noreferrer">
				${game_data.village.name}
			</a>
		</div>
		<div class="ra-flex ra-mb10">
			<div class="ra-flex-4">
				<label for="minPoints" class="ra-fw600"">${tt('Min Points:')}</label>
				<input type="text" id="minPoints" class="ra-form-control" value="26">
			</div>
			<div class="ra-flex-4">
				<label for="maxPoints" class="ra-fw600"">${tt('Max Points:')}</label>
				<input type="text" id="maxPoints" class="ra-form-control" value="12154">
			</div>
			<div class="ra-flex-4">
				<label for="radius" class="ra-fw600">${tt('Radius:')}</label>
				<select id="radius_choser" class="ra-form-control">
					<option value="10">10</option>
					<option value="20">20</option>
					<option value="30">30</option>
					<option value="40">40</option>
					<option value="50" selected>50</option>
					<option value="60">60</option>
					<option value="70">70</option>
					<option value="80">80</option>
					<option value="90">90</option>
					<option value="100">100</option>
					<option value="110">110</option>
					<option value="120">120</option>
					<option value="130">130</option>
					<option value="140">140</option>
					<option value="150">150</option>
				</select>
			</div>
		</div>
		<div class="ra-flex ra-mb10">
      <div class="ra-flex-6">
        <label for="spyCount" class="ra-fw600">Spy count:</label>
        <input type="number" id="spyCount" class="ra-form-control" value="${defaultSpy}">
      </div>
      <div class="ra-flex-6">
        <label for="lightCount" class="ra-fw600">Light cavalry count:</label>
        <input type="number" id="lightCount" class="ra-form-control" value="${defaultLight}">
      </div>
    </div>
		<a href="javascript:void(0);" onClick="filterBarbs();" class="btn btn-confirm-yes">
			${tt('Filter')}
		</a>
		<a href="javascript:void(0);" onClick="resetFilters();" class="btn btn-confirm-no">
			${tt('Reset')}
		</a>
		<p class="ra-fs12">
			<strong>${tt('Barbs found:')}</strong>
			<span id="barbsCount">0</span>
		</p>
		<div class="ra-mb10">
			<label class="ra-fw600" for="barbCoordsList">${tt('Coordinates:')}</label>
			<textarea id="barbCoordsList" class="ra-textarea" readonly></textarea>
        </div>
        <div class="ra-mb10">
			<label class="ra-fw600" for="barbScoutScript">${tt('Sequential Scout Script:')}</label>
			<textarea id="barbScoutScript" class="ra-textarea" readonly></textarea>
		</div>
		<div id="barbariansTable" style="display:none;max-height:240px;overflow-y:auto;margin-bottom:8px;"></div>
		<div id="noBarbariansFound" style="display:none;">
			<p><strong>${tt('No barbarian villages found!')}</strong>
		</div>
	`;

	const popupContent = preparePopupContent(content);
	Dialog.show('content', popupContent);
}

// Populate villages list
function findBarbarianVillages() {
	villages.forEach((village) => {
		if (village[4] == '0') {
			barbarians.push(village);
		}
	});
}

// Filter Barbarians
function filterBarbs() {
	var minPoints = parseInt($('#minPoints').val().trim());
	var maxPoints = parseInt($('#maxPoints').val().trim());
	var radius = parseInt($('#radius_choser').val());

	if (DEBUG) {
		console.debug(`${scriptInfo()} Minimum Points:`, minPoints);
		console.debug(`${scriptInfo()} Maximum Points:`, maxPoints);
	}

	// Filter by min and max points
	const filteredBarbs = barbarians.filter((barbarian) => {
		return barbarian[5] >= minPoints && barbarian[5] <= maxPoints;
	});

	// Filter by radius
	const filteredByRadiusBarbs = filteredBarbs.filter((barbarian) => {
		var distance = calcDistanceFromCurrentVillage(barbarian);
		if (distance <= radius) {
			return barbarian;
		}
	});

	updateUI(filteredByRadiusBarbs);
}

// Reset Filters
function resetFilters() {
	$('#minPoints').val(26);
	$('#maxPoints').val(12154);
	$('#radius_choser').val('20');
	$('#barbsCount').text('0');
	$('#barbCoordsList').text('');
	$('#barbScoutScript').val('');
	$('#barbariansTable').hide();
	$('#barbariansTable').html('');
}

// Update UI
function updateUI(barbs) {
	if (barbs.length > 0) {
		var barbariansCoordsArray = getVillageCoord(barbs);
		var barbariansCount = barbariansCoordsArray.length;

		var barbariansCoordsList = barbariansCoordsArray.join(' ');

		var scoutScript = generateScoutScript(barbariansCoordsList);

		var tableContent = generateBarbariansTable(barbs);

		$('#barbsCount').text(barbariansCount);
		$('#barbCoordsList').text(barbariansCoordsList);
		$('#barbScoutScript').val(scoutScript);
		$('#barbariansTable').show();
		$('#barbariansTable').html(tableContent);
	} else {
		resetFilters();
		$('#noBarbariansFound').fadeIn(200);
		setTimeout(function () {
			$('#noBarbariansFound').fadeOut(200);
		}, 4000);
	}
}

// Generate Table
function generateBarbariansTable(barbs) {
	if (barbs.length < 1) return;

	var barbariansWithDistance = [];

	barbs.forEach((barb) => {
		var distance = calcDistanceFromCurrentVillage(barb);
		barbariansWithDistance.push([...barb, distance]);
	});

	barbariansWithDistance.sort((a, b) => {
		return a[7] - b[7];
	});

	var tableRows = generateTableRows(barbariansWithDistance);

	var tableContent = `
		<table class="vis overview_table ra-table" width="100%">
			<thead>
				<tr>
					<th>
						#
					</th>
					<th>
						K
					</th>
					<th>
						${tt('Coords')}
					</th>
					<th>
						${tt('Points')}
					</td>
					<th>
						${tt('Dist.')}
					</th>
					<th>
						${tt('Attack')}
					</th>
				</tr>
			</thead>
			<tbody>
				${tableRows}
			</tbody>
		</table>
	`;

	return tableContent;
}

// Generate Table Rows
function generateTableRows(barbs) {
	var renderTableRows = '';
  const spy = parseInt(document.getElementById('spyCount').value) || defaultSpy;
  const light = parseInt(document.getElementById('lightCount').value) || defaultLight;

	barbs.forEach((barb, index) => {
		index++;
		var continent = barb[3].charAt(0) + barb[2].charAt(0);
		renderTableRows += `
			<tr>
				<td class="ra-tac">
					${index}
				</td>
				<td class="ra-tac">
					${continent}
				</td>
				<td class="ra-tac">
					<a href="game.php?screen=info_village&id=${barb[0]}" target="_blank" rel="noopener noreferrer">
						${barb[2]}|${barb[3]}
					</a>
				</td>
				<td>${formatAsNumber(barb[5])}</td>
				<td class="ra-tac">${barb[7]}</td>
				<td class="ra-tac">
					<a href="/game.php?screen=place&target=${
						barb[0]
					}&spy=${spy}&light=${light}" onClick="highlightOpenedCommands(this);" target="_blank" rel="noopener noreferrer" class="btn">
						${tt('Attack')}
					</a>
				</td>
			</tr>
		`;
	});

	return renderTableRows;
}

// Highlight Opened Commands
function highlightOpenedCommands(element) {
	element.classList.add('btn-confirm-yes');
	element.classList.add('btn-already-sent');
	element.parentElement.parentElement.classList.add('already-sent-command');
}

// Helper: Scout Script Generator
function generateScoutScript(barbsList) {
	  const spy = parseInt(document.getElementById('spyCount').value) || defaultSpy;
     const light = parseInt(document.getElementById('lightCount').value) || defaultLight;

	return `javascript:coords='${barbsList}';var doc=document;if(window.frames.length>0 && window.main!=null)doc=window.main.document;url=doc.URL;if(url.indexOf('screen=place')==-1)alert('Use the script in the rally point page!');coords=coords.split(' ');index=0;farmcookie=document.cookie.match('(^|;) ?farm=([^;]*)(;|$)');if(farmcookie!=null)index=parseInt(farmcookie[2]);if(index>=coords.length)alert('All villages were extracted, now start from the first!');if(index>=coords.length)index=0;coords=coords[index];coords=coords.split('|');index=index+1;cookie_date=new Date(2030,1,1);document.cookie ='farm='+index+';expires='+cookie_date.toGMTString();doc.forms[0].x.value=coords[0];doc.forms[0].y.value=coords[1];$('#place_target').find('input').val(coords[0]+'|'+coords[1]);doc.forms[0].spy.value=${spy};doc.forms[0].light.value=${light};`;
}

// Helper: Calculate distance between current and a given village
function calcDistanceFromCurrentVillage(village) {
	var x1 = game_data.village.x,
		y1 = game_data.village.y,
		x2 = village[2],
		y2 = village[3];
	//calculate distance from current village
	var a = x1 - x2;
	var b = y1 - y2;
	var distance = Math.round(Math.hypot(a, b));
	return distance;
}

// Helper: Get Villages Coords Array
function getVillageCoord(villages) {
	var villageCoords = [];
	villages.forEach((village) => {
		villageCoords.push(village[2] + '|' + village[3]);
	});
	return villageCoords;
}

// Helper: Format as number
function formatAsNumber(number) {
	return parseInt(number).toLocaleString('de');
}

//Helper: Convert CSV data into Array
function CSVToArray(strData, strDelimiter) {
	strDelimiter = strDelimiter || ',';
	var objPattern = new RegExp(
		'(\\' + strDelimiter + '|\\r?\\n|\\r|^)' + '(?:"([^"]*(?:""[^"]*)*)"|' + '([^"\\' + strDelimiter + '\\r\\n]*))',
		'gi'
	);
	var arrData = [[]];
	var arrMatches = null;
	while ((arrMatches = objPattern.exec(strData))) {
		var strMatchedDelimiter = arrMatches[1];
		if (strMatchedDelimiter.length && strMatchedDelimiter !== strDelimiter) {
			arrData.push([]);
		}
		var strMatchedValue;

		if (arrMatches[2]) {
			strMatchedValue = arrMatches[2].replace(new RegExp('""', 'g'), '"');
		} else {
			strMatchedValue = arrMatches[3];
		}
		arrData[arrData.length - 1].push(strMatchedValue);
	}
	return arrData;
}

// Helper: Generates script info
function scriptInfo() {
	return `[${scriptData.name} ${scriptData.version}]`;
}

// Helper: Prepare Popup Content
function preparePopupContent(popupBody, minWidth = '340px', maxWidth = '360px') {
	const popupHeader = `
		<h3 class="ra-fs18 ra-fw600">
			${tt(scriptData.name)}
		</h3>
		<div class="ra-body">`;
	const popupFooter = `</div><small><strong>${tt(scriptData.name)} ${scriptData.version}</strong> - <a href="${
		scriptData.authorUrl
	}" target="_blank" rel="noreferrer noopener">${scriptData.author}</a> - <a href="${
		scriptData.helpLink
	}" target="_blank" rel="noreferrer noopener">${tt('Help')}</a></small>`;
	const popupStyle = `
		<style>
			.popup_box_content { overflow-y: hidden; }
			.ra-body { width: 100%; min-width: ${minWidth}; max-width: ${maxWidth}; box-sizing: border-box; }
			.ra-fs12 { font-size: 12px; }
			.ra-fs16 { font-size: 16px; }
			.ra-fs18 { font-size: 18px; }
			.ra-fw600 { font-weight: 600; }
			.ra-mb10 { margin-bottom: 10px; }
			.ra-mb15 { margin-bottom: 15px; }
			.ra-tac { text-align: center; }
			.ra-textarea { width: 100%; height: 80px; box-sizing: border-box; padding: 5px; resize: none; }
			.ra-textarea:focus { box-shadow: none; outline: none; border: 1px solid #000; background-color: #eee; }
			.ra-table { border-spacing: 2px; border-collapse: separate; margin-bottom: 5px; border: 2px solid #f0e2be; }
			.ra-table th { text-align: center; }
            .ra-table td { padding: 1px 2px; }
            .ra-table td a { word-break: break-all; }
			.ra-table tr:nth-of-type(2n) td { background-color: #f0e2be }
			.ra-table tr:nth-of-type(2n+1) td { background-color: #fff5da; }
			.ra-form-control { font-size: 12px; padding: 4px; width: 100%; box-sizing: border-box; }
			.ra-flex { display: flex; flex-flow: row wrap; justify-content: space-between; }
			.ra-flex-6 { flex: 0 0 48%; }
            .ra-flex-4 { flex: 0 0 30.5%; }
            .btn-already-sent { padding: 3px; }
            .already-sent-command { opacity: 0.6; }
		</style>
	`;

	let popupContent = `
		${popupHeader}
		${popupBody}
		${popupFooter}
		${popupStyle}
	`;

	return popupContent;
}

// Helper: Prints universal debug information
function initDebug() {
	console.debug(`${scriptInfo()} It works ðŸš€!`);
	console.debug(`${scriptInfo()} HELP:`, scriptData.helpLink);
	if (DEBUG) {
		console.debug(`${scriptInfo()} Market:`, game_data.market);
		console.debug(`${scriptInfo()} World:`, game_data.world);
		console.debug(`${scriptInfo()} Screen:`, game_data.screen);
		console.debug(`${scriptInfo()} Game Version:`, game_data.majorVersion);
		console.debug(`${scriptInfo()} Game Build:`, game_data.version);
		console.debug(`${scriptInfo()} Locale:`, game_data.locale);
		console.debug(`${scriptInfo()} Premium:`, game_data.features.Premium.active);
	}
}

// Helper: Text Translator
function tt(string) {
	const gameLocale = game_data.locale;

	if (translations[gameLocale] !== undefined) {
		return translations[gameLocale][string];
	} else {
		return translations['en_DK'][string];
	}
}

// Helper: Translations Notice
function initTranslationsNotice() {
	const gameLocale = game_data.locale;

	if (translations[gameLocale] === undefined) {
		UI.ErrorMessage(
			`No translation found for <b>${gameLocale}</b>. <a href="${scriptData.helpLink}" class="btn" target="_blank" rel="noreferrer noopener">Add Yours</a> by replying to the thread.`,
			4000
		);
	}
}
