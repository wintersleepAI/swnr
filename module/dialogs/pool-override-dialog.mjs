/**
 * Pool Override Dialog for GM management of actor resource pools
 */
export default class PoolOverrideDialog extends Dialog {
  
  constructor(actor, options = {}) {
    const dialogData = {
      title: `Manage Pools: ${actor.name}`,
      content: "",
      buttons: {
        save: {
          icon: '<i class="fas fa-save"></i>',
          label: "Save Changes",
          callback: html => this.processChanges(html)
        },
        refresh: {
          icon: '<i class="fas fa-sync-alt"></i>',
          label: "Refresh All",
          callback: () => this.refreshAllPools()
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel"
        }
      },
      default: "save",
      close: () => {}
    };

    super(dialogData, options);
    
    this.actor = actor;
    this.originalPools = foundry.utils.deepClone(actor.system.pools || {});
    this.poolChanges = {};
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/swnr/templates/dialogs/pool-override.hbs",
      classes: ["swnr", "dialog", "pool-override"],
      width: 500,
      height: "auto",
      resizable: true
    });
  }

  async getData() {
    const pools = this.actor.system.pools || {};
    const poolList = [];

    // Convert pools object to array for template
    for (const [poolKey, poolData] of Object.entries(pools)) {
      const [resourceName, subResource] = poolKey.split(':');
      poolList.push({
        key: poolKey,
        resourceName,
        subResource: subResource || "Default",
        current: poolData.value,
        max: poolData.max,
        cadence: poolData.cadence,
        percentage: poolData.max > 0 ? Math.round((poolData.value / poolData.max) * 100) : 0
      });
    }

    // Sort pools by resource name then subResource
    poolList.sort((a, b) => {
      if (a.resourceName !== b.resourceName) {
        return a.resourceName.localeCompare(b.resourceName);
      }
      return a.subResource.localeCompare(b.subResource);
    });

    return {
      actor: this.actor,
      pools: poolList,
      hasNoPools: poolList.length === 0,
      poolResourceNames: CONFIG.SWN.poolResourceNames || ["Effort", "Slots", "Points", "Strain", "Uses"]
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Pool value change tracking
    html.find('.pool-current, .pool-max').on('input', this._onPoolValueChange.bind(this));
    
    // Quick set buttons
    html.find('.quick-set-zero').click(this._onQuickSetZero.bind(this));
    html.find('.quick-set-max').click(this._onQuickSetMax.bind(this));
    html.find('.quick-modify').click(this._onQuickModify.bind(this));
    
    // Add new pool button
    html.find('.add-pool').click(this._onAddPool.bind(this));
    
    // Remove pool button
    html.find('.remove-pool').click(this._onRemovePool.bind(this));

    // Validate inputs
    html.find('.pool-current, .pool-max').on('change', this._validateInput.bind(this));
  }

  _onPoolValueChange(event) {
    const input = event.currentTarget;
    const poolKey = input.closest('.pool-row').dataset.poolKey;
    const field = input.classList.contains('pool-current') ? 'current' : 'max';
    const value = parseInt(input.value) || 0;

    if (!this.poolChanges[poolKey]) {
      this.poolChanges[poolKey] = foundry.utils.deepClone(this.originalPools[poolKey]);
    }

    if (field === 'current') {
      this.poolChanges[poolKey].value = value;
    } else {
      this.poolChanges[poolKey].max = value;
    }

    // Update visual feedback
    this._updatePoolVisual(poolKey, input.closest('.pool-row'));
  }

  _onQuickSetZero(event) {
    const poolRow = event.currentTarget.closest('.pool-row');
    const currentInput = poolRow.querySelector('.pool-current');
    currentInput.value = 0;
    currentInput.dispatchEvent(new Event('input'));
  }

  _onQuickSetMax(event) {
    const poolRow = event.currentTarget.closest('.pool-row');
    const currentInput = poolRow.querySelector('.pool-current');
    const maxInput = poolRow.querySelector('.pool-max');
    currentInput.value = maxInput.value;
    currentInput.dispatchEvent(new Event('input'));
  }

  _onQuickModify(event) {
    const poolRow = event.currentTarget.closest('.pool-row');
    const currentInput = poolRow.querySelector('.pool-current');
    const modifier = parseInt(event.currentTarget.dataset.modifier) || 0;
    const newValue = Math.max(0, parseInt(currentInput.value) + modifier);
    currentInput.value = newValue;
    currentInput.dispatchEvent(new Event('input'));
  }

  async _onAddPool(event) {
    const html = this.element;
    
    // Simple prompt for new pool
    const resourceName = await this._promptForResourceName();
    if (!resourceName) return;

    const subResource = await this._promptForSubResource(resourceName);
    const poolKey = `${resourceName}:${subResource || ""}`;

    // Check if pool already exists
    if (this.originalPools[poolKey] || this.poolChanges[poolKey]) {
      ui.notifications.warn(`Pool ${poolKey} already exists`);
      return;
    }

    // Add new pool
    this.poolChanges[poolKey] = {
      value: 0,
      max: 1,
      cadence: "day"
    };

    // Refresh dialog
    this.render(true);
  }

  async _onRemovePool(event) {
    const poolKey = event.currentTarget.closest('.pool-row').dataset.poolKey;
    
    const confirm = await Dialog.confirm({
      title: "Remove Pool",
      content: `<p>Are you sure you want to remove the pool <strong>${poolKey}</strong>?</p>`,
      yes: () => true,
      no: () => false
    });

    if (confirm) {
      // Mark for deletion
      this.poolChanges[poolKey] = null;
      this.render(true);
    }
  }

  async _promptForResourceName() {
    return new Promise((resolve) => {
      const choices = CONFIG.SWN.poolResourceNames.reduce((obj, name) => {
        obj[name] = name;
        return obj;
      }, {});

      new Dialog({
        title: "Select Resource Type",
        content: `
          <form>
            <div class="form-group">
              <label>Resource Name:</label>
              <select name="resourceName">
                ${Object.entries(choices).map(([key, label]) => 
                  `<option value="${key}">${label}</option>`
                ).join('')}
              </select>
            </div>
          </form>
        `,
        buttons: {
          ok: {
            label: "OK",
            callback: html => resolve(html.find('[name="resourceName"]').val())
          },
          cancel: {
            label: "Cancel",
            callback: () => resolve(null)
          }
        },
        default: "ok"
      }).render(true);
    });
  }

  async _promptForSubResource(resourceName) {
    return new Promise((resolve) => {
      new Dialog({
        title: "Resource Sub-Type",
        content: `
          <form>
            <div class="form-group">
              <label>Sub-Resource (optional):</label>
              <input type="text" name="subResource" placeholder="e.g., Psychic, Lv1, Elementalist" />
              <p class="hint">Leave empty for default pool</p>
            </div>
          </form>
        `,
        buttons: {
          ok: {
            label: "OK",
            callback: html => resolve(html.find('[name="subResource"]').val().trim())
          },
          cancel: {
            label: "Cancel",
            callback: () => resolve(null)
          }
        },
        default: "ok"
      }).render(true);
    });
  }

  _validateInput(event) {
    const input = event.currentTarget;
    const value = parseInt(input.value);
    
    if (isNaN(value) || value < 0) {
      input.value = 0;
      input.dispatchEvent(new Event('input'));
    }
  }

  _updatePoolVisual(poolKey, poolRow) {
    const changes = this.poolChanges[poolKey];
    if (!changes) return;

    const currentSpan = poolRow.querySelector('.current-value');
    const maxSpan = poolRow.querySelector('.max-value');
    const progressBar = poolRow.querySelector('.pool-progress');

    if (currentSpan) currentSpan.textContent = changes.value;
    if (maxSpan) maxSpan.textContent = changes.max;
    
    if (progressBar) {
      const percentage = changes.max > 0 ? (changes.value / changes.max) * 100 : 0;
      progressBar.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
      
      // Color coding
      if (percentage <= 25) {
        progressBar.className = 'pool-progress low';
      } else if (percentage <= 50) {
        progressBar.className = 'pool-progress medium';
      } else {
        progressBar.className = 'pool-progress high';
      }
    }
  }

  async processChanges(html) {
    const updates = {};
    const newPools = foundry.utils.deepClone(this.originalPools);

    // Apply changes
    for (const [poolKey, changes] of Object.entries(this.poolChanges)) {
      if (changes === null) {
        // Remove pool
        delete newPools[poolKey];
      } else {
        // Update or add pool
        newPools[poolKey] = changes;
      }
    }

    // Update actor
    try {
      await this.actor.update({ "system.pools": newPools });
      
      ui.notifications.info(`Updated resource pools for ${this.actor.name}`);
      
      // Log audit trail
      console.log(`[SWN Pool Override] GM modified pools for ${this.actor.name}:`, {
        before: this.originalPools,
        after: newPools,
        changes: this.poolChanges
      });
      
    } catch (error) {
      console.error("Error updating actor pools:", error);
      ui.notifications.error("Failed to update actor pools");
    }
  }

  async refreshAllPools() {
    const confirm = await Dialog.confirm({
      title: "Refresh All Pools",
      content: `<p>This will restore all pools to their maximum values. Are you sure?</p>`,
      yes: () => true,
      no: () => false
    });

    if (confirm) {
      const pools = foundry.utils.deepClone(this.actor.system.pools || {});
      
      for (const poolData of Object.values(pools)) {
        poolData.value = poolData.max;
      }

      try {
        await this.actor.update({ "system.pools": pools });
        ui.notifications.info(`Refreshed all pools for ${this.actor.name}`);
        this.render(true);
      } catch (error) {
        console.error("Error refreshing pools:", error);
        ui.notifications.error("Failed to refresh pools");
      }
    }
  }

  /**
   * Static method to show pool override dialog
   * @param {Actor} actor - The actor to manage
   */
  static async show(actor) {
    return new PoolOverrideDialog(actor).render(true);
  }
}