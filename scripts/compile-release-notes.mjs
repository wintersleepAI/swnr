import fs from "fs";

const NOTES_SRC_PATH = "./CHANGELOG.md";
const JOURNAL_YAML_PATH = "./src/packs/swnr-documentation/release_notes_Gq9tLm4ZRxv8pAy2.yml";

function markdownToHtml(markdown) {
    let html = markdown;

    // Headers
    html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Bold
    html = html.replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>');
    html = html.replace(/__(.*?)__/gim, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');
    html = html.replace(/_(.*?)_/gim, '<em>$1</em>');

    // Code blocks
    html = html.replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>');

    // Inline code
    html = html.replace(/`(.*?)`/gim, '<code>$1</code>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2">$1</a>');

    // Lists
    html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
    html = html.replace(/^\- (.*$)/gim, '<li>$1</li>');
    html = html.replace(/^(\d+)\. (.*$)/gim, '<li>$1. $2</li>');

    // Wrap consecutive <li> items in <ul>
    html = html.replace(/(<li>.*<\/li>)/gims, (match) => {
        return '<ul>' + match + '</ul>';
    });

    // Line breaks to paragraphs
    html = html.replace(/\n\n/gim, '</p><p>');
    html = '<p>' + html + '</p>';

    // Clean up empty paragraphs
    html = html.replace(/<p><\/p>/gim, '');
    html = html.replace(/<p>\s*<\/p>/gim, '');

    return html;
}

function compileReleaseNotes(cb) {
    try {
        // Check if the source markdown file exists
        if (!fs.existsSync(NOTES_SRC_PATH)) {
            console.log(`Release notes file not found at ${NOTES_SRC_PATH}`);
            if (cb) cb();
            return;
        }

        // Read the markdown source
        const source = fs.readFileSync(NOTES_SRC_PATH, "utf8");

        // Convert markdown to HTML
        const html = markdownToHtml(source);

        // Read the existing journal YAML as text
        const journalYaml = fs.readFileSync(JOURNAL_YAML_PATH, "utf8");

        // Find the placeholder text and replace it with HTML content
        // Preserve the indentation of the original line
        const placeholderText = "This is a placeholder for the release note details. Do not manually edit this page.";
        const lines = journalYaml.split('\n');
        let updatedYaml = journalYaml;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.includes(placeholderText)) {
                // Extract the indentation from the original line
                const indentation = line.match(/^(\s*)/)[1];
                
                // Split HTML into lines and add the same indentation to each line
                const htmlLines = html.split('\n');
                const indentedHtml = htmlLines.map(htmlLine => 
                    htmlLine.trim() === '' ? '' : indentation + htmlLine
                ).join('\n');
                
                // Replace the placeholder line with the indented HTML
                updatedYaml = journalYaml.replace(line, indentedHtml);
                break;
            }
        }

        fs.writeFileSync(JOURNAL_YAML_PATH, updatedYaml);

        console.log("Release notes compiled successfully!");
        if (cb) cb();
    } catch (error) {
        console.error("Error compiling release notes:", error);
        if (cb) cb(error);
    }
}

export const compile = compileReleaseNotes;

// Allow running directly
if (import.meta.url === `file://${process.argv[1]}`) {
    compileReleaseNotes((error) => {
        if (error) {
            process.exit(1);
        }
    });
}