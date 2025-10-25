/**
 * Container Helper
 * Handles all container-related functionality for the SWNR system
 */
export class ContainerHelper {
  
  /**
   * Check if an item can be dropped into a container
   * @param {Item} container - The container item
   * @param {Item} item - The item being dropped
   * @returns {Object} - {canDrop: boolean, reason?: string}
   */
  static canDropIntoContainer(container, item) {
    // Can't drop into self
    if (container.id === item.id) {
      return { canDrop: false, reason: "Cannot drop item into itself" };
    }

    // Can only drop into containers
    if (!container.system.container?.isContainer) {
      return { canDrop: false, reason: "Target is not a container" };
    }

    // Container must be open
    if (!container.system.container?.isOpen) {
      return { canDrop: false, reason: "Container is closed" };
    }

    // Can't drop containers into other containers (prevent nesting for now)
    if (item.system.container?.isContainer) {
      return { canDrop: false, reason: "Cannot place containers inside other containers" };
    }

    // Only allow physical items that can be carried (gear, weapons, armor)
    const allowedTypes = ['item', 'weapon', 'armor'];
    if (!allowedTypes.includes(item.type)) {
      return { canDrop: false, reason: `Cannot place ${item.type} items in containers` };
    }

    // Check capacity
    const currentCapacity = container.system.container.capacity.value;
    const maxCapacity = container.system.container.capacity.max;
    const itemEncumbrance = item.system.encumbrance || 0;

    if (currentCapacity + itemEncumbrance > maxCapacity) {
      return { canDrop: false, reason: `Insufficient capacity (${currentCapacity + itemEncumbrance}/${maxCapacity})` };
    }

    return { canDrop: true };
  }

  /**
   * Add an item to a container
   * @param {Item} container - The container item
   * @param {Item} item - The item being added
   * @returns {Promise<void>}
   */
  static async addItemToContainer(container, item) {
    const check = this.canDropIntoContainer(container, item);
    if (!check.canDrop) {
      ui.notifications.warn(check.reason);
      return false;
    }

    const itemEncumbrance = item.system.encumbrance || 0;
    const newCapacityValue = container.system.container.capacity.value + itemEncumbrance;

    // Update container capacity, item containerId, and inherit container's location
    await Promise.all([
      container.update({ "system.container.capacity.value": newCapacityValue }),
      item.update({ 
        "system.containerId": container.id,
        "system.location": container.system.location
      })
    ]);

    ui.notifications.info(`${item.name} placed in ${container.name}`);
    return true;
  }

  /**
   * Remove an item from a container
   * @param {Item} item - The item being removed
   * @param {string} newLocation - Optional new location for the item (defaults to "stowed")
   * @returns {Promise<void>}
   */
  static async removeItemFromContainer(item, newLocation = "stowed") {
    const containerId = item.system.containerId;
    if (!containerId) return;

    const container = item.parent.items.get(containerId);
    if (!container) {
      // Container doesn't exist, just clear the containerId and set location
      await item.update({ 
        "system.containerId": "",
        "system.location": newLocation
      });
      return;
    }

    const itemEncumbrance = item.system.encumbrance || 0;
    const newCapacityValue = Math.max(0, container.system.container.capacity.value - itemEncumbrance);

    // Update container capacity, clear item containerId, and set new location
    await Promise.all([
      container.update({ "system.container.capacity.value": newCapacityValue }),
      item.update({ 
        "system.containerId": "",
        "system.location": newLocation
      })
    ]);

    ui.notifications.info(`${item.name} removed from ${container.name}`);
  }

  /**
   * Get all items contained within a container
   * @param {Item} container - The container item
   * @returns {Array<Item>} - Array of contained items
   */
  static getContainedItems(container) {
    if (!container.parent) return [];
    
    return container.parent.items.filter(item => 
      item.system.containerId === container.id
    );
  }

  /**
   * Recalculate container capacity based on contained items
   * @param {Item} container - The container item
   * @returns {Promise<void>}
   */
  static async recalculateCapacity(container) {
    const containedItems = this.getContainedItems(container);
    const totalEncumbrance = containedItems.reduce((sum, item) => 
      sum + (item.system.encumbrance || 0), 0
    );

    await container.update({ "system.container.capacity.value": totalEncumbrance });
  }

  /**
   * Check if a drop target is a container in the items list
   * @param {HTMLElement} target - The drop target element
   * @returns {Object|null} - Container info or null
   */
  static getDropTargetContainer(target) {
    // Ensure target is valid
    if (!target || typeof target.closest !== 'function') return null;
    
    // Look for container item row
    const containerRow = target.closest('.item[data-item-id]');
    if (!containerRow) return null;

    const itemId = containerRow.dataset.itemId;
    if (!itemId) return null;

    // Check if this is in the containers section (has container toggle icon)
    const hasContainerToggle = containerRow.querySelector('.container-toggle');
    if (!hasContainerToggle) return null;

    return { itemId, element: containerRow };
  }

  /**
   * Handle drag over events for containers
   * @param {DragEvent} event - The drag event
   * @param {HTMLElement} target - The drop target
   */
  static handleContainerDragOver(event, target) {
    const containerInfo = this.getDropTargetContainer(target);
    if (containerInfo) {
      event.preventDefault();
      containerInfo.element.classList.add('drop-target');
    }
  }

  /**
   * Handle drag leave events for containers
   * @param {DragEvent} event - The drag event
   * @param {HTMLElement} target - The drop target
   */
  static handleContainerDragLeave(event, target) {
    const containerInfo = this.getDropTargetContainer(target);
    if (containerInfo) {
      containerInfo.element.classList.remove('drop-target');
    }
  }

  /**
   * Update all contained items' locations when container location changes
   * @param {Item} container - The container item
   * @param {string} newLocation - The new location for the container
   * @returns {Promise<void>}
   */
  static async updateContainedItemsLocation(container, newLocation) {
    const containedItems = this.getContainedItems(container);
    if (containedItems.length === 0) return;

    const updates = containedItems.map(item => ({
      _id: item.id,
      "system.location": newLocation
    }));

    await container.parent.updateEmbeddedDocuments('Item', updates);
  }
}