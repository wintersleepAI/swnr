# Unified Power & Magic Specification (v1.0 – Draft)

*Stars‑Without‑Number Revised & Compatible Games (WWN, CWN, AWN)*
*Last compiled: 18 Jul 2025*

---

## 1  Scope & Philosophy

* **One Item Class – `power`.**  All cast‑able / activatable abilities live in a single document to maximise code reuse and keep drag‑and‑drop simple for users.  Distinctions (psy‑discipline vs. Art vs. Spell) are conveyed by **`subType`** plus a handful of resource flags.
* **Resource‑First.**  Item logic knows *what* it spends (Effort, slots, points, System Strain, daily uses) and *how long* until refresh.  Presentation & rules text are secondary metadata.
* **Cyberware Out, Mutations Optional.**  Cyberware remains its own item because of constant System Strain cap & slot installs.  Mutations may use the same `power` class (subType `"mutation"`) when they behave like per‑scene abilities; purely passive mutations can stay in a separate `mutation` item if desired.
* **Forward‑compatibility.**  Adding Ashes Without Number, third‑party settings, or heroic spell‑point variants requires only new `subType` presets—no schema change.

---

## 2  `power` Schema

| Field                | Type                                                | Visible ‑ When                                                                    | Purpose & Notes                                                                                                                                            |
| -------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `subType`            | `"psychic"\|"art"\|"adept"\|"spell"\|"mutation"`    | Always                                                                            | Controls default presets & sheet partial.                                                                                                                  |
| `source`             | `string \| undefined`                               | Shown if *not* `undefined` or empty                                               | string used to group pooled resources (e.g. *Elementalist*, *Necromancer*, *Psychic*).  Empty string allows freeform entry; `undefined` hides the control. |
| `resourceName`       | `"Effort"\|"Slots"\|"Points"\|"Strain"\|"Uses"\|""` | Auto                                                                              | Label for the pool (**Effort**, **Spell Slots**, etc.).  "" means the power is passive.                                                                    |
| `subResource`        | `string \| number \| undefined`                     | Auto                                                                              | Second key used to partition a pool: tradition name, **spell level**, etc.                                                                                 |
| `sharedResource`     | `boolean`                                           | Auto                                                                              | `true` → look at actor‑level pool; `false` → use `internalResource` only.                                                                                  |
| `resourceCost`       | `number`                                            | Shown if >0                                                                       | Amount spent per use.  0 → commit‑only.                                                                                                                    |
| `internalResource`   | `{ value,max }`                                     | Shown if `sharedResource=false` **or** `resourceCost=0` but commits limited uses. | Per‑item charge counter (e.g. *Ashen Arsenal* 1 charge/day).                                                                                               |
| `resourceLength`     | `"none"\|"commit"\|"scene"\|"day"\|"rest"\|"user"`  | Auto                                                                              | When the pool refreshes.  `user` lets designer copy editable cadence from `userResourceLength`.                                                            |
| `userResourceLength` | same enum                                           | Shown if previous == "user"                                                       | Lets homebrew set a per‑item cadence.                                                                                                                      |
| `level`              | `number \| undefined`                               | Shown on spells                                                                   | Numeric spell level (1‑9).  `undefined` for Effort abilities.                                                                                              |
| `leveledResource`    | `boolean`                                           | Shown when `level!==undefined`                                                    | `true` → separate pool *per level*; `false` → single un‑leveled pool.                                                                                      |
| `prepared`           | `boolean \| undefined`                              | Shown on spells only                                                              | Spell memorisation toggle.                                                                                                                                 |
| `strainCost`         | `number \| number[]`                                | Shown if ≠0                                                                       | Fixed or selectable System Strain spend.                                                                                                                   |
| `uses`               | `{ value,max }`                                     | Shown if value defined                                                            | Alternate daily/scene charge counter that is independent of Effort/Slots (AWN Mutant powers).                                                              |

**Key calculated getter** – `resourceKey()` returns \`\`\`\`\${resourceName}:\${subResource??""}\`\`\` for pooling.

---

## 3  Actor Resource Pools

```js
// pseudo structure on actor.system.pools
{
  "Effort:Psychic":          { value: 2, max: 4, cadence:"scene" },
  "Effort:Elementalist":     { value: 0, max: 3, cadence:"day"  },
  "Slots:Lv1":               { value: 1, max: 2, cadence:"day"  },
  "Slots:Lv3":               { value: 0, max: 1, cadence:"day"  },
  "Points:Arcane":           { value: 5, max: 7, cadence:"rest" },
  "Uses:Ashen Arsenal":      { value: 0, max: 1, cadence:"day"  }
}
```

* **Building pools** (runs on actor create/update & game load):

  1. Group all embedded `power` items where `sharedResource=true` by `resourceKey()`.
  2. Sum their `internalResource.max` into pool `max`; sum `internalResource.value` for `value`.
  3. Set `cadence` from first item; warn on mismatches.
* **Spending**: `power.use()`

  1. Verify pool &/or internal capacity.
  2. Deduct `resourceCost`; increment `internalResource.value` if commit.
  3. Apply `strainCost` if any.
  4. Emit chat card.
* **Refresh hooks**: `refreshScene`, `refreshRest`, etc. traverse pools and zero `value` where cadence ≤ refresh tier.

---

## 4  Sheet UX Rules

### 4.1  Item Sheet Partial Matrix

| subType  | Shows Effort fields    | Shows Spell fields  | Shows Uses      | Shows Strain |
| -------- | ---------------------- | ------------------- | --------------- | ------------ |
| psychic  | ✔                      | ✖                   | ✖               | Optional     |
| art      | ✔                      | ✖                   | ✖               | Optional     |
| adept    | ✔                      | ✖                   | ✖               | Optional     |
| spell    | Depends (Slots/Points) | ✔ (level, prepared) | ✖               | Optional     |
| mutation | ✖ (cost=0)             | ✖                   | ✔ (AWN charges) | Optional     |

### 4.2  Actor Sheet – *Powers* Tab

* Collapsible sections generated at runtime from unique `resourceName` buckets (Effort ▸ Psychic, Effort ▸ Elementalist, Slots ▸ Lv 1…).
* Hover tooltip shows `%value% / %max%` and refresh cadence.
* Drag‑sort maintains original group order.

---

## 5  Migration Plan

1. **Detect old psychic item type** ➜ convert to `power` with `subType:"psychic"`, preset defaults (`resourceName:"Effort"`, cost 1).
2. **WWN worlds**: Arts & Spells already `power`; just add missing fields with defaults.
4. **Backup** embedded JSON before patch; on failure, restore and report IDs.

---

## 6  Open Questions / TODO

* UI/UX improvements and consolidations to support new features.

---

## 7  Milestone Board

| Sprint | Epic                               |
| ------ | ---------------------------------- | 
| S‑1    | Schema + migration scaffold        |
| S‑1    | Actor pool helpers & refresh hooks | 
| S‑2    | Item sheet dynamic partials        | 
| S‑2    | Chat‑card refactor + cost selector |
| S‑3    | Compendium curation (free content) |
| S‑3    | QA playtest scripts & docs         |

---

### Appendix A – Preset Tables

```js
CONFIG.SWN.powerPresets = {
  psychic:  { resourceName:"Effort",  resourceCost:1, subResource:"Psychic",   sharedResource:true,  resourceLength:"scene" },
  art:      { resourceName:"Effort",  resourceCost:1, subResource:"",          sharedResource:true,  resourceLength:"day"  },
  adept:    { resourceName:"Effort",  resourceCost:1, subResource:"Adept",    sharedResource:true,  resourceLength:"day"  },
  spell:    { resourceName:"Slots",   resourceCost:1, leveledResource:true,    sharedResource:true,  resourceLength:"day"  },
  mutation: { resourceName:"Uses",    resourceCost:0, subResource:"",          sharedResource:false, resourceLength:"day"  }
};
```

All presets are overridable on the item sheet. 

