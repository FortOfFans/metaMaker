const fs = require('fs');
const inquirer = require('inquirer');

// Load input data
const weapons = require('D:/GIT//turnbasedgamedata/maps/en/weapons.json');
const characters = require('D:/GIT//turnbasedgamedata/maps/en/avatar.json');
const relicSets = require('D:/GIT//turnbasedgamedata/maps/en/relicset.json');
const statsData = require('D:/GIT//turnbasedgamedata/maps/en/stats.json');

const statKeys = Object.keys(statsData);

// Filter elemental damage stats for ORB slot only
const elementalStatKeys = statKeys.filter(stat => {
    const value = statsData[stat];
    const desc = typeof value === 'object' ? value.desc?.toLowerCase() || '' : '';
    const name = stat.toLowerCase();

    const isDamage = desc.includes('dmg') || desc.includes('damage') || name.includes('dmg');
    const isElement = ['fire', 'ice', 'wind', 'quantum', 'imaginary', 'lightning', 'physical'].some(el => name.includes(el));
    const isResistance = name.includes('res') || desc.includes('resistance');

    return (isDamage || isElement) && !isResistance;
});

const talentOptions = [
    'Ult > T > S > B', 'Ult > T > B > S', 'Ult > S > T > B', 'Ult > S > B > T',
    'Ult > B > T > S', 'Ult > B > S > T', 'T > Ult > S > B', 'T > Ult > B > S',
    'T > S > Ult > B', 'T > S > B > Ult', 'T > B > Ult > S', 'T > B > S > Ult',
    'S > Ult > T > B', 'S > Ult > B > T', 'S > T > Ult > B', 'S > T > B > Ult',
    'S > B > Ult > T', 'S > B > T > Ult', 'B > Ult > S > T', 'B > Ult > T > S',
    'B > S > Ult > T', 'B > S > T > Ult', 'B > T > Ult > S', 'B > T > S > Ult',
    'Blade'
];

const OUTPUT_FILE = 'meta-output.json';

(async () => {
    const existingMeta = fs.existsSync(OUTPUT_FILE)
        ? JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'))
        : {};

    const { characterId } = await inquirer.prompt({
        type: 'list',
        name: 'characterId',
        message: 'Choose a character:',
        choices: Object.entries(characters).map(([id, char]) => ({
            name: char.name,
            value: id
        }))
    });

    const selectedChar = characters[characterId];
    const characterWeaponType = selectedChar.weapon;

    const validWeapons = Object.entries(weapons).filter(([id, weapon]) =>
        weapon.weaponType === selectedChar.avatarType
    );

    if (validWeapons.length === 0) {
        console.log(`⚠️ No weapons found for character weapon type: ${characterWeaponType}`);
        process.exit(1);
    }

    const weaponChoices = validWeapons.map(([id, weapon]) => ({
        name: `★${weapon.rarity} - ${weapon.name || 'Unknown'} (${id})`,
        value: id
    }));

    const { weaponIds } = await inquirer.prompt({
        type: 'checkbox',
        name: 'weaponIds',
        message: `Select up to 3 weapons matching type "${characterWeaponType}":`,
        choices: weaponChoices,
        validate: input => input.length <= 3 ? true : 'Please select up to 3 weapons only'
    });

    const { subStats } = await inquirer.prompt({
        type: 'checkbox',
        name: 'subStats',
        message: 'Select up to 4 sub-stats:',
        choices: statKeys,
        validate: input => input.length <= 4 ? true : 'Please select up to 4 stats'
    });

    const relicChoices = Object.entries(relicSets).map(([id, set]) => {
        const effects = [
            set['2'] ? `2pc: ${set['2'].effect}` : null,
            set['4'] ? `4pc: ${set['4'].effect}` : null
        ].filter(Boolean).join(' | ');
        return {
            name: `${set.name} (${effects}) - ${id}`,
            value: id
        };
    });

    const { selectedRelics } = await inquirer.prompt({
        type: 'checkbox',
        name: 'selectedRelics',
        message: 'Select relic set IDs (multiple allowed):',
        choices: relicChoices
    });

    const { eidolon } = await inquirer.prompt({
        type: 'list',
        name: 'eidolon',
        message: 'Select Eidolon level:',
        choices: ['E0', 'E1', 'E2', 'E3', 'E4', 'E5', 'E6']
    });

    const { talents } = await inquirer.prompt({
        type: 'list',
        name: 'talents',
        message: 'Please select the recommended Main Trace Upgrade Priority for this character.',
        choices: talentOptions.map((label, index) => ({ name: label, value: index }))
    });

    const { mainStatsBody, mainStatsFoot, mainStatsOrb, mainStatsRope, statValues, synergies } = await inquirer.prompt([
        {
            type: 'checkbox',
            name: 'mainStatsBody',
            message: 'Select possible main stats for BODY slot:',
            choices: statKeys
        },
        {
            type: 'checkbox',
            name: 'mainStatsFoot',
            message: 'Select possible main stats for FOOT slot:',
            choices: statKeys
        },
        {
            type: 'checkbox',
            name: 'mainStatsOrb',
            message: 'Select possible main stats for ORB slot (elemental damage only):',
            choices: elementalStatKeys
        },
        {
            type: 'checkbox',
            name: 'mainStatsRope',
            message: 'Select possible main stats for ROPE slot:',
            choices: statKeys
        },
        {
            type: 'editor',
            name: 'statValues',
            message: 'Enter stats JSON (e.g., {"BaseSpeed":"120"}):',
            default: () => {
                const baseStats = {};
                if (Array.isArray(selectedChar.statsArray)) {
                    selectedChar.statsArray.forEach(statObj => {
                        if (statObj.stat && statObj.value != null) {
                            baseStats[statObj.stat] = statObj.value;
                        }
                    });
                }
                return JSON.stringify(baseStats, null, 2);
            }
        },
        {
            type: 'checkbox',
            name: 'synergies',
            message: 'Select synergy characters (multiple allowed):',
            choices: Object.entries(characters).map(([id, char]) => ({
                name: char.name,
                value: id
            }))
        }
    ]);

    let parsedStats = {};
    try {
        parsedStats = JSON.parse(statValues);
    } catch (e) {
        console.error('❌ Invalid JSON detected. Make sure to use double quotes and proper syntax.');
        process.exit(1);
    }

    const newMetaEntry = {
        name: selectedChar?.name || '',
        weapons: weaponIds,
        subStats,
        stats: parsedStats,
        version: '', // leave blank
        sets: [selectedRelics],
        mainStats: {
            BODY: mainStatsBody,
            FOOT: mainStatsFoot,
            ORB: mainStatsOrb,
            ROPE: mainStatsRope
        },
        eidolon,
        talents, // stored as index now
        synergies
    };

    existingMeta[characterId] = newMetaEntry;
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(existingMeta, null, 2));
    console.log(`✅ Metadata for ${selectedChar.name} saved to ${OUTPUT_FILE}`);
})();
