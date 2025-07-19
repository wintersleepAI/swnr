# Unified Power & Magic Specification (v1.1 — *stored‑pool edition*)

*Applies to SWNR, WWN, CWN, AWN — Foundry VTT v13*

*Last compiled: 18 Jul 2025*

---

## 1  Design Principles

1. **One Item Class – ************************`power`************************.**  Every cast‑able or activatable ability is a `power` document.  Behaviour differences (Psychic, Art, Spell, Mutation…) are expressed through `subType` presets and a small set of resource flags.
2. **Resources live on the **************************actor**************************.**  Shared pools (Effort, Slots, Spell Points, System Strain, daily Uses) are persisted in `actor.system.pools` so macros, modules, and GMs can read or tweak them directly.  Items never guess totals.
3. **Flat schema, forward‑compatible.** Adding a new cost type just introduces another top‑level field (e.g. `psiPointCost`).  Future multi‑cost powers can add an array without breaking the current one.
4. **Cyberware separate.**  Cyberware keeps its own item class. 

---

## 2  `power` Schema (flat fields)

| Field                | Type / Enum                          | Notes                                                                                                                                          |                                         |
| -------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `subType`            | `psychic│art│adept│spell│mutation`   | Drives default preset & sheet partial                                                                                                          |                                         |
| `source`             | `string?`                            | Grouping label (e.g. *Elementalist*)                                                                                                           |                                         |
| `resourceName`       | `Effort│Slots│Points│Strain│Uses│""` | "" ⇒ passive ability                                                                                                                           |                                         |
| `subResource`        | `string ∣ number?`                   | Second pool key (e.g. `Necromancer`, `Lv 3`). Use **`"Unleveled"`** or an empty string for High‑Mage style slot pools that ignore spell level. |                                         |
| `resourceCost`       | `number`                             | 0 ⇒ commit only                                                                                                                                |                                         |
| `sharedResource`     | `boolean`                            | `true` uses actor pool; `false` uses `internalResource` only                                                                                   |                                         |
| `internalResource`   | `{value,max}`                        | Per‑item commit / charge counter                                                                                                               |                                         |
| `resourceLength`     | `commit│scene│day│rest│user`         | Refresh cadence                                                                                                                                |                                         |
| `userResourceLength` | same enum                            | Only shown when previous == `user`                                                                                                             |                                         |
| `level`              | `number?`                            | Spell level 1‑9; `undefined` for Effort powers                                                                                                 |                                         |
| `leveledResource`    | `boolean`                            | `true` → separate pool per spell level (`Slots:Lv1`, `Slots:Lv2` …). `false` → all spells draw from a single pool (High‑Mage, Adept heroic).   |                                         |
| `prepared`           | `boolean?`                           | For memorised spells                                                                                                                           |                                         |
| `strainCost`         | \`number                             | Fixed or selectable System Strain spend |
| `uses`               | `{value,max}`                        | Standalone daily/scene charges (AWN powers)                                                                                                    |                                         |

**Helper:** `resourceKey()` ⇒ `${resourceName}:${subResource??""}`.

---

## 3  Actor‑level Pools (persistent)

```js
// stored on actor.system.pools
{
  "Effort:Psychic":      { value:2, max:4, cadence:"scene" },
  "Effort:Elementalist": { value:0, max:3, cadence:"day"   },
  "Slots:Lv1":           { value:1, max:2, cadence:"day"   },
  "Slots:Lv3":           { value:0, max:1, cadence:"day"   },
  "Uses:Ashen Arsenal":  { value:0, max:1, cadence:"day"   }
}
```

### 3.1  Pool Build & Cache

* **Schema definition.**  In `actor.js` add

  ```js
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...super.defineSchema(),
      pools: new fields.ObjectField({
        /* key  = `${resourceName}:${subResource}`  */
        /* value = { value,max,cadence }           */
      })
    };
  }
  ```

  Keys are **not hard‑coded**; any `resourceName` / `subResource` pair written by a power will auto‑create the entry.
* **CONFIG‑driven enums.**  Default `resourceName` list lives in `CONFIG.SWN.poolResourceNames = ["Effort","Slots","Points","Strain","Uses"]`.  Modules or world settings may push their own strings to this array **at runtime** to add custom resource types (e.g. `"Mana"`).  The actor schema stays flexible because keys are just object properties.
* **Pool construction.**  On game load or migration iterate embedded powers with `sharedResource: true`; whenever a key is missing in `pools`, create it with `{value:0,max:0,cadence:power.resourceLength}` and then add the power’s `internalResource.*` figures.
* **Caching.**  Result stored on `actor._poolsCache`.  Invalidation hooks: `preCreateItem`, `preUpdateItem`, `preDeleteItem`, `power.use()`, and any GM override that patches `system.pools` directly.

### 3.2  Spending Algorithm (`power.use()`)

1. `const key = power.resourceKey(); /* e.g. "Slots:Lv1" */`
2. Lock mutex per actor.
3. **Read‑modify‑write** `actor.system.pools[key].value -= power.resourceCost` and, if needed, `power.internalResource.value++`.
4. If the pool key didn’t exist (edge case: GM just added a new resourceName in settings) the function auto‑seeds `{value:0,max:0}` first.
5. Apply `strainCost`.
6. Unlock, update actor, render chat.

### 3.3  Refresh Helpers

* `swnr.refreshScene()`, `swnr.refreshRest()` loop pools and zero `value` where `cadence` ≤ refresh tier.
* Emits hook `"swnrPoolsRefreshed"` for module authors.

---

## 4  Sheet UX

### 4.1  Item Sheets

* Handlebars partials keyed by `subType`. Hidden inputs when a field is `undefined` or unused.
* Dropdown preset selector auto‑fills fields for quick data entry.

### 4.2  Actor ▶ Powers Tab

* Runtime grouping: `resourceName → subResource` produces collapsible sections (Effort ▸ Psychic, Slots ▸ Lv 1…).
* Header badge shows **current / max**; clicking badge opens quick‑edit dialog to grant GM overrides.
* Drag‑sort remains inside its current section.

---

## 5  Migration Plan (medium risk)

0. **Backup**: rely on Foundry auto‑backup but also write `/world‑backups/power‑v1.json` snapshot.
1. Convert legacy `item.type === "power" && !subType` → `subType:"psychic"` + defaults.
2. Migrate old `actor.system.effort` → `pools["Effort:Psychic"]`.
3. For each world, run **dry‑run validator**; abort migration if any actor fails.
4. Log report; users can restore snapshot if needed.

---

## 6  Risk & Mitigation Summary

|  Risk                                            | Mitigation                                                                                                     |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Migration corruption                             | Step‑by‑step transform + dry‑run validation + auto‑backup                                                      |
| Race conditions on simultaneous casts            | Per‑actor mutex in `power.use()`                                                                               |
| Sheet lag on big NPCs                            | Pools cache; only rebuilt on item change                                                                       |
| Accidental mix of leveled + unleveled slot pools | Validation: on actor load, warn if both `Slots:LvN` **and** `Slots:Unleveled` exist; GM must choose one model. |
| UI complexity                                    | Feature‑flag advanced widgets; basic input first release                                                       |

## 7  Milestones

| Sprint  | Deliverables                                                                           |
| ------- | -------------------------------------------------------------------------------------- |
| **S‑1** | • Actor‑pool schema, migration & unit tests  • Item‑sheet partials and preset dropdown |
| **S‑2** | • Chat‑card refactor with mutex spend logic  • Refresh hooks and GM‑override dialog    |
| **S‑3** | • Compendium curation (free SRD powers)  • QA playtest & performance benchmarking      |

### Appendix A  Preset Map A  Preset Map

```js
CONFIG.SWN.powerPresets = {
  psychic:  { resourceName:"Effort", resourceCost:1, subResource:"Psychic", sharedResource:true, resourceLength:"scene" },
  art:      { resourceName:"Effort", resourceCost:1, subResource:"",       sharedResource:true, resourceLength:"day"   },
  adept:    { resourceName:"Effort", resourceCost:1, subResource:"Adept",  sharedResource:true, resourceLength:"day"   },
  spell:    { resourceName:"Slots",  resourceCost:1, leveledResource:true,  sharedResource:true, resourceLength:"day"   },
  mutation: { resourceName:"Uses",   resourceCost:0, subResource:"",       sharedResource:false,resourceLength:"day"   }
};
```

All presets are editable on the item sheet.

---

### Appendix B  QA Checklist

> Goal: guarantee that **actor‑level pools, casting flow, and migration** work on all supported game modes without data loss or perceptible lag.

| Category                  | Test                                                                                           | Pass Criteria                                                                                                       |
| ------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Migration**             | Run auto‑backup → dry‑run → live migrate on:• SWN‑only world• WWN mixed world• Legacy campaign | • No migration aborts • `actor.system.pools` exists on all actors • Log shows 0 warnings                            |
| **Casting & Spend**       | Fire 1 00 concurrent `power.use()` via macro                                                   | • No double‑spend • Mutex log shows 1 lock per actor                                                                |
| **Refresh Hooks**         | Call `swnr.refreshScene()` / `refreshRest()`                                                   | • All pools with cadence ≤ tier set to 0 • Chat card emitted                                                        |
| **Leveled vs Unleveled**  | Create Magister (Lv‑slots) & High‑Mage (unleveled)                                             | • Magister pools `Slots:LvN` unaffected by High‑Mage casts • Warning appears if both pool types added to same actor |
| **UI / Sheet**            | Open actor with 50 powers                                                                      | • `renderTime` ≤ 15 ms (debug metrics) • Badge values match actor pools                                             |
| **Performance Benchmark** | Profile `prepareDerivedData()` on 50‑power NPC                                                 | • Allocations < 1 MB, runtime < 10 ms                                                                               |
| **Module Compatibility**  | Test with popular SWN helper module                                                            | • No console errors • Module can read `actor.system.pools`                                                          |
| **Rollback**              | Restore world via Foundry auto‑backup                                                          | • World loads with pre‑migration data intact                                                                        |
