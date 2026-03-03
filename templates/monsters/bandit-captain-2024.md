---
# Obsidian note for a D&D 2024-format Bandit Captain.
# Demonstrates a humanoid monster with bonus actions, reactions, and gear.
# Rendered by the Fantasy Statblocks plugin using the "D&D 2024" layout.
---

```statblock
layout: "D&D 2024"
name: Bandit Captain
size: Medium
type: Humanoid
alignment: Any Non-Lawful Alignment
ac: 15
hp: 65
hit_dice: 10d8 + 20
speed: 30 ft.
stats: [15, 16, 14, 14, 11, 14]
proficiency_bonus: 3
initiative: "+3"
xp: 1800
cr: 2
senses: "Passive Perception 10"
languages: "Any two languages"
gear: "Studded Leather Armor, Scimitar, Dagger (×2)"
saves:
  - STR: 4
  - DEX: 5
  - WIS: 2
skillsaves:
  - Athletics: 4
  - Deception: 4
traits:
  - name: Pack Tactics
    desc: >-
      The captain has advantage on an attack roll against a creature if at
      least one of the captain's allies is within 5 ft. of the creature and
      the ally isn't incapacitated.
actions:
  - name: Multiattack
    desc: The captain makes three Scimitar attacks.
  - name: Scimitar
    desc: >-
      Attack Roll: +5, reach 5 ft. Hit: 6 (1d6 + 3) slashing damage.
  - name: Dagger
    desc: >-
      Attack Roll: +5, reach 5 ft. or range 20/60 ft. Hit: 5 (1d4 + 3)
      piercing damage.
bonus_actions:
  - name: Parry
    desc: >-
      The captain adds 3 to its AC against one melee attack that would hit
      it. To do so, the captain must see the attacker and be wielding a
      melee weapon.
reactions:
  - name: Redirect Attack
    desc: >-
      When a creature the captain can see targets it with an attack, the
      captain chooses another creature within 5 ft. of the captain. The two
      creatures swap places, and the chosen creature becomes the target
      instead.
```
