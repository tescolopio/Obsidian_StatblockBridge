#!/usr/bin/env node
/**
 * convert-to-2024.js
 *
 * Converts a D&D 2014 monster statblock (Fantasy Statblocks YAML format)
 * into the new D&D 2024 Monster Manual format.
 *
 * Key 2024 changes applied:
 *  - Adds `proficiency_bonus` (derived from CR)
 *  - Adds `xp` (derived from CR)
 *  - Adds `initiative` modifier (derived from DEX score)
 *  - Converts attack strings: "Melee/Ranged Weapon Attack: +X to hit …" → "Attack Roll: +X …"
 *  - Converts saving throw DCs: "DC X Ability saving throw" → "Saving Throw: DC X Ability"
 *  - Merges `damage_immunities` + `condition_immunities` into a single `immunities` field
 *  - Sets `layout: "D&D 2024"` so Fantasy Statblocks uses the correct renderer
 *
 * Usage (CLI):
 *   node convert-to-2024.js <input.md|input.yaml> [output.md|output.yaml]
 *
 * The input may be:
 *   - A Markdown file containing a ```statblock … ``` code block
 *   - A plain YAML file with monster data
 *
 * Usage (Node API):
 *   const { convertTo2024 } = require('./convert-to-2024');
 *   const monster2024 = convertTo2024(monster2014Object);
 */

'use strict';

const fs = require('fs');
const yaml = require('js-yaml');

// ---------------------------------------------------------------------------
// Lookup tables
// ---------------------------------------------------------------------------

/** Proficiency bonus by CR (string key). */
const PROFICIENCY_BONUS = {
  '0': 2, '1/8': 2, '1/4': 2, '1/2': 2,
  '1': 2,  '2': 2,  '3': 2,  '4': 2,
  '5': 3,  '6': 3,  '7': 3,  '8': 3,
  '9': 4,  '10': 4, '11': 4, '12': 4,
  '13': 5, '14': 5, '15': 5, '16': 5,
  '17': 6, '18': 6, '19': 6, '20': 6,
  '21': 7, '22': 7, '23': 7, '24': 7,
  '25': 8, '26': 8, '27': 8, '28': 8,
  '29': 9, '30': 9
};

/** XP award by CR (string key). */
const XP_BY_CR = {
  '0': 10,    '1/8': 25,   '1/4': 50,   '1/2': 100,
  '1': 200,   '2': 450,    '3': 700,    '4': 1100,
  '5': 1800,  '6': 2300,   '7': 2900,   '8': 3900,
  '9': 5000,  '10': 5900,  '11': 7200,  '12': 8400,
  '13': 10000,'14': 11500, '15': 13000, '16': 15000,
  '17': 18000,'18': 20000, '19': 22000, '20': 25000,
  '21': 33000,'22': 41000, '23': 50000, '24': 62000,
  '25': 75000,'26': 90000, '27': 105000,'28': 120000,
  '29': 135000,'30': 155000
};

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * Return the ability score modifier for a given score.
 * @param {number} score
 * @returns {number}
 */
function getModifier(score) {
  return Math.floor((score - 10) / 2);
}

/**
 * Format a numeric modifier with a leading sign.
 * @param {number} mod
 * @returns {string}  e.g. "+3" or "-1"
 */
function formatModifier(mod) {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

/**
 * Resolve the proficiency bonus for a given CR value.
 * @param {string|number} cr
 * @returns {number}
 */
function getProficiencyBonus(cr) {
  return PROFICIENCY_BONUS[String(cr)] || 2;
}

/**
 * Resolve the XP award for a given CR value.
 * @param {string|number} cr
 * @returns {number}
 */
function getXP(cr) {
  return XP_BY_CR[String(cr)] || 0;
}

// ---------------------------------------------------------------------------
// Text transformations
// ---------------------------------------------------------------------------

/**
 * Convert a 2014-style attack/save description to the 2024 format.
 *
 * Transformations performed:
 *   "Melee Weapon Attack: +X to hit, reach Y ft., one target. Hit:"
 *     → "Attack Roll: +X, reach Y ft. Hit:"
 *   "Ranged Weapon Attack: +X to hit, range Y/Z ft., one target. Hit:"
 *     → "Attack Roll: +X, range Y/Z ft. Hit:"
 *   "Melee or Ranged Weapon Attack: +X to hit, reach Y ft. or range Y/Z ft., one target. Hit:"
 *     → "Attack Roll: +X, reach Y ft. or range Y/Z ft. Hit:"
 *   "DC X Ability saving throw"  → "Saving Throw: DC X Ability"
 *
 * @param {string|null} [desc]
 * @returns {string|null}
 */
function convertAttackDesc(desc) {
  if (desc === undefined) return null;
  if (!desc) return desc;

  // Melee or Ranged Weapon Attack (must be checked before the individual patterns)
  // "reach Y ft. or range Y/Z ft." spans two comma-separated parts, so capture everything
  // up to the final comma before the target count using [^,]+ on the whole distance phrase.
  desc = desc.replace(
    /Melee or Ranged Weapon Attack:\s*([+-]\d+)\s*to hit,\s*(reach [^,]+),\s*[^.]+\.\s*Hit:/gi,
    (_, bonus, dist) => `Attack Roll: ${bonus}, ${dist.replace(/\.$/, '')}. Hit:`
  );

  // Melee Weapon Attack
  desc = desc.replace(
    /Melee Weapon Attack:\s*([+-]\d+)\s*to hit,\s*(reach [^,]+),\s*[^.]+\.\s*Hit:/gi,
    (_, bonus, dist) => `Attack Roll: ${bonus}, ${dist.replace(/\.$/, '')}. Hit:`
  );

  // Ranged Weapon Attack
  desc = desc.replace(
    /Ranged Weapon Attack:\s*([+-]\d+)\s*to hit,\s*(range [^,]+),\s*[^.]+\.\s*Hit:/gi,
    (_, bonus, dist) => `Attack Roll: ${bonus}, ${dist.replace(/\.$/, '')}. Hit:`
  );

  // "DC X Ability saving throw"  → "Saving Throw: DC X Ability"
  desc = desc.replace(
    /\bDC\s*(\d+)\s+(\w+)\s+saving throw/gi,
    'Saving Throw: DC $1 $2'
  );

  return desc;
}

/**
 * Apply convertAttackDesc to every `desc` field in an array of action objects.
 * @param {Array<{name: string, desc: string}>|undefined} list
 * @returns {Array<{name: string, desc: string}>|undefined}
 */
function convertActionList(list) {
  if (!Array.isArray(list)) return list;
  return list.map(entry => ({ ...entry, desc: convertAttackDesc(entry.desc) }));
}

// ---------------------------------------------------------------------------
// Core conversion
// ---------------------------------------------------------------------------

/**
 * Convert a parsed 2014 monster object to the 2024 format.
 *
 * This function is non-destructive: it returns a new object and does not
 * mutate the input.
 *
 * @param {Object} monster2014  Parsed YAML object from a 2014 statblock.
 * @returns {Object}            2024-format monster object.
 */
function convertTo2024(monster2014) {
  if (!monster2014 || typeof monster2014 !== 'object' || Array.isArray(monster2014)) {
    throw new Error('Invalid input: expected a plain object representing a monster statblock.');
  }

  const m = { ...monster2014 };
  const crStr = String(m.cr != null ? m.cr : '1');

  // -- Proficiency bonus ------------------------------------------------------
  if (m.proficiency_bonus == null) {
    m.proficiency_bonus = getProficiencyBonus(crStr);
  }

  // -- XP ---------------------------------------------------------------------
  if (m.xp == null) {
    m.xp = getXP(crStr);
  }

  // -- Initiative (DEX modifier) ---------------------------------------------
  if (m.initiative == null && Array.isArray(m.stats) && m.stats.length >= 2) {
    m.initiative = formatModifier(getModifier(m.stats[1]));
  }

  // -- Immunities (2024 merges damage + condition) ---------------------------
  if (m.immunities == null) {
    const parts = [];
    if (m.damage_immunities) parts.push(m.damage_immunities);
    if (m.condition_immunities) parts.push(m.condition_immunities);
    if (parts.length > 0) {
      m.immunities = parts.join('; ');
    }
  }

  // -- Convert action text to 2024 attack / save format ----------------------
  m.traits           = convertActionList(m.traits);
  m.actions          = convertActionList(m.actions);
  m.bonus_actions    = convertActionList(m.bonus_actions);
  m.reactions        = convertActionList(m.reactions);
  m.legendary_actions = convertActionList(m.legendary_actions);
  m.lair_actions     = convertActionList(m.lair_actions);

  // -- Tag layout for Fantasy Statblocks -------------------------------------
  m.layout = 'D&D 2024';

  return m;
}

// ---------------------------------------------------------------------------
// File I/O helpers
// ---------------------------------------------------------------------------

const STATBLOCK_RE = /^```statblock\r?\n([\s\S]*?)\r?\n```/m;

/**
 * Extract the YAML content from a Markdown statblock code fence.
 * Returns the raw string unchanged if no fence is found.
 * @param {string} content
 * @returns {{ yaml: string, isMarkdown: boolean }}
 */
function extractYaml(content) {
  const match = content.match(STATBLOCK_RE);
  if (match) {
    return { yaml: match[1], isMarkdown: true };
  }
  return { yaml: content, isMarkdown: false };
}

/**
 * Wrap a YAML string in a Markdown statblock code fence.
 * @param {string} yamlContent
 * @returns {string}
 */
function wrapStatblock(yamlContent) {
  return '```statblock\n' + yamlContent.trimEnd() + '\n```\n';
}

/**
 * Derive an output path from an input path.
 * "goblin.md"       → "goblin-2024.md"
 * "goblin-2014.md"  → "goblin-2024.md"
 * @param {string} inputPath
 * @returns {string}
 */
function deriveOutputPath(inputPath) {
  if (/-2014(\.[^.]+)$/.test(inputPath)) {
    return inputPath.replace(/-2014(\.[^.]+)$/, '-2024$1');
  }
  return inputPath.replace(/(\.[^.]+)$/, '-2024$1');
}

/**
 * Convert a monster file (Markdown or YAML) from 2014 to 2024 format.
 *
 * @param {string} inputPath   Path to the source file.
 * @param {string} [outputPath] Path for the converted file (optional; derived from inputPath if omitted).
 * @returns {string} The path of the written output file.
 */
function convertFile(inputPath, outputPath) {
  const content = fs.readFileSync(inputPath, 'utf8');
  const { yaml: yamlContent, isMarkdown } = extractYaml(content);

  const monster2014 = yaml.load(yamlContent);
  const monster2024 = convertTo2024(monster2014);

  const outputYaml = yaml.dump(monster2024, {
    lineWidth: -1,
    noRefs: true,
    quotingType: '"'
  });

  const output = isMarkdown ? wrapStatblock(outputYaml) : outputYaml;
  const outFile = outputPath || deriveOutputPath(inputPath);
  fs.writeFileSync(outFile, output, 'utf8');
  return outFile;
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

if (require.main === module) {
  const [inputPath, outputPath] = process.argv.slice(2);

  if (!inputPath) {
    console.error('Usage: node convert-to-2024.js <input-file> [output-file]');
    console.error('  <input-file>  Markdown with ```statblock block, or plain YAML');
    console.error('  [output-file] Optional output path (default: <input>-2024.<ext>)');
    process.exit(1);
  }

  try {
    const outFile = convertFile(inputPath, outputPath);
    console.log(`Converted: ${inputPath} → ${outFile}`);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

module.exports = {
  convertTo2024,
  convertAttackDesc,
  convertActionList,
  getProficiencyBonus,
  getXP,
  getModifier,
  formatModifier,
  extractYaml,
  wrapStatblock,
  deriveOutputPath,
  convertFile
};
