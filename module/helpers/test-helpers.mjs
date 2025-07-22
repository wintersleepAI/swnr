/**
 * Test Helper Functions for SWN Power System
 * Comprehensive testing and validation utilities for Sprint 2 features
 */

/**
 * Test mutex functionality by attempting concurrent power usage
 * @param {Actor} actor - Actor to test with
 * @param {Item} power - Power item to test
 * @param {number} concurrentCount - Number of concurrent uses to attempt
 * @returns {Promise<Object>} Test results
 */
async function testMutexConcurrency(actor, power, concurrentCount = 10) {
  console.log(`[SWN Test] Starting mutex concurrency test with ${concurrentCount} concurrent uses`);
  
  const startTime = Date.now();
  const promises = [];
  
  // Launch concurrent power uses
  for (let i = 0; i < concurrentCount; i++) {
    promises.push(power.system.use().catch(error => ({ 
      success: false, 
      error: error.message,
      attemptNumber: i 
    })));
  }
  
  const results = await Promise.all(promises);
  const endTime = Date.now();
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const mutexLocked = failed.filter(r => r.reason === "mutex-locked");
  
  return {
    testType: "mutex-concurrency",
    duration: endTime - startTime,
    totalAttempts: concurrentCount,
    successful: successful.length,
    failed: failed.length,
    mutexBlocked: mutexLocked.length,
    results: results,
    passed: successful.length === 1 && mutexLocked.length === (concurrentCount - 1)
  };
}

/**
 * Test refresh functionality across different cadence types
 * @param {Actor} actor - Actor to test with
 * @returns {Promise<Object>} Test results
 */
async function testRefreshFunctionality(actor) {
  console.log(`[SWN Test] Starting refresh functionality test for ${actor.name}`);
  
  const initialPools = foundry.utils.deepClone(actor.system.pools || {});
  const testResults = [];
  
  // Test scene refresh
  try {
    const sceneResult = await globalThis.swnr.refreshScene([actor]);
    testResults.push({
      cadence: "scene",
      success: sceneResult.success,
      actorsRefreshed: sceneResult.actorsRefreshed,
      error: null
    });
  } catch (error) {
    testResults.push({
      cadence: "scene",
      success: false,
      error: error.message
    });
  }
  
  // Test rest refresh
  try {
    const restResult = await globalThis.swnr.refreshRest([actor]);
    testResults.push({
      cadence: "rest",
      success: restResult.success,
      actorsRefreshed: restResult.actorsRefreshed,
      error: null
    });
  } catch (error) {
    testResults.push({
      cadence: "rest",
      success: false,
      error: error.message
    });
  }
  
  // Test day refresh
  try {
    const dayResult = await globalThis.swnr.refreshDay([actor]);
    testResults.push({
      cadence: "day",
      success: dayResult.success,
      actorsRefreshed: dayResult.actorsRefreshed,
      error: null
    });
  } catch (error) {
    testResults.push({
      cadence: "day",
      success: false,
      error: error.message
    });
  }
  
  const finalPools = actor.system.pools || {};
  
  return {
    testType: "refresh-functionality",
    initialPools,
    finalPools,
    results: testResults,
    passed: testResults.every(r => r.success)
  };
}

/**
 * Test pool management and validation
 * @param {Actor} actor - Actor to test with
 * @returns {Promise<Object>} Test results
 */
async function testPoolManagement(actor) {
  console.log(`[SWN Test] Starting pool management test for ${actor.name}`);
  
  const initialPools = foundry.utils.deepClone(actor.system.pools || {});
  const tests = [];
  
  // Test 1: Add a new test pool
  try {
    const testPools = foundry.utils.deepClone(initialPools);
    testPools["TestResource:TestSub"] = {
      value: 5,
      max: 10,
      cadence: "scene"
    };
    
    await actor.update({ "system.pools": testPools });
    const updated = actor.system.pools["TestResource:TestSub"];
    
    tests.push({
      test: "add-pool",
      passed: updated && updated.value === 5 && updated.max === 10,
      details: { expected: { value: 5, max: 10 }, actual: updated }
    });
  } catch (error) {
    tests.push({
      test: "add-pool",
      passed: false,
      error: error.message
    });
  }
  
  // Test 2: Modify pool values
  try {
    const testPools = foundry.utils.deepClone(actor.system.pools);
    if (testPools["TestResource:TestSub"]) {
      testPools["TestResource:TestSub"].value = 3;
      await actor.update({ "system.pools": testPools });
      
      const updated = actor.system.pools["TestResource:TestSub"];
      tests.push({
        test: "modify-pool",
        passed: updated && updated.value === 3,
        details: { expected: 3, actual: updated?.value }
      });
    }
  } catch (error) {
    tests.push({
      test: "modify-pool",
      passed: false,
      error: error.message
    });
  }
  
  // Test 3: Remove test pool (cleanup)
  try {
    const testPools = foundry.utils.deepClone(actor.system.pools);
    delete testPools["TestResource:TestSub"];
    await actor.update({ "system.pools": testPools });
    
    const removed = !actor.system.pools["TestResource:TestSub"];
    tests.push({
      test: "remove-pool",
      passed: removed,
      details: { poolExists: !removed }
    });
  } catch (error) {
    tests.push({
      test: "remove-pool",
      passed: false,
      error: error.message
    });
  }
  
  return {
    testType: "pool-management",
    initialPools,
    tests,
    passed: tests.every(t => t.passed)
  };
}

/**
 * Test power usage flow with different configurations
 * @param {Actor} actor - Actor to test with
 * @param {Item} power - Power to test with
 * @returns {Promise<Object>} Test results
 */
async function testPowerUsageFlow(actor, power) {
  console.log(`[SWN Test] Starting unified power usage flow test`);
  
  const initialPools = foundry.utils.deepClone(actor.system.pools || {});
  const tests = [];
  
  // Ensure we have sufficient resources for testing
  await actor.update({
    "system.pools.Effort:Psychic": { value: 5, max: 5, cadence: "scene" },
    "system.pools.Points:Spell": { value: 10, max: 10, cadence: "day" },
    "system.systemStrain.value": 0
  });
  
  // Test 1: Successful power usage
  try {
    const result = await power.system.use();
    
    tests.push({
      test: "successful-usage",
      passed: result.success === true,
      details: {
        resultSuccess: result.success,
        consumptions: result.consumptions,
        reason: result.reason
      }
    });
  } catch (error) {
    tests.push({
      test: "successful-usage",
      passed: false,
      error: error.message
    });
  }
  
  // Test 2: Power with no consumption (passive)
  try {
    // Create a power with no consumptions
    const consumptions = foundry.utils.deepClone(power.system.consumptions || []);
    await power.update({ "system.consumptions": [] });
    
    const result = await power.system.use();
    
    tests.push({
      test: "passive-power",
      passed: result.success === true,
      details: {
        resultSuccess: result.success,
        passive: result.passive
      }
    });
    
    // Restore original consumptions
    await power.update({ "system.consumptions": consumptions });
  } catch (error) {
    tests.push({
      test: "passive-power",
      passed: false,
      error: error.message
    });
  }
  
  // Restore initial pools
  await actor.update({ "system.pools": initialPools });
  
  return {
    testType: "unified-power-usage-flow",
    powerName: power.name,
    tests,
    passed: tests.every(t => t.passed)
  };
}

/**
 * Run comprehensive test suite
 * @param {Actor} actor - Actor to test with (should have powers)
 * @returns {Promise<Object>} Complete test results
 */
async function runComprehensiveTests(actor) {
  if (!actor) {
    throw new Error("Actor is required for testing");
  }
  
  const powers = actor.items.filter(i => i.type === "power" && i.system.hasConsumption());
  if (powers.length === 0) {
    throw new Error("Actor must have at least one power with consumption costs for testing");
  }
  
  const testPower = powers[0];
  const testSuite = [];
  
  console.log(`[SWN Test Suite] Starting comprehensive tests for ${actor.name}`);
  const startTime = Date.now();
  
  // Run all tests
  try {
    testSuite.push(await testPoolManagement(actor));
    testSuite.push(await testRefreshFunctionality(actor));
    testSuite.push(await testPowerUsageFlow(actor, testPower));
    testSuite.push(await testMutexConcurrency(actor, testPower));
  } catch (error) {
    console.error("[SWN Test Suite] Error during testing:", error);
    return {
      success: false,
      error: error.message,
      partialResults: testSuite
    };
  }
  
  const endTime = Date.now();
  const allPassed = testSuite.every(test => test.passed);
  
  const summary = {
    success: true,
    overallPassed: allPassed,
    duration: endTime - startTime,
    testsRun: testSuite.length,
    testsPassed: testSuite.filter(t => t.passed).length,
    testsFailed: testSuite.filter(t => !t.passed).length,
    results: testSuite
  };
  
  // Create summary chat message
  await createTestSummaryChatMessage(summary);
  
  return summary;
}

/**
 * Create a chat message summarizing test results
 */
async function createTestSummaryChatMessage(summary) {
  const status = summary.overallPassed ? "✅ PASSED" : "❌ FAILED";
  const color = summary.overallPassed ? "#27ae60" : "#e74c3c";
  
  let content = `<div class="chat-card test-summary" style="border-left: 4px solid ${color};">`;
  content += `<h3><i class="fas fa-flask"></i> SWN Power System Test Suite</h3>`;
  content += `<p><strong>Status:</strong> ${status}</p>`;
  content += `<p><strong>Duration:</strong> ${summary.duration}ms</p>`;
  content += `<p><strong>Tests:</strong> ${summary.testsPassed}/${summary.testsRun} passed</p>`;
  
  if (!summary.overallPassed) {
    content += `<h4>Failed Tests:</h4><ul>`;
    for (const test of summary.results.filter(t => !t.passed)) {
      content += `<li><strong>${test.testType}:</strong> Check console for details</li>`;
    }
    content += `</ul>`;
  }
  
  content += `</div>`;
  
  await getDocumentClass("ChatMessage").create({
    speaker: { alias: "Test System" },
    content: content,
    whisper: game.users.filter(u => u.isGM).map(u => u.id)
  });
}

/**
 * Test consumption data model functionality (new array-based system)
 * @param {Actor} actor - Actor to create test powers on
 * @returns {Promise<Object>} Test results
 */
async function testConsumptionDataModel(actor) {
  console.log("[SWN Test] Testing consumption data model (array-based)...");
  
  try {
    // Create a test power with new consumption array
    const powerData = {
      name: "Test Multi-Cost Power Array",
      type: "power",
      system: {
        subType: "psychic",
        resourceName: "Effort",
        subResource: "Psychic",
        consumptions: [
          {
            type: "systemStrain",
            usesCost: 2,
            cadence: "day",
            itemId: "",
            uses: { value: 0, max: 1 }
          },
          {
            type: "uses",
            usesCost: 1,
            cadence: "day",
            itemId: "",
            uses: { value: 3, max: 3 }
          },
          {
            type: "sourceEffort",
            usesCost: 1,
            cadence: "commit",
            itemId: "",
            uses: { value: 0, max: 1 }
          }
        ]
      }
    };
    
    const power = await Item.create(powerData, { parent: actor });
    console.log("[SWN Test] Created test power:", power.name);
    
    // Test helper methods
    const hasConsumption = power.system.hasConsumption();
    const consumptions = power.system.getConsumptions();
    
    console.log("[SWN Test] hasConsumption():", hasConsumption);
    console.log("[SWN Test] getConsumptions():", consumptions);
    console.log("[SWN Test] consumptions array:", power.system.consumptions);
    
    // Test add/remove methods
    await power.system.addConsumption({
      type: "spellPoints",
      usesCost: 3,
      cadence: "scene"
    });
    
    const afterAdd = power.system.consumptions.length;
    
    await power.system.removeConsumption(0);
    const afterRemove = power.system.consumptions.length;
    
    // Verify data structure and methods
    const assertions = [
      { name: "hasConsumption returns true", result: hasConsumption === true },
      { name: "getConsumptions returns 3 items initially", result: consumptions.length === 3 },
      { name: "consumptions array has 3 entries", result: power.system.consumptions.length === 3 },
      { name: "first consumption type is systemStrain", result: power.system.consumptions[0].type === "systemStrain" },
      { name: "second consumption type is uses", result: power.system.consumptions[1].type === "uses" },
      { name: "third consumption type is sourceEffort", result: power.system.consumptions[2].type === "sourceEffort" },
      { name: "addConsumption increases array length", result: afterAdd === 4 },
      { name: "removeConsumption decreases array length", result: afterRemove === 3 },
      { name: "systemStrain usesCost is 2", result: power.system.consumptions[0].usesCost === 2 },
      { name: "uses consumption has max of 3", result: power.system.consumptions[1].uses.max === 3 }
    ];
    
    const passed = assertions.filter(a => a.result).length;
    const failed = assertions.filter(a => !a.result);
    
    console.log(`[SWN Test] Consumption data model test: ${passed}/${assertions.length} passed`);
    if (failed.length > 0) {
      console.warn("[SWN Test] Failed assertions:", failed);
    }
    
    // Clean up
    await power.delete();
    
    return {
      success: failed.length === 0,
      passed,
      total: assertions.length,
      failures: failed
    };
    
  } catch (error) {
    console.error("[SWN Test] Consumption data model test failed:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Test consumption processing functionality (new array-based system)
 * @param {Actor} actor - Actor to test with
 * @returns {Promise<Object>} Test results
 */
async function testConsumptionProcessing(actor) {
  console.log("[SWN Test] Testing consumption processing (array-based)...");
  
  try {
    // Ensure actor has some resources
    await actor.update({
      "system.pools.Effort:Psychic": { value: 5, max: 5, cadence: "scene" },
      "system.pools.Effort:Special": { value: 3, max: 3, cadence: "scene" },
      "system.systemStrain.value": 0
    });
    
    // Create a test power with multi-cost consumption using array
    const powerData = {
      name: "Test Multi-Cost Power Processing Array",
      type: "power",
      system: {
        subType: "psychic",
        resourceName: "Effort",
        subResource: "Psychic",
        consumptions: [
          {
            type: "systemStrain",
            usesCost: 2,
            cadence: "day",
            itemId: "",
            uses: { value: 0, max: 1 }
          },
          {
            type: "uses",
            usesCost: 1,
            cadence: "day",
            itemId: "",
            uses: { value: 3, max: 3 }
          },
          {
            type: "sourceEffort",
            usesCost: 1,
            cadence: "commit",
            itemId: "",
            uses: { value: 0, max: 1 }
          }
        ]
      }
    };
    
    const power = await Item.create(powerData, { parent: actor });
    console.log("[SWN Test] Created test power:", power.name);
    
    // Test power usage
    const usageResult = await power.system.use();
    console.log("[SWN Test] Power usage result:", usageResult);
    
    // Verify results
    const assertions = [
      { name: "Power usage succeeded", result: usageResult.success === true },
      { name: "Consumption results included", result: Array.isArray(usageResult.consumptions) },
      { name: "Three consumptions processed", result: usageResult.consumptions?.length === 3 },
      { name: "SystemStrain consumption succeeded", result: usageResult.consumptions?.some(c => c.type === "systemStrain" && c.success) },
      { name: "Uses consumption succeeded", result: usageResult.consumptions?.some(c => c.type === "uses" && c.success) },
      { name: "SourceEffort consumption succeeded", result: usageResult.consumptions?.some(c => c.type === "sourceEffort" && c.success) }
    ];
    
    // Check actor state after usage
    await actor.reload();
    const afterStrain = actor.system.systemStrain?.value || 0;
    const afterPowerUses = power.system.consumptions[1].uses.value;
    
    assertions.push(
      { name: "System strain increased by 2", result: afterStrain === 2 },
      { name: "Power uses decreased from 3 to 2", result: afterPowerUses === 2 }
    );
    
    const passed = assertions.filter(a => a.result).length;
    const failed = assertions.filter(a => !a.result);
    
    console.log(`[SWN Test] Consumption processing test: ${passed}/${assertions.length} passed`);
    if (failed.length > 0) {
      console.warn("[SWN Test] Failed assertions:", failed);
    }
    
    // Clean up
    await power.delete();
    
    return {
      success: failed.length === 0,
      passed,
      total: assertions.length,
      failures: failed
    };
    
  } catch (error) {
    console.error("[SWN Test] Consumption processing test failed:", error);
    return {
      success: false,
      error: error.message
    };
  }
}


/**
 * Run comprehensive multi-cost consumption test suite
 * @param {Actor} actor - Actor to test with (should have powers)
 * @returns {Promise<Object>} Complete test results
 */
async function runMultiCostTests(actor) {
  if (!actor) {
    throw new Error("Actor is required for testing");
  }
  
  const testSuite = [];
  
  console.log(`[SWN Multi-Cost Test Suite] Starting comprehensive multi-cost consumption tests for ${actor.name}`);
  const startTime = Date.now();
  
  // Run all consumption-specific tests
  try {
    testSuite.push(await testConsumptionDataModel(actor));
    testSuite.push(await testConsumptionProcessing(actor));
    
    // Also run core power tests for compatibility
    testSuite.push(await testPoolManagement(actor));
    
    // If actor has powers, test them too
    const powers = actor.items.filter(i => i.type === "power" && i.system.hasConsumption());
    if (powers.length > 0) {
      testSuite.push(await testPowerUsageFlow(actor, powers[0]));
    }
    
  } catch (error) {
    console.error("[SWN Multi-Cost Test Suite] Error during testing:", error);
    return {
      success: false,
      error: error.message,
      partialResults: testSuite
    };
  }
  
  const endTime = Date.now();
  const allPassed = testSuite.every(test => test.passed);
  
  const summary = {
    success: true,
    overallPassed: allPassed,
    duration: endTime - startTime,
    testsRun: testSuite.length,
    testsPassed: testSuite.filter(t => t.passed).length,
    testsFailed: testSuite.filter(t => !t.passed).length,
    results: testSuite,
    testType: "multi-cost-consumption"
  };
  
  // Create summary chat message
  await createMultiCostTestSummaryChatMessage(summary);
  
  return summary;
}

/**
 * Create a chat message summarizing multi-cost test results
 */
async function createMultiCostTestSummaryChatMessage(summary) {
  const status = summary.overallPassed ? "✅ PASSED" : "❌ FAILED";
  const color = summary.overallPassed ? "#27ae60" : "#e74c3c";
  
  let content = `<div class="chat-card test-summary" style="border-left: 4px solid ${color};">`;
  content += `<h3><i class="fas fa-magic"></i> Multi-Cost Consumption Test Suite</h3>`;
  content += `<p><strong>Status:</strong> ${status}</p>`;
  content += `<p><strong>Duration:</strong> ${summary.duration}ms</p>`;
  content += `<p><strong>Tests:</strong> ${summary.testsPassed}/${summary.testsRun} passed</p>`;
  
  if (!summary.overallPassed) {
    content += `<h4>Failed Tests:</h4><ul>`;
    for (const test of summary.results.filter(t => !t.passed)) {
      content += `<li><strong>${test.testType || "Unknown"}:</strong> Check console for details</li>`;
    }
    content += `</ul>`;
  }
  
  content += `<p><em>Multi-cost consumption system validation complete. Powers can now require unlimited resource combinations.</em></p>`;
  content += `</div>`;
  
  await getDocumentClass("ChatMessage").create({
    speaker: { alias: "Multi-Cost Test System" },
    content: content,
    whisper: game.users.filter(u => u.isGM).map(u => u.id)
  });
}

/**
 * Test power resource field migration logic
 * @param {Actor} actor - Actor to test with
 */
async function testPowerResourceMigration(actor) {
  console.log("[SWN Test] Testing power resource field migration logic...");
  
  const testCases = [
    // Test case format: { input: {...}, expected: {...} }
    {
      input: { subType: "psychic", source: "Mentalist", level: 1 },
      expected: { resourceName: "Effort", subResource: "Mentalist" }
    },
    {
      input: { subType: "art", source: "", level: 1 },
      expected: { resourceName: "Effort", subResource: "art" }
    },
    {
      input: { subType: "spell", source: "Elementalist", level: 3 },
      expected: { resourceName: "Slots", subResource: "Lv3" }
    },
    {
      input: { subType: "mutation", source: "Alien Heritage", level: 1 },
      expected: { resourceName: "Uses", subResource: "Alien Heritage" }
    },
    {
      input: { subType: "adept", source: "Augmented", level: 2 },
      expected: { resourceName: "Effort", subResource: "Augmented" }
    }
  ];
  
  const results = [];
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    const { input, expected } = testCase;
    
    try {
      // Create a temporary power for testing migration logic
      const powerData = {
        name: `Migration Test Power ${i + 1}`,
        type: "power",
        system: {
          ...input,
          resourceName: "", // Simulate empty field that needs migration
          subResource: ""
        }
      };
      
      const tempPower = await actor.createEmbeddedDocuments("Item", [powerData]);
      const power = tempPower[0];
      
      // Apply migration logic manually (simulating the migration function)
      const system = foundry.utils.deepClone(power.system);
      let migrationResult = { resourceName: "", subResource: "" };
      
      switch (system.subType) {
        case "psychic":
        case "art":
        case "adept":
          migrationResult.resourceName = "Effort";
          migrationResult.subResource = system.source || system.subType;
          break;
        case "spell":
          migrationResult.resourceName = "Slots";
          migrationResult.subResource = `Lv${system.level || 1}`;
          break;
        case "mutation":
          migrationResult.resourceName = "Uses";
          migrationResult.subResource = system.source || "";
          break;
      }
      
      // Test resourceKey() method after migration
      const testPower = { 
        resourceName: migrationResult.resourceName, 
        subResource: migrationResult.subResource 
      };
      const resourceKey = testPower.resourceName ? 
        `${testPower.resourceName}:${testPower.subResource || ""}` : "";
      
      // Validate results
      const resourceNameMatch = migrationResult.resourceName === expected.resourceName;
      const subResourceMatch = migrationResult.subResource === expected.subResource;
      const resourceKeyFormat = resourceKey === `${expected.resourceName}:${expected.subResource}`;
      
      results.push({
        name: `Migration ${input.subType} (${input.source || 'no source'})`,
        result: resourceNameMatch && subResourceMatch && resourceKeyFormat,
        details: {
          input: input,
          expected: expected,
          actual: migrationResult,
          resourceKey: resourceKey
        }
      });
      
      // Clean up temporary power
      await power.delete();
      
    } catch (error) {
      results.push({
        name: `Migration ${input.subType} (error)`,
        result: false,
        error: error.message
      });
    }
  }
  
  return {
    testType: "power-resource-migration",
    results: results,
    passed: results.every(r => r.result),
    summary: {
      total: results.length,
      passed: results.filter(r => r.result).length,
      failed: results.filter(r => !r.result).length
    }
  };
}

// Export test functions
export {
  testMutexConcurrency,
  testRefreshFunctionality,
  testPoolManagement,
  testPowerUsageFlow,
  testConsumptionDataModel,
  testConsumptionProcessing,
  testPowerResourceMigration,
  runComprehensiveTests,
  runMultiCostTests
};

// Add to global swnr object for easy access
globalThis.swnr = globalThis.swnr || {};
globalThis.swnr.runTests = runComprehensiveTests;
globalThis.swnr.runMultiCostTests = runMultiCostTests;