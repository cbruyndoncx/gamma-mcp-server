/**
 * MCP Prompts Manager
 *
 * All prompts are now loaded from external JSON files in:
 * - prompts/public/ - Public prompts (committed to git)
 * - prompts/private/ - Private prompts (git-ignored, takes precedence)
 *
 * See prompts/README.md for prompt file format and examples.
 * See PROMPTS_GUIDE.md for detailed documentation.
 */
import { loadAndRegisterExternalPrompts } from "./prompt-loader.js";
/**
 * Register all MCP prompts from external JSON files
 *
 * Loads prompts in this order (later overrides earlier):
 * 1. prompts/public/*.json - Public prompt templates
 * 2. prompts/private/*.json - Private prompt templates (git-ignored)
 */
export async function registerAllPrompts(server) {
    // Load and register all external prompts from JSON files
    await loadAndRegisterExternalPrompts(server);
}
