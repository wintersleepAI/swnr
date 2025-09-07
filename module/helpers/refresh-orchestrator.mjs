// Orchestrator for refresh flows: applies HP/strain updates, delegates pool refresh,
// and creates appropriate chat summaries. Keeps engine helpers data-focused.

import {
  refreshActorPools,
  getCadenceLevel,
} from './refresh-helpers.mjs';

/**
 * Refresh a single actor by cadence with optional frail rest.
 * Handles HP/strain (characters), HP=max on NPC day, delegates pool/uses refresh,
 * and creates a per-actor chat message.
 * @param {Object} options
 * @param {Actor} options.actor - The actor to refresh
 * @param {'scene'|'day'} options.cadence - Refresh cadence
 * @param {boolean} [options.frail=false] - If true on day cadence, character recovers no HP
 * @param {boolean} [options.createChat=true] - Create a per-actor chat message
 */
export async function refreshActor({ actor, cadence, frail = false, createChat = true } = {}) {
  if (!actor) throw new Error('refreshActor: actor is required');
  const cadenceLevel = CONFIG.SWN.poolCadences.indexOf(cadence);
  if (cadenceLevel < 0) throw new Error(`refreshActor: invalid cadence ${cadence}`);

  // 1) Actor-level updates (HP/strain for characters; HP=max for NPC on day)
  const actorUpdates = {};

  if (actor.type === 'character' && cadence === 'day') {
    const sys = actor.system;
    const oldHP = sys.health.value;
    const oldStrain = sys.systemStrain.value;
    const newStrain = Math.max(oldStrain - 1, 0);
    const newHP = frail ? oldHP : Math.min(oldHP + sys.level.value, sys.health.max);
    actorUpdates['system.systemStrain.value'] = newStrain;
    actorUpdates['system.health.value'] = newHP;
  }

  if (actor.type === 'npc' && cadence === 'day') {
    const newHP = actor.system.health.max;
    actorUpdates['system.health.value'] = newHP;
  }

  if (Object.keys(actorUpdates).length > 0) {
    await actor.update(actorUpdates);
  }

  // 2) Delegate to engine to refresh pools, commitments, power uses, and prepared powers (day)
  const engineResult = await refreshActorPools(actor, cadenceLevel);

  // 3) Per-actor chat
  if (createChat) {
    const chatMessage = getDocumentClass('ChatMessage');
    const title = cadence === 'scene'
      ? (game.i18n.localize('swnr.pools.refreshSummary.scene') || 'End of Scene')
      : (frail
          ? (game.i18n.localize('swnr.pools.refreshSummary.frailRest') || 'Frail Rest')
          : (game.i18n.localize('swnr.pools.refreshSummary.day') || 'Rest for the Night'));

    const sys = actor.system;
    const hpStr = (actor.type === 'character' && cadence === 'day')
      ? `<p><strong>${game.i18n.localize('SWN.Health') || 'Health'}:</strong> ${sys.health.value}/${sys.health.max}</p>`
      : '';

    const poolsRef = engineResult.poolsRefreshed || 0;
    const unprepared = engineResult.preparedPowersUnprepared || 0;

    let details = '';
    if (poolsRef > 0) details += `<li>${poolsRef} pools refreshed</li>`;
    if (unprepared > 0 && cadence === 'day') details += `<li>${unprepared} powers unprepared</li>`;
    if ((engineResult.effortReleased || []).length > 0) {
      details += `<li>${engineResult.effortReleased.length} commitments released</li>`;
    }

    const content = `<div class="refresh-summary">
      <h3><i class="fas fa-sync"></i> ${title}</h3>
      ${hpStr}
      <ul>${details}</ul>
    </div>`;

    await chatMessage.create({
      speaker: chatMessage.getSpeaker({ actor }),
      content
    });
  }

  return engineResult;
}

/**
 * Refresh many actors for a cadence and create a GM summary chat.
 * @param {Object} options
 * @param {'scene'|'day'} options.cadence
 * @param {Actor[]} [options.actors] - If omitted, refresh all non-faction actors
 */
export async function refreshMany({ cadence, actors = null } = {}) {
  const cadenceLevel = CONFIG.SWN.poolCadences.indexOf(cadence);
  if (cadenceLevel < 0) throw new Error(`refreshMany: invalid cadence ${cadence}`);

  const actorsToRefresh = actors || game.actors.filter(a => a.type !== 'faction');
  const results = [];

  for (const actor of actorsToRefresh) {
    try {
      const res = await refreshActor({ actor, cadence, createChat: false });
      results.push({ actorId: actor.id, actorName: actor.name, success: true, ...res });
    } catch (err) {
      console.error('[SWN Refresh] Error refreshing actor', actor.name, err);
      results.push({ actorId: actor.id, actorName: actor.name, success: false, error: err?.message });
    }
  }

  // GM summary chat
  const chatMessage = getDocumentClass('ChatMessage');
  const successful = results.filter(r => r.success);
  const totalPools = successful.reduce((s, r) => s + (r.poolsRefreshed || 0), 0);
  const totalUnprep = successful.reduce((s, r) => s + (r.preparedPowersUnprepared || 0), 0);

  let content = `<div class="chat-card refresh-summary">`;
  content += `<h3><i class="fas fa-sync-alt"></i> ${game.i18n.localize(`swnr.pools.refreshSummary.${cadence}`) || (cadence === 'scene' ? 'Scene Refresh' : 'Day Refresh')}</h3>`;
  if (totalPools > 0) content += `<p>Refreshed ${totalPools} resource pools across ${successful.length} actors.</p>`;
  if (totalUnprep > 0 && cadence === 'day') content += `<p>Unprepared ${totalUnprep} prepared powers (rest for the day).</p>`;
  if (successful.length <= 5) {
    content += `<ul>`;
    for (const r of successful) {
      const parts = [];
      if (r.poolsRefreshed > 0) parts.push(`${r.poolsRefreshed} pools refreshed`);
      if (r.preparedPowersUnprepared > 0) parts.push(`${r.preparedPowersUnprepared} powers unprepared`);
      if (parts.length) content += `<li><strong>${r.actorName}</strong>: ${parts.join(', ')}</li>`;
    }
    content += `</ul>`;
  }
  content += `</div>`;

  await chatMessage.create({
    speaker: { alias: 'System' },
    content,
    whisper: game.users.filter(u => u.isGM).map(u => u.id)
  });

  return { cadence, actorsRefreshed: actorsToRefresh.length, results };
}

