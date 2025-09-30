/**
 * Test script to verify release notes display functionality
 * Run this in the browser console when testing in Foundry
 */

async function testReleaseNotesDisplay() {
  console.log("Testing release notes display...");

  try {
    // Check if pack exists
    const pack = game.packs.get("swnr.swnr-documentation");
    if (!pack) {
      console.error("SWNR documentation pack not found");
      return false;
    }
    console.log("✓ Pack found:", pack.title);

    // Check if journal exists
    const releaseNotesId = "Gq9tLm4ZRxv8pAy2";
    const journal = await pack.getDocument(releaseNotesId);
    if (!journal) {
      console.error("Release notes journal not found");
      return false;
    }
    console.log("✓ Journal found:", journal.name);

    // Test display
    journal.sheet.render(true, {
      focus: true,
      top: 100,
      left: 100
    });
    console.log("✓ Release notes displayed successfully");

    return true;
  } catch (err) {
    console.error("Test failed:", err);
    return false;
  }
}

// Export for console use
window.testReleaseNotesDisplay = testReleaseNotesDisplay;
console.log("Test function loaded. Run testReleaseNotesDisplay() to test.");