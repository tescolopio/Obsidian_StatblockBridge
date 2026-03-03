'use strict';

const {
  convertTo2024,
  convertAttackDesc,
  convertActionList,
  getProficiencyBonus,
  getXP,
  getModifier,
  formatModifier,
  extractYaml,
  wrapStatblock,
  deriveOutputPath
} = require('../scripts/convert-to-2024');

// ---------------------------------------------------------------------------
// Helper / lookup functions
// ---------------------------------------------------------------------------

describe('getModifier', () => {
  it('returns 0 for score 10', () => expect(getModifier(10)).toBe(0));
  it('returns +1 for score 12', () => expect(getModifier(12)).toBe(1));
  it('returns +4 for score 18', () => expect(getModifier(18)).toBe(4));
  it('returns -1 for score 8',  () => expect(getModifier(8)).toBe(-1));
  it('returns -5 for score 1',  () => expect(getModifier(1)).toBe(-5));
});

describe('formatModifier', () => {
  it('prefixes positive numbers with +', () => expect(formatModifier(3)).toBe('+3'));
  it('leaves negative numbers unchanged', () => expect(formatModifier(-2)).toBe('-2'));
  it('prefixes zero with +',             () => expect(formatModifier(0)).toBe('+0'));
});

describe('getProficiencyBonus', () => {
  it('returns 2 for CR 0',   () => expect(getProficiencyBonus('0')).toBe(2));
  it('returns 2 for CR 1/4', () => expect(getProficiencyBonus('1/4')).toBe(2));
  it('returns 3 for CR 5',   () => expect(getProficiencyBonus('5')).toBe(3));
  it('returns 5 for CR 13',  () => expect(getProficiencyBonus('13')).toBe(5));
  it('returns 9 for CR 30',  () => expect(getProficiencyBonus('30')).toBe(9));
  it('accepts numeric cr',   () => expect(getProficiencyBonus(8)).toBe(3));
  it('defaults to 2 for unknown CR', () => expect(getProficiencyBonus('99')).toBe(2));
});

describe('getXP', () => {
  it('returns 25 for CR 1/8',  () => expect(getXP('1/8')).toBe(25));
  it('returns 200 for CR 1',   () => expect(getXP('1')).toBe(200));
  it('returns 1800 for CR 5',  () => expect(getXP('5')).toBe(1800));
  it('returns 25000 for CR 20',() => expect(getXP('20')).toBe(25000));
  it('returns 0 for unknown CR', () => expect(getXP('99')).toBe(0));
});

// ---------------------------------------------------------------------------
// convertAttackDesc
// ---------------------------------------------------------------------------

describe('convertAttackDesc', () => {
  it('converts a melee weapon attack', () => {
    const input = 'Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) slashing damage.';
    const result = convertAttackDesc(input);
    expect(result).toBe('Attack Roll: +4, reach 5 ft. Hit: 5 (1d6 + 2) slashing damage.');
    expect(result).not.toMatch(/Melee Weapon Attack/i);
  });

  it('converts a ranged weapon attack', () => {
    const input = 'Ranged Weapon Attack: +4 to hit, range 80/320 ft., one target. Hit: 5 (1d6 + 2) piercing damage.';
    const result = convertAttackDesc(input);
    expect(result).toBe('Attack Roll: +4, range 80/320 ft. Hit: 5 (1d6 + 2) piercing damage.');
  });

  it('converts a melee or ranged weapon attack', () => {
    const input = 'Melee or Ranged Weapon Attack: +5 to hit, reach 5 ft. or range 30/120 ft., one target. Hit: 6 (1d6 + 3) piercing damage.';
    const result = convertAttackDesc(input);
    expect(result).toBe('Attack Roll: +5, reach 5 ft. or range 30/120 ft. Hit: 6 (1d6 + 3) piercing damage.');
  });

  it('converts a saving throw DC', () => {
    const input = 'Each creature in the area must make a DC 15 Dexterity saving throw.';
    const result = convertAttackDesc(input);
    expect(result).toBe('Each creature in the area must make a Saving Throw: DC 15 Dexterity.');
  });

  it('handles negative attack bonus', () => {
    const input = 'Melee Weapon Attack: -1 to hit, reach 5 ft., one target. Hit: 2 (1d4) bludgeoning damage.';
    expect(convertAttackDesc(input)).toBe('Attack Roll: -1, reach 5 ft. Hit: 2 (1d4) bludgeoning damage.');
  });

  it('returns undefined unchanged', () => {
    expect(convertAttackDesc(undefined)).toBeUndefined();
  });

  it('returns null unchanged', () => {
    expect(convertAttackDesc(null)).toBeNull();
  });

  it('leaves non-attack text untouched', () => {
    const text = 'The goblin can take the Disengage or Hide action as a bonus action.';
    expect(convertAttackDesc(text)).toBe(text);
  });

  it('is case-insensitive for attack keywords', () => {
    const input = 'melee weapon attack: +3 to hit, reach 5 ft., one target. hit: 4 (1d6+1) damage.';
    expect(convertAttackDesc(input)).toMatch(/^Attack Roll: \+3/i);
  });
});

// ---------------------------------------------------------------------------
// convertActionList
// ---------------------------------------------------------------------------

describe('convertActionList', () => {
  it('transforms each entry in the list', () => {
    const list = [
      { name: 'Bite', desc: 'Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 7 (1d8 + 3) piercing damage.' }
    ];
    const result = convertActionList(list);
    expect(result[0].desc).toMatch(/^Attack Roll:/);
  });

  it('returns undefined when given undefined', () => {
    expect(convertActionList(undefined)).toBeUndefined();
  });

  it('returns an empty array unchanged', () => {
    expect(convertActionList([])).toEqual([]);
  });

  it('does not mutate the original list', () => {
    const original = [{ name: 'Bite', desc: 'Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 7 (1d8 + 3) piercing damage.' }];
    const copy = JSON.parse(JSON.stringify(original));
    convertActionList(original);
    expect(original).toEqual(copy);
  });
});

// ---------------------------------------------------------------------------
// extractYaml / wrapStatblock / deriveOutputPath
// ---------------------------------------------------------------------------

describe('extractYaml', () => {
  it('extracts YAML from a markdown statblock fence', () => {
    const md = '# Goblin\n\n```statblock\nname: Goblin\ncr: "1/4"\n```\n';
    const { yaml, isMarkdown } = extractYaml(md);
    expect(yaml).toBe('name: Goblin\ncr: "1/4"');
    expect(isMarkdown).toBe(true);
  });

  it('returns the raw string when there is no fence', () => {
    const raw = 'name: Goblin\ncr: "1/4"\n';
    const { yaml, isMarkdown } = extractYaml(raw);
    expect(yaml).toBe(raw);
    expect(isMarkdown).toBe(false);
  });
});

describe('wrapStatblock', () => {
  it('wraps YAML in a statblock code fence', () => {
    const result = wrapStatblock('name: Goblin');
    expect(result).toBe('```statblock\nname: Goblin\n```\n');
  });

  it('trims trailing whitespace from the content', () => {
    const result = wrapStatblock('name: Goblin\n\n');
    expect(result).toBe('```statblock\nname: Goblin\n```\n');
  });
});

describe('deriveOutputPath', () => {
  it('appends -2024 before the extension', () => {
    expect(deriveOutputPath('goblin.md')).toBe('goblin-2024.md');
  });

  it('replaces -2014 with -2024', () => {
    expect(deriveOutputPath('goblin-2014.md')).toBe('goblin-2024.md');
  });

  it('works with .yaml extension', () => {
    expect(deriveOutputPath('monsters/orc.yaml')).toBe('monsters/orc-2024.yaml');
  });
});

// ---------------------------------------------------------------------------
// convertTo2024 – integration tests
// ---------------------------------------------------------------------------

describe('convertTo2024', () => {
  const goblin2014 = {
    name: 'Goblin',
    size: 'Small',
    type: 'Humanoid',
    subtype: 'goblinoid',
    alignment: 'Neutral Evil',
    ac: 15,
    hp: 7,
    hit_dice: '2d6',
    speed: '30 ft.',
    stats: [8, 14, 10, 10, 8, 8],
    senses: 'Darkvision 60 ft.',
    languages: 'Common, Goblin',
    cr: '1/4',
    damage_immunities: 'poison',
    condition_immunities: 'poisoned',
    traits: [
      {
        name: 'Nimble Escape',
        desc: 'The goblin can take the Disengage or Hide action as a bonus action on each of its turns.'
      }
    ],
    actions: [
      {
        name: 'Scimitar',
        desc: 'Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) slashing damage.'
      },
      {
        name: 'Shortbow',
        desc: 'Ranged Weapon Attack: +4 to hit, range 80/320 ft., one target. Hit: 5 (1d6 + 2) piercing damage.'
      }
    ]
  };

  let result;

  beforeEach(() => {
    result = convertTo2024(goblin2014);
  });

  it('does not mutate the input', () => {
    expect(goblin2014.proficiency_bonus).toBeUndefined();
    expect(goblin2014.layout).toBeUndefined();
  });

  it('adds proficiency_bonus 2 for CR 1/4', () => {
    expect(result.proficiency_bonus).toBe(2);
  });

  it('adds xp 50 for CR 1/4', () => {
    expect(result.xp).toBe(50);
  });

  it('adds initiative +2 from DEX 14', () => {
    expect(result.initiative).toBe('+2');
  });

  it('merges damage_immunities and condition_immunities into immunities', () => {
    expect(result.immunities).toBe('poison; poisoned');
  });

  it('sets layout to "D&D 2024"', () => {
    expect(result.layout).toBe('D&D 2024');
  });

  it('converts the Scimitar action to 2024 format', () => {
    const scimitar = result.actions.find(a => a.name === 'Scimitar');
    expect(scimitar.desc).toBe('Attack Roll: +4, reach 5 ft. Hit: 5 (1d6 + 2) slashing damage.');
  });

  it('converts the Shortbow action to 2024 format', () => {
    const shortbow = result.actions.find(a => a.name === 'Shortbow');
    expect(shortbow.desc).toBe('Attack Roll: +4, range 80/320 ft. Hit: 5 (1d6 + 2) piercing damage.');
  });

  it('preserves non-attack trait text unchanged', () => {
    const nimble = result.traits.find(t => t.name === 'Nimble Escape');
    expect(nimble.desc).toBe(
      'The goblin can take the Disengage or Hide action as a bonus action on each of its turns.'
    );
  });

  it('preserves original fields (name, type, etc.)', () => {
    expect(result.name).toBe('Goblin');
    expect(result.type).toBe('Humanoid');
    expect(result.cr).toBe('1/4');
    expect(result.stats).toEqual([8, 14, 10, 10, 8, 8]);
  });

  it('does not overwrite existing proficiency_bonus', () => {
    const m = convertTo2024({ ...goblin2014, proficiency_bonus: 10 });
    expect(m.proficiency_bonus).toBe(10);
  });

  it('does not overwrite existing initiative', () => {
    const m = convertTo2024({ ...goblin2014, initiative: '+99' });
    expect(m.initiative).toBe('+99');
  });

  it('does not overwrite existing xp', () => {
    const m = convertTo2024({ ...goblin2014, xp: 9999 });
    expect(m.xp).toBe(9999);
  });

  it('handles a monster with no immunities gracefully', () => {
    const { damage_immunities, condition_immunities, ...noImmunities } = goblin2014;
    const m = convertTo2024(noImmunities);
    expect(m.immunities).toBeUndefined();
  });

  it('handles a monster with only damage_immunities', () => {
    const { condition_immunities, ...dmgOnly } = goblin2014;
    const m = convertTo2024(dmgOnly);
    expect(m.immunities).toBe('poison');
  });

  it('handles a monster with only condition_immunities', () => {
    const { damage_immunities, ...condOnly } = goblin2014;
    const m = convertTo2024(condOnly);
    expect(m.immunities).toBe('poisoned');
  });

  it('handles missing stats array (no initiative added)', () => {
    const { stats, ...noStats } = goblin2014;
    const m = convertTo2024(noStats);
    expect(m.initiative).toBeUndefined();
  });

  it('throws on non-object input', () => {
    expect(() => convertTo2024(null)).toThrow();
    expect(() => convertTo2024('string')).toThrow();
    expect(() => convertTo2024(42)).toThrow();
  });

  it('processes bonus_actions correctly', () => {
    const m = convertTo2024({
      ...goblin2014,
      bonus_actions: [
        {
          name: 'Fury',
          desc: 'Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 3 (1d4 + 1) slashing damage.'
        }
      ]
    });
    expect(m.bonus_actions[0].desc).toMatch(/^Attack Roll:/);
  });

  it('processes reactions correctly', () => {
    const m = convertTo2024({
      ...goblin2014,
      reactions: [
        {
          name: 'Parry',
          desc: 'The goblin adds 2 to its AC against one melee attack that would hit it.'
        }
      ]
    });
    expect(m.reactions[0].desc).toBe(
      'The goblin adds 2 to its AC against one melee attack that would hit it.'
    );
  });

  it('processes legendary_actions correctly', () => {
    const m = convertTo2024({
      ...goblin2014,
      legendary_actions: [
        {
          name: 'Bite (Costs 2 Actions)',
          desc: 'Melee Weapon Attack: +8 to hit, reach 10 ft., one target. Hit: 17 (2d10 + 6) piercing damage.'
        }
      ]
    });
    expect(m.legendary_actions[0].desc).toMatch(/^Attack Roll:/);
  });
});
