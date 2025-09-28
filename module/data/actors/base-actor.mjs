import SWNShared from '../shared.mjs';

export default class SWNActorBase extends foundry.abstract
  .TypeDataModel {
  static LOCALIZATION_PREFIXES = ["SWN.Actor.base"];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = {};

    schema.health = SWNShared.resourceField(10,10);
    schema.biography = new fields.HTMLField();
    schema.species = SWNShared.requiredString("");

    schema.access = SWNShared.resourceField(1,1); // CWN
    schema.traumaTarget = SWNShared.requiredNumber(6); // CWN
    schema.baseAc = SWNShared.requiredNumber(10);
    // schema.ac = SWNShared.requiredString("");
    schema.meleeAc = SWNShared.requiredNumber(10);
    schema.ab = SWNShared.requiredNumber(1);
    schema.meleeAb = SWNShared.requiredNumber(1);
    schema.systemStrain = new fields.SchemaField({
      value: SWNShared.requiredNumber(0),
      permanent: SWNShared.requiredNumber(0,-99)
    });
    schema.pools = new fields.ObjectField({
      /* Dynamic keys: "${resourceName}:${subResource}" */
      /* Values: { value, max, cadence } */
    });

    schema.effortCommitments = new fields.ObjectField({
      /* Dynamic keys: "${resourceName}:${subResource}" */
      /* Values: array of { powerId, powerName, amount, duration } */
    });

    schema.speed = SWNShared.requiredNumber(10);
    schema.cyberdecks = new fields.ArrayField(new fields.DocumentIdField()); 
    schema.health_max_modified = SWNShared.requiredNumber(0);
    return schema;
  }

  prepareDerivedData() {
    this.health.percentage = Math.clamp((this.health.value * 100) / this.health.max, 0, 100);
  }

  rollSave(_saveType) {
    console.log("rollSave call on base actor");
  }

  /**
   * Pool Helper: compute resource pools from feature items with poolsGranted
   * This consolidates shared logic used by Character and NPC data models.
   *
   * Options:
   * - parent: Actor document (required)
   * - dataModel: the actor data model (this) that holds `pools` (optional)
   * - evaluateCondition: function(string) => boolean
   * - evaluateFormula: function(string) => number
   * - includeCommitments: boolean (default true for all actors)
   *
   * Returns object keyed by poolKey with { value, max, cadence, committed?, commitments?, tempCommit, tempScene, tempDay }
   */
  calculatePoolsFromFeatures(options) {
    const {
      parent,
      dataModel = null,
      evaluateCondition = () => true,
      evaluateFormula = () => 0,
      includeCommitments = true,
    } = options || {};

    const pools = {};
    if (!parent) return pools;

    // Gather feature items that grant pools
    const poolGrantingItems = parent.items.filter((item) =>
      item.type === 'feature' && item.system.poolsGranted && item.system.poolsGranted.length > 0
    );

    for (const feature of poolGrantingItems) {
      for (const poolConfig of feature.system.poolsGranted) {
        // Conditional gating
        if (poolConfig.condition && !evaluateCondition(poolConfig.condition)) continue;

        const poolKey = `${poolConfig.resourceName}:${poolConfig.subResource || ''}`;

        // Compute base max from formula
        let maxValue = 0;
        if (poolConfig.formula) {
          try {
            maxValue = Math.max(0, Number(evaluateFormula(poolConfig.formula)) || 0);
          } catch (err) {
            console.warn(`[SWN Pool] Failed to evaluate formula "${poolConfig.formula}" for ${feature.name}:`, err);
            maxValue = 0;
          }
        } else {
          console.warn(`[SWN Pool] No formula provided for pool ${poolKey} in ${feature.name}`);
        }

        const sourcePoolData = parent._source?.system?.pools?.[poolKey] || {};

        if (pools[poolKey]) {
          // Merge with an already built pool from another feature
          const oldMax = pools[poolKey].max;
          const newBaseMax = Math.max(0, oldMax - ((pools[poolKey].tempCommit || 0) + (pools[poolKey].tempScene || 0) + (pools[poolKey].tempDay || 0))) + maxValue;

          const tempCommit = sourcePoolData?.tempCommit || 0;
          const tempScene = sourcePoolData?.tempScene || 0;
          const tempDay = sourcePoolData?.tempDay || 0;
          const totalTemp = tempCommit + tempScene + tempDay;

          const newMax = newBaseMax + totalTemp;

          // Preserve user-set current value if present, else preserve was-at-max behavior
          const userSetValue = sourcePoolData?.value;
          let newValue;
          if (userSetValue !== undefined) {
            newValue = Math.min(Number(userSetValue), newMax);
          } else {
            const wasAtMax = pools[poolKey].value >= pools[poolKey].max;
            const inc = Math.max(0, newMax - pools[poolKey].max);
            newValue = wasAtMax ? newMax : Math.min(pools[poolKey].value + inc, newMax);
          }

          pools[poolKey] = {
            ...pools[poolKey],
            value: newValue,
            max: newMax,
            tempCommit,
            tempScene,
            tempDay,
          };
        } else {
          // Create a new pool record
          const tempCommit = sourcePoolData?.tempCommit || 0;
          const tempScene = sourcePoolData?.tempScene || 0;
          const tempDay = sourcePoolData?.tempDay || 0;
          const totalTemp = tempCommit + tempScene + tempDay;

          const baseMax = Math.max(0, maxValue);
          const finalMax = baseMax + totalTemp;

          // Determine current value baseline
          const existingCurrentValue = sourcePoolData?.value;
          let finalValue;
          if (existingCurrentValue !== undefined) {
            // Stored value represents current available including prior temp modifiers.
            // Extract a base-current by removing current temp, then re-apply current temp.
            const inferredBase = Math.max(0, Number(existingCurrentValue) - totalTemp);
            const clampedBase = Math.min(inferredBase, baseMax);
            finalValue = Math.min(clampedBase + totalTemp, finalMax);
          } else if (includeCommitments) {
            // For Characters, subtract current committed effort to compute available
            const actorCommitments = parent.system?.effortCommitments || {};
            const commitments = actorCommitments[poolKey] || [];
            const committedAmount = commitments.reduce((sum, c) => sum + (c.amount || 0), 0);
            const baseCurrent = Math.max(0, baseMax - committedAmount);
            finalValue = Math.min(baseCurrent + totalTemp, finalMax);
          } else {
            // For NPCs (no commitments tracked), default to full
            finalValue = finalMax; // equals baseMax + totalTemp
          }

          const poolRecord = {
            value: finalValue,
            max: finalMax,
            cadence: poolConfig.cadence,
            tempCommit,
            tempScene,
            tempDay,
          };

          if (includeCommitments) {
            const actorCommitments = parent.system?.effortCommitments || {};
            const commitments = actorCommitments[poolKey] || [];
            const committedAmount = commitments.reduce((sum, c) => sum + (c.amount || 0), 0);
            poolRecord.committed = committedAmount;
            poolRecord.commitments = commitments;
          }

          pools[poolKey] = poolRecord;
        }
      }
    }

    return pools;
  }


}
