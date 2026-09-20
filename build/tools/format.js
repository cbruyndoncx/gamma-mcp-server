/**
 * Shared rendering for tool responses.
 */
export function textResult(text) {
    return { content: [{ type: "text", text }] };
}
/**
 * Render a generation result as MCP text content.
 *
 * Surfaces the two things the v1.0 API returns that used to be dropped on the
 * floor: `warnings` (how Gamma reports a parameter it silently ignored) and
 * `credits`. The export URL is unauthenticated and expires in about a week, so
 * it is labelled as a secret and never written to the server log.
 */
export function formatGenerationResult(result, label, successNote) {
    const lines = [];
    if (result.url) {
        lines.push(`${label} generated! View it here: ${result.url}`);
        if (successNote)
            lines.push("", successNote);
    }
    else if (result.generationId && result.status === "pending" && !result.error) {
        // Asked not to wait - this is the expected outcome, not a failure.
        lines.push(`${label} started (id=${result.generationId}).`, `Poll get_generation_status with this generationId until status is completed or failed.`);
    }
    else if (result.generationId) {
        lines.push(`${label} created (id=${result.generationId}) but no final URL is available yet.`, `Poll get_generation_status with this generationId to check again.`, `Status: ${result.error || "unknown"}`);
    }
    else {
        lines.push(`Failed to generate ${label.toLowerCase()}. Error: ${result.error || "Unknown error."}`);
    }
    if (result.gammaId)
        lines.push("", `Gamma ID: ${result.gammaId}`);
    if (result.exportUrl) {
        lines.push("", `Export: ${result.exportUrl}`, `(This link expires in about a week and is not tied to your API key - treat it as a secret.)`);
    }
    if (result.credits) {
        lines.push("", `Credits: ${result.credits.deducted} used, ${result.credits.remaining} remaining.`);
    }
    if (result.warnings) {
        lines.push("", `Warnings from Gamma: ${result.warnings}`);
    }
    return textResult(lines.join("\n"));
}
