/**
 * Pool Override Dialog for GM management of actor resource pools
 */
export default class PoolOverrideDialog extends Dialog {
  
  constructor(actor, options = {}) {
    // Store references before calling super
    const actorRef = actor;
    
    const dialogData = {
      title: `Manage Pools: ${actor.name}`,
      content: "",
      buttons: {
        save: {
          icon: '<i class="fas fa-save"></i>',
          label: "Save Changes",
          callback: (html) => {
            console.log('[SWN Pool] Save button clicked');
            // Use arrow function to preserve 'this' context
            return this.processChanges.call(this, html);
          }
        },
        refresh: {
          icon: '<i class="fas fa-sync-alt"></i>',
          label: "Refresh All",
          callback: () => {
            console.log('[SWN Pool] Refresh button clicked');
            return this.refreshAllPools.call(this);
          }
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
    
    this.actor = actorRef;
    this.originalPools = foundry.utils.deepClone(actorRef.system.pools || {});
    this.poolChanges = {};
    
    console.log('[SWN Pool] Dialog created for actor:', this.actor.name);
    console.log('[SWN Pool] Original pools:', this.originalPools);
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

    // Convert pools object to array for template, incorporating any pending changes
    for (const [poolKey, poolData] of Object.entries(pools)) {
      // Skip pools marked for deletion
      if (this.poolChanges[poolKey] === null) continue;
      
      const [resourceName, subResource] = poolKey.split(':');
      // Use changed values if available, otherwise original values
      const currentData = this.poolChanges[poolKey] || poolData;
      
      poolList.push({
        key: poolKey,
        resourceName,
        subResource: subResource || "Default",
        current: currentData.value,
        max: currentData.max,
        cadence: currentData.cadence,
        percentage: currentData.max > 0 ? Math.round((currentData.value / currentData.max) * 100) : 0
      });
    }
    
    // Add any new pools from changes
    for (const [poolKey, poolData] of Object.entries(this.poolChanges)) {
      // Skip deleted pools and existing pools
      if (poolData === null || pools[poolKey]) continue;
      
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

    // Pool value change tracking - use both input and change events
    html.find('.pool-current, .pool-max').on('input change', this._onPoolValueChange.bind(this));
    
    // Quick set buttons
    html.find('.quick-set-zero').click(this._onQuickSetZero.bind(this));
    html.find('.quick-set-max').click(this._onQuickSetMax.bind(this));
    html.find('.quick-modify').click(this._onQuickModify.bind(this));
    
    // Add new pool button
    html.find('.add-pool').click(this._onAddPool.bind(this));
    
    // Remove pool button
    html.find('.remove-pool').click(this._onRemovePool.bind(this));

    // Validate inputs
    html.find('.pool-current, .pool-max').on('blur', this._validateInput.bind(this));
    
    // Override dialog button handlers to ensure proper context
    html.closest('.dialog').find('.dialog-button[data-button=\"save\"]').off('click').on('click', (event) => {
      event.preventDefault();
      console.log('[SWN Pool] Manual save button clicked');
      this.processChanges(html);
      this.close();
    });
    
    html.closest('.dialog').find('.dialog-button[data-button=\"refresh\"]').off('click').on('click', (event) => {
      event.preventDefault();
      console.log('[SWN Pool] Manual refresh button clicked');
      this.refreshAllPools();
    });
    
    // Initial sync to ensure form fields match data
    this._syncFormFields();
  }

  _onPoolValueChange(event) {
    const input = event.currentTarget;
    const poolKey = input.closest('.pool-row').dataset.poolKey;
    const field = input.classList.contains('pool-current') ? 'current' : 'max';
    const value = parseInt(input.value) || 0;
    
    console.log(`[SWN Pool] Field change: ${poolKey}.${field} = ${value}`);

    // Ensure we have a baseline to work from
    if (!this.poolChanges[poolKey]) {
      const basePool = this.originalPools[poolKey] || { value: 0, max: 1, cadence: "day" };
      this.poolChanges[poolKey] = foundry.utils.deepClone(basePool);
      console.log(`[SWN Pool] Initialized changes for ${poolKey}:`, this.poolChanges[poolKey]);
    }

    // Update the change tracking
    if (field === 'current') {
      this.poolChanges[poolKey].value = value;
    } else {
      this.poolChanges[poolKey].max = value;
      // If max changes, ensure current doesn't exceed it
      if (this.poolChanges[poolKey].value > value) {
        this.poolChanges[poolKey].value = value;
        // Update the current field in the DOM to reflect this
        const currentField = input.closest('.pool-row').querySelector('.pool-current');
        if (currentField) {
          currentField.value = value;
        }
      }
    }
    
    console.log(`[SWN Pool] Updated changes for ${poolKey}:`, this.poolChanges[poolKey]);
    console.log(`[SWN Pool] All changes:`, this.poolChanges);

    // Update visual feedback immediately
    this._updatePoolVisual(poolKey, input.closest('.pool-row'));
    
    // Sync all form fields to ensure consistency
    this._syncFormFields();
  }

  _onQuickSetZero(event) {
    const poolRow = event.currentTarget.closest('.pool-row');
    const currentInput = poolRow.querySelector('.pool-current');
    currentInput.value = 0;
    // Trigger both input and change events to ensure proper handling
    $(currentInput).trigger('input').trigger('change');
  }

  _onQuickSetMax(event) {
    const poolRow = event.currentTarget.closest('.pool-row');
    const currentInput = poolRow.querySelector('.pool-current');
    const maxInput = poolRow.querySelector('.pool-max');
    currentInput.value = maxInput.value;
    // Trigger both input and change events to ensure proper handling
    $(currentInput).trigger('input').trigger('change');
  }

  _onQuickModify(event) {
    const poolRow = event.currentTarget.closest('.pool-row');
    const currentInput = poolRow.querySelector('.pool-current');
    const modifier = parseInt(event.currentTarget.dataset.modifier) || 0;
    const currentValue = parseInt(currentInput.value) || 0;
    const newValue = Math.max(0, currentValue + modifier);
    
    // Also respect max value constraint
    const maxInput = poolRow.querySelector('.pool-max');
    const maxValue = parseInt(maxInput.value) || 1;
    const constrainedValue = Math.min(newValue, maxValue);
    
    currentInput.value = constrainedValue;
    // Trigger both input and change events to ensure proper handling
    $(currentInput).trigger('input').trigger('change');
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

    // Refresh dialog to show new pool
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
      // Refresh dialog to hide removed pool
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
      // Trigger change to update internal state
      $(input).trigger('input');
    }
  }

  _updatePoolVisual(poolKey, poolRow) {
    const changes = this.poolChanges[poolKey];
    if (!changes) return;

    const currentSpan = poolRow.querySelector('.current-value');
    const maxSpan = poolRow.querySelector('.max-value');
    const progressBar = poolRow.querySelector('.pool-progress');
    const percentageSpan = poolRow.querySelector('.percentage');

    // Update display values
    if (currentSpan) currentSpan.textContent = changes.value;
    if (maxSpan) maxSpan.textContent = changes.max;
    
    // Update progress bar
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
    
    // Update percentage display
    if (percentageSpan) {
      const percentage = changes.max > 0 ? Math.round((changes.value / changes.max) * 100) : 0;
      percentageSpan.textContent = `${percentage}%`;
    }
  }
  
  /**
   * Sync form fields with current change state to prevent field value desync
   */
  _syncFormFields() {
    for (const [poolKey, changes] of Object.entries(this.poolChanges)) {
      const poolRow = this.element.find(`[data-pool-key="${poolKey}"]`);
      if (!poolRow.length || !changes) continue;
      
      const currentInput = poolRow.find('.pool-current');
      const maxInput = poolRow.find('.pool-max');
      
      // Only update if values differ to avoid cursor issues
      if (currentInput.length && currentInput.val() != changes.value) {
        currentInput.val(changes.value);
      }
      
      if (maxInput.length && maxInput.val() != changes.max) {
        maxInput.val(changes.max);
      }
    }
  }
  
  /**
   * Collect changes directly from form fields (backup method)
   */
  _collectFormChanges(html) {
    const poolRows = html.find('.pool-row');
    poolRows.each((i, row) => {
      const $row = $(row);
      const poolKey = $row.data('pool-key');
      if (!poolKey) return;
      
      const currentInput = $row.find('.pool-current');
      const maxInput = $row.find('.pool-max');
      
      if (currentInput.length && maxInput.length) {
        const currentValue = parseInt(currentInput.val()) || 0;
        const maxValue = parseInt(maxInput.val()) || 1;
        
        // Check if values differ from original
        const originalData = this.originalPools[poolKey];
        if (originalData && (currentValue !== originalData.value || maxValue !== originalData.max)) {
          if (!this.poolChanges[poolKey]) {
            this.poolChanges[poolKey] = foundry.utils.deepClone(originalData);
          }
          // Only update the specific fields that changed
          this.poolChanges[poolKey].value = currentValue;
          this.poolChanges[poolKey].max = maxValue;
          console.log(`[SWN Pool] Collected change for ${poolKey}:`, this.poolChanges[poolKey]);
        }
      }
    });
  }

  async processChanges(html) {
    console.log('[SWN Pool] processChanges called with changes:', this.poolChanges);
    console.log('[SWN Pool] Original pools:', this.originalPools);
    
    // Also collect any changes directly from the form fields as a backup
    this._collectFormChanges(html);
    console.log('[SWN Pool] After collecting form changes:', this.poolChanges);
    
    // If no changes, nothing to do
    if (Object.keys(this.poolChanges).length === 0) {
      console.log('[SWN Pool] No changes to save');
      ui.notifications.info('No changes to save');
      return;
    }
    
    const newPools = foundry.utils.deepClone(this.originalPools);
    console.log('[SWN Pool] Starting with pools:', newPools);

    // Apply changes
    for (const [poolKey, changes] of Object.entries(this.poolChanges)) {
      console.log(`[SWN Pool] Processing change for ${poolKey}:`, changes);
      if (changes === null) {
        // Remove pool
        delete newPools[poolKey];
        console.log(`[SWN Pool] Removed pool ${poolKey}`);
      } else {
        // Update or add pool
        newPools[poolKey] = changes;
        console.log(`[SWN Pool] Updated pool ${poolKey}:`, changes);
      }
    }
    
    console.log('[SWN Pool] Final pools for update:', newPools);

    // Update actor
    try {
      const updateResult = await this.actor.update({ "system.pools": newPools });
      console.log('[SWN Pool] Actor update result:', updateResult);
      console.log('[SWN Pool] Actor pools after update:', this.actor.system.pools);
      
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
      throw error;
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