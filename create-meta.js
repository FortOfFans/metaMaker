const fs = require('fs');
const inquirer = require('inquirer');

// Load input data
const weapons = require('D:/GIT//turnbasedgamedata/maps/en/weapons.json');
const characters = require('D:/GIT//turnbasedgamedata/maps/en/avatar.json');
const relicSets = require('D:/GIT//turnbasedgamedata/maps/en/relicset.json');
const statsData = require('D:/GIT//turnbasedgamedata/maps/en/stats.json');

const statKeys = Object.keys(statsData).filter(stat => stat !== 'CriticalValue');
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

    const weaponChoices = validWeapons
        .sort(([, a], [, b]) => b.rarity - a.rarity)
        .map(([id, weapon]) => ({
            name: `★${weapon.rarity} - ${weapon.name || 'Unknown'} (${id})`,
            value: id
        }));

    const { weaponIds } = await inquirer.prompt({
        type: 'checkbox',
        name: 'weaponIds',
        message: `Select up to 3 weapons matching type "${characterWeaponType}":`,
        choices: weaponChoices,
        validate: (input) => input.length <= 3 ? true : 'Please select up to 3 weapons only'
    });

    const { subStats } = await inquirer.prompt({
        type: 'checkbox',
        name: 'subStats',
        message: 'Select up to 4 sub-stats:',
        choices: statKeys.filter(w => {
            const pattern = /DMG Boost|Boost|Max|Healing|Base|Energy|Value|Accuracy/i;
            return !pattern.test(w);
        }),
        validate: (input) => input.length <= 4 ? true : 'Please select up to 4 stats'
    });

    const relicChoices = Object.entries(relicSets)
        .filter(([, set]) => set.planarSet !== true)
        .map(([id, set]) => {
            const effects = [
                set['2'] ? `2pc: ${set['2'].effect}` : null,
                set['4'] ? `4pc: ${set['4'].effect}` : null
            ].filter(Boolean).join(' | ');
            return {
                name: `${set.name} (${effects}) - ${id}`,
                value: id
            };
        });

    const ornamentChoices = Object.entries(relicSets)
        .filter(([, set]) => set.planarSet === true)
        .map(([id, set]) => {
            const effects = [
                set['2'] ? `2pc: ${set['2'].effect}` : null,
                set['4'] ? `4pc: ${set['4'].effect}` : null
            ].filter(Boolean).join(' | ');
            return {
                name: `${set.name} (${effects}) - ${id}`,
                value: id
            };
        });

    const { selectedRelics1 } = await inquirer.prompt({
        type: 'checkbox',
        name: 'selectedRelics1',
        message: 'Select up to 2 relic sets (non-ornament) for combo 1:',
        choices: relicChoices,
        validate: (input) => input.length <= 2 ? true : 'Please select at most 2 relic sets'
    });

    const { selectedRelics2 } = await inquirer.prompt({
        type: 'checkbox',
        name: 'selectedRelics2',
        message: 'Select up to 2 relic sets (non-ornament) for combo 2:',
        choices: relicChoices,
        validate: (input) => input.length <= 2 ? true : 'Please select at most 2 relic sets'
    });

    const { selectedOrnaments } = await inquirer.prompt({
        type: 'checkbox',
        name: 'selectedOrnaments',
        message: 'Select up to 2 ornament sets:',
        choices: ornamentChoices,
        validate: (input) => input.length <= 2 ? true : 'Please select at most 2 ornament sets'
    });

    const { eidolon } = await inquirer.prompt({
        type: 'list',
        name: 'eidolon',
        message: 'Select Eidolon level:',
        choices: ['E0', 'E1', 'E2', 'E3', 'E4', 'E5', 'E6']
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

    const { talentsIndex } = await inquirer.prompt({
        type: 'list',
        name: 'talentsIndex',
        message: 'Please select the recommended Main Trace Upgrade Priority for this character.',
        choices: talentOptions.map((label, index) => ({ name: label, value: index }))
    });

    const elementStats = statKeys.filter(stat => stat.toLowerCase().includes('damage') || stat.toLowerCase().includes('boost'));
    const nonElementStats = statKeys.filter(stat => !elementStats.includes(stat));

    const { mainStatsBody, mainStatsFoot, mainStatsOrb, mainStatsRope, statValues, synergies } = await inquirer.prompt([
        {
            type: 'checkbox',
            name: 'mainStatsBody',
            message: 'Select possible main stats for BODY slot:',
            choices: [
                { label: 'ATK%', value: 'ATK%' },
                { label: 'Crit DMG / Rate', value: 'Crit DMG / Rate' },
                { label: 'Crit Rate', value: 'Crit Rate' },
                { label: 'Crit DMG', value: 'Crit DMG' },
                { label: 'DEF%', value: 'DEF%' },
                { label: 'Effect Hit Rate%', value: 'EHR%' },
                { label: 'HP%', value: 'HP%' },
                { label: 'Outgoing Healing Boost', value: 'OHB%' }
            ]
        },
        {
            type: 'checkbox',
            name: 'mainStatsFoot',
            message: 'Select possible main stats for FOOT slot:',
            choices: [
                { label: 'ATK%', value: 'ATK%' },
                { label: 'DEF%', value: 'DEF%' },
                { label: 'HP%', value: 'HP%' },
                { label: 'SPD', value: 'SPD' }
            ]
        },
        {
            type: 'checkbox',
            name: 'mainStatsRope',
            message: 'Select possible main stats for ROPE slot:',
            choices: [
                { label: 'ATK%', value: 'ATK%' },
                { label: 'Break Effect%', value: 'Break' },
                { label: 'DEF%', value: 'DEF%' },
                { label: 'Energy Recharge Rate%', value: 'Energy' },
                { label: 'HP%', value: 'HP%' }
            ]
        },
        {
            type: 'checkbox',
            name: 'mainStatsOrb',
            message: 'Select possible main stats for ORB slot (elemental stats only):',
            choices: [
                { label: 'ATK%', value: 'ATK%' },
                { label: 'DEF%', value: 'DEF%' },
                { label: 'HP%', value: 'HP%' },
                { label: 'Fire DMG', value: 'Fire DMG' },
                { label: 'Ice DMG', value: 'Ice DMG' },
                { label: 'Imaginary DMG', value: 'Imaginary DMG' },
                { label: 'Lightning DMG', value: 'Lightning DMG' },
                { label: 'Physical DMG', value: 'Physical DMG' },
                { label: 'Quantum DMG', value: 'Quantum DMG' },
                { label: 'Wind DMG', value: 'Wind DMG' }
            ]
        },
        {
            type: 'editor',
            name: 'statValues',
            message: 'Enter stats JSON (leave empty for default structure):',
            default: JSON.stringify({
                BaseSpeed: '',
                CriticalChance: '',
                CriticalDamage: '',
                SPRatio: '',
                StatusProbabilityBase: '',
                BreakDamageAddedRatioBase: ''
            }, null, 2)
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

    try {
        JSON.parse(statValues);
        // mainStats are already structured from checkboxes
    } catch (e) {
        console.error('❌ Invalid JSON detected. Please check your input.');
        process.exit(1);
    }

    const newMetaEntry = {
        name: selectedChar?.name || '',
        weapons: weaponIds,
        subStats,
        stats: JSON.parse(statValues),
        version: '', // manually leave blank for now
        sets: [selectedRelics1, selectedRelics2, selectedOrnaments],
        mainStats: {
            BODY: mainStatsBody,
            FOOT: mainStatsFoot,
            ORB: mainStatsOrb,
            ROPE: mainStatsRope
        },
        eidolon,
        talentsIndex,
        synergies
    };

    existingMeta[characterId] = newMetaEntry;
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(existingMeta, null, 2));
    console.log(`✅ Metadata for ${selectedChar.name} saved to ${OUTPUT_FILE}`);
})();
