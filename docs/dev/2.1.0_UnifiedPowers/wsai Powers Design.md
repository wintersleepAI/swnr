

| Property | Label | Type | User Editable | Description |
| :---- | :---- | :---- | :---- | :---- |
| type |  | ‘art’ | ‘cyberware’ | ‘mutation’ | ‘psychic’ | ‘spell’ |  | What type of power is it?  |
| source |  | string | “” |  | This is used to denote the source of a power. This can be used to create a variety of resource pools, further organize power subtypes by source, and so on. A common value for this property would be the character class that grants the power. If the initial subtype value for this property is an empty string, show the field to the user. If it is undefined, hide the field. |
| consumes1 |  | Consumes struct (below) | none |  | The first optional consumes for the power |
| consumes1On |  | always | button | none |  | How does this trigger (on click or button in log)?  |
| consumes2 |  | Consumes struct (below) | none |  | The second optional consumes for the power |
| consumes2On |  | always | button | none |  | How does this trigger (on click or button in log)?  |
| consumes.type |  | sourceLevel |  sourceEffortDay | sourceEffortScene| sourceEffortCurrent |sourceEffortDialog | spellPoints | systemStrain |  consumableItem | uses |  | What gets consumed:**sourceLevel**: a per level pool per source**sourceEffortX**: effort per source pool (dialog is popup)**spellPoints**: a global shared resource for the character \- determined by usesCost**systemStrain**: addToStrain \- determined by usesCost**consumableItem**: uses an associated item (needs an ID field)**uses** \- a per power use counter/tracker |
| consumes.usesCost |  | number |  | Used for spellPoints, strain, consumableItem, sourceLevel |
| consumes.uses |  | {  value: number,   max: number} |  | Show if consumes.type \== uses |
| consumes.usesRests |  | day | scene | none  |  | Show if consumes.type \== uses. Determines if the uses resets to max value |
| level |  | number | undefined |  | This denotes the level of a spell and is unused on most subtypes. If undefined, do not show. See **Creating Resource Pools**. |
| prepared |  | boolean | undefined |  | This is used only by spells to denote whether a spell is memorized. When undefined, do not show on the sheet. Otherwise, a toggle is shown to the user on the actor sheet. In theory, this would interact with some *prepared* attribute on the actor to track current/max prepared spells and the like. |

Sample powers

**Name: Ballistic Calculator**  
**Type:** mutation  
**Source:** cognition  
**Consumes1:**  (systemStrain, 1\)  
**Consumes1On:** always  
**Consumes2:** (uses, 1, 1/1, scene)  
**Consumes2On:** always  
**Level:** n/a  
**Prepared:** n/a

---

**Name:** Accelerated Perception  
**Type:** mutation  
**Source:** sense  
**Consumes1:** (systemStrain, 1\)  
**Consumes1On:** always  
**Consumes2:** (uses, 1, 1/1, day)  
**Consumes2On:** always  
**Level:** n/a  
**Prepared:** n/a

---

**Name:** Fortune’s Store (Greater)  
**Type:** psychic  
**Source:** mentalist  
**Consumes1:** (systemStrain, 1\)  
**Consumes1On:** always  
**Consumes2:** sourceEffortDay  
**Consumes2On:** always  
**Level:** n/a  
**Prepared:** n/a

---

**Name:** The Coruscating Coffin  
**Type:** spell  
**Source:** high  
**Consumes1:** (spellPoints, 1\)  
**Consumes1On:** always  
**Consumes2:** none  
**Consumes2On:** none  
**Level:** n/a  
**Prepared:** n/a

---

**Name:** The Coruscating Coffin  
**Type:** spell  
**Source:** high  
**Consumes1:** (spellPoints, 1\)  
**Consumes1On:** always  
**Consumes2:** none  
**Consumes2On:** none  
**Level:** n/a  
**Prepared:** false

---

