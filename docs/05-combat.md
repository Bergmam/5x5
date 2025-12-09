# Combat (deterministic)

- No RNG in combat; every action resolves deterministically.
- Turn order: player action → every enemy on floor acts.
- Damage: flat multiples of 5. Minimum damage on any successful damaging action is 5.

Damage formula:
- RawAttack = WeaponDamage (for physical) or SpellDamage (for spells)
- FinalDamage = max(5, RawAttack - Target.Armor)

Examples:
- Weapon 15 vs Armor 5 → FinalDamage = 10
- Spell 20 vs Armor 10 → FinalDamage = 10
- Weapon 10 vs Armor 15 → FinalDamage = 5

All heals and mana costs are multiples of 5.
