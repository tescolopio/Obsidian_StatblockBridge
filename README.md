# Obsidian StatblockBridge

**A companion utility for converting D&D 2014 monster statblocks to the D&D 2024 format inside [Obsidian](https://obsidian.md), using the [Fantasy Statblocks](https://github.com/javalent/fantasy-statblocks) and [Initiative Tracker](https://github.com/javalent/initiative-tracker) plugins.**

---

## Overview

The 2024 *Monster Manual* introduced a revised statblock layout that is incompatible with the 2014 format used by thousands of existing Obsidian vault notes. This project bridges that gap with:

| Component | Purpose |
|---|---|
| `scripts/convert-to-2024.js` | Node.js CLI converter — transforms 2014 YAML to 2024 format |
| `templates/dnd2024-layout.json` | Fantasy Statblocks custom layout definition for the 2024 style |
| `templates/monsters/` | Ready-to-use 2024-format monster note examples |
| `css/dnd2024-statblock.css` | Obsidian CSS snippet that renders the 2024 Monster Manual aesthetic |
| `examples/` | 2014-format input files for testing the converter |
| `tests/` | Jest unit tests for the converter |

---

## What Changed in D&D 2024

| Field / rule | 2014 format | 2024 format |
|---|---|---|
| **Proficiency Bonus** | Implicit (derived from CR) | Explicit `proficiency_bonus` field |
| **Initiative** | Not listed | Explicit `initiative` modifier (e.g. `+2`) |
| **XP** | Listed after CR | Explicit `xp` field |
| **Attack rolls** | `Melee Weapon Attack: +X to hit, reach Y ft., one target. Hit:` | `Attack Roll: +X, reach Y ft. Hit:` |
| **Saving throw DCs** | `DC X Ability saving throw` | `Saving Throw: DC X Ability` |
| **Immunities** | Separate `damage_immunities` and `condition_immunities` fields | Single `immunities` field |
| **Gear** | Not listed | Optional `gear` field |
| **Bonus Actions** | Often buried in trait text | Explicit `bonus_actions` section |
| **Layout tag** | *(none)* | `layout: "D&D 2024"` |

---

## Quick Start

### 1 — Install prerequisites

```bash
cd scripts
npm install
```

> **Requires:** Node.js 16 or later.

### 2 — Convert a single monster file

```bash
node scripts/convert-to-2024.js examples/goblin-2014.md
# → writes examples/goblin-2024.md
```

Specify a custom output path:

```bash
node scripts/convert-to-2024.js examples/goblin-2014.md vault/monsters/goblin.md
```

The script accepts:
- **Markdown files** (`.md`) that contain a ` ```statblock ``` ` code fence
- **Plain YAML files** (`.yaml` / `.yml`) with raw monster data

### 3 — Install the Obsidian CSS snippet

1. Copy `css/dnd2024-statblock.css` to `<your-vault>/.obsidian/snippets/`
2. Open Obsidian → **Settings → Appearance → CSS Snippets**
3. Enable **dnd2024-statblock**

### 4 — Import the Fantasy Statblocks layout

1. Open Obsidian → **Settings → Fantasy Statblocks**
2. Scroll to **Layouts** and click **Import Layout**
3. Select `templates/dnd2024-layout.json`

The layout named **"D&D 2024"** will now be available. Any statblock note that contains `layout: "D&D 2024"` in its YAML will automatically use this layout.

### 5 — Use the example monsters

Copy any file from `templates/monsters/` into your vault to see the finished result:

- `goblin-2024.md` — Small humanoid with Nimble Escape
- `bandit-captain-2024.md` — Medium humanoid with gear, bonus actions, and a reaction
- `ancient-red-dragon-2024.md` — Gargantuan dragon with legendary/lair actions

---

## Converter Reference

### CLI

```
node scripts/convert-to-2024.js <input-file> [output-file]
```

| Argument | Description |
|---|---|
| `input-file` | Markdown (`.md`) with a ` ```statblock ``` ` block, or plain YAML |
| `output-file` | *(optional)* Destination path. Defaults to `<input>-2024.<ext>` |

### Node API

```js
const { convertTo2024 } = require('./scripts/convert-to-2024');

const goblin2014 = {
  name: 'Goblin',
  cr: '1/4',
  stats: [8, 14, 10, 10, 8, 8],
  // ... full 2014 fields
};

const goblin2024 = convertTo2024(goblin2014);
// goblin2024.proficiency_bonus === 2
// goblin2024.initiative         === '+2'
// goblin2024.xp                 === 50
// goblin2024.layout             === 'D&D 2024'
```

**Exported functions:**

| Function | Description |
|---|---|
| `convertTo2024(monster)` | Main conversion — returns a new 2024-format object |
| `convertAttackDesc(desc)` | Transforms a single action description string |
| `convertActionList(list)` | Maps `convertAttackDesc` over an array of `{name, desc}` objects |
| `getProficiencyBonus(cr)` | Returns the proficiency bonus for a CR value |
| `getXP(cr)` | Returns the XP award for a CR value |
| `getModifier(score)` | Returns the ability score modifier |
| `formatModifier(mod)` | Formats a modifier with a leading sign (e.g. `'+3'`) |
| `convertFile(input, output?)` | High-level file-to-file conversion |

---

## Statblock YAML Field Reference (2024 format)

```yaml
layout: "D&D 2024"       # Required — activates the 2024 renderer
name: Monster Name
size: Medium
type: Humanoid
subtype: "(any)"          # Optional
alignment: Neutral Evil
ac: 15
hp: 65
hit_dice: 10d8 + 20
speed: "30 ft."
stats: [15, 16, 14, 14, 11, 14]   # STR DEX CON INT WIS CHA

# 2024 additions
proficiency_bonus: 3      # Explicit proficiency bonus
initiative: "+3"          # DEX modifier (string, keep the + sign)
xp: 1800                  # XP award

cr: 2                     # Challenge rating

# Defenses
immunities: "fire; charmed"        # Merged damage + condition immunities
damage_resistances: "cold"
damage_vulnerabilities: ""

# Saves (only list proficient saves)
saves:
  - STR: 4
  - DEX: 5

skillsaves:
  - Athletics: 4
  - Stealth: 6

senses: "Darkvision 60 ft., Passive Perception 13"
languages: "Common, Goblin"
gear: "Studded Leather, Scimitar x2"   # 2024 gear listing (optional)

# --- Narrative sections ---
traits:
  - name: Pack Tactics
    desc: "The creature has advantage on attack rolls when an ally is adjacent."

actions:
  - name: Multiattack
    desc: "The creature makes two Scimitar attacks."
  - name: Scimitar
    desc: "Attack Roll: +5, reach 5 ft. Hit: 6 (1d6 + 3) slashing damage."

bonus_actions:
  - name: Nimble Escape
    desc: "The creature takes the Disengage or Hide action."

reactions:
  - name: Parry
    desc: "Adds +3 to AC against one melee attack that would hit it."

legendary_actions:
  - name: Detect
    desc: "Makes a Wisdom (Perception) check."

lair_actions:
  - name: Tremors
    desc: "The ground shakes in a 60 ft. radius."
```

---

## Running Tests

```bash
cd scripts
npm test
```

All 61 unit tests cover:

- Ability score modifier and proficiency-bonus calculations
- Attack-string regex transformations (melee, ranged, melee-or-ranged, negative bonus)
- Saving-throw DC reformatting
- Full `convertTo2024` integration (immutability, field inference, action list conversion)
- File-path derivation and markdown fence extraction

---

## Contributing

1. Fork the repository
2. Add or update tests in `tests/convert.test.js`
3. Run `cd scripts && npm test` — all tests must pass
4. Open a pull request

---

## License

MIT — see [LICENSE](LICENSE).

