---
# Example legacy D&D 2014-format Goblin note.
# Use this file to test the converter:
#   cd scripts && node convert-to-2024.js ../examples/goblin-2014.md
---

```statblock
name: Goblin
size: Small
type: Humanoid
subtype: goblinoid
alignment: Neutral Evil
ac: 15
hp: 7
hit_dice: 2d6
speed: 30 ft.
stats: [8, 14, 10, 10, 8, 8]
senses: "Darkvision 60 ft."
languages: "Common, Goblin"
cr: "1/4"
damage_immunities: poison
condition_immunities: poisoned
skillsaves:
  - Stealth: 6
traits:
  - name: Nimble Escape
    desc: >-
      The goblin can take the Disengage or Hide action as a bonus action on
      each of its turns.
actions:
  - name: Scimitar
    desc: >-
      Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5
      (1d6 + 2) slashing damage.
  - name: Shortbow
    desc: >-
      Ranged Weapon Attack: +4 to hit, range 80/320 ft., one target. Hit:
      5 (1d6 + 2) piercing damage.
```
