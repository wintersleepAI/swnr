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
  console.log(`[SWN Test] Starting power usage flow test`);
  
  const initialPools = foundry.utils.deepClone(actor.system.pools || {});
  const resourceKey = power.system.resourceKey();
  const tests = [];
  
  // Ensure we have the required pool
  if (!initialPools[resourceKey] || initialPools[resourceKey].value < power.system.resourceCost) {
    const testPools = foundry.utils.deepClone(initialPools);
    testPools[resourceKey] = {
      value: 5,
      max: 5,
      cadence: power.system.resourceLength
    };
    await actor.update({ "system.pools": testPools });
  }
  
  // Test 1: Successful power usage
  try {
    const preUsePools = foundry.utils.deepClone(actor.system.pools);
    const result = await power.system.use();
    const postUsePools = actor.system.pools;
    
    const expectedValue = preUsePools[resourceKey].value - power.system.resourceCost;
    const actualValue = postUsePools[resourceKey].value;
    
    tests.push({
      test: "successful-usage",
      passed: result.success && actualValue === expectedValue,
      details: {
        resultSuccess: result.success,
        expectedPoolValue: expectedValue,
        actualPoolValue: actualValue,
        resourceSpent: result.resourceSpent
      }
    });
  } catch (error) {
    tests.push({
      test: "successful-usage",
      passed: false,
      error: error.message
    });
  }
  
  // Test 2: Insufficient resources
  try {
    // Drain the pool first
    const currentPools = foundry.utils.deepClone(actor.system.pools);
    currentPools[resourceKey].value = 0;
    await actor.update({ "system.pools": currentPools });
    
    const result = await power.system.use();
    
    tests.push({
      test: "insufficient-resources",
      passed: !result.success && result.reason === "insufficient-resources",
      details: {
        resultSuccess: result.success,
        reason: result.reason,
        message: result.message
      }
    });
  } catch (error) {
    tests.push({
      test: "insufficient-resources",
      passed: false,
      error: error.message
    });
  }
  
  // Restore initial pools
  await actor.update({ "system.pools": initialPools });
  
  return {
    testType: "power-usage-flow",
    powerName: power.name,
    resourceKey,
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
  
  const powers = actor.items.filter(i => i.type === "power" && i.system.resourceName !== "");
  if (powers.length === 0) {
    throw new Error("Actor must have at least one power with resource cost for testing");
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

// Export test functions
export {
  testMutexConcurrency,
  testRefreshFunctionality,
  testPoolManagement,
  testPowerUsageFlow,
  runComprehensiveTests
};

// Add to global swnr object for easy access
globalThis.swnr = globalThis.swnr || {};
globalThis.swnr.runTests = runComprehensiveTests;