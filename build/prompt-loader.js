/**
 * Prompt Loader Utility
 * Loads prompt templates from external JSON files with hot-reload support
 */
import { readdir, readFile, watch } from "fs/promises";
import { join, extname } from "path";
import { z } from "zod";
import { PROMPT_PATHS, HOT_RELOAD_CONFIG } from "./constants.js";
/**
 * Convert parameter type to Zod schema
 */
function createZodSchema(param) {
    let schema;
    switch (param.type) {
        case "string":
            schema = z.string();
            break;
        case "number":
            schema = z.number();
            break;
        case "boolean":
            schema = z.boolean();
            break;
        default:
            schema = z.string();
    }
    if (param.description) {
        schema = schema.describe(param.description);
    }
    if (!param.required) {
        schema = schema.optional();
    }
    return schema;
}
/**
 * Replace template variables with parameter values
 */
function renderTemplate(template, params) {
    let result = template;
    // Replace {{param}} or {{param || "default"}} syntax
    result = result.replace(/\{\{([^}|]+)(?:\|\|\s*"([^"]+)")?\}\}/g, (match, paramName, defaultValue) => {
        const value = params[paramName.trim()];
        if (value !== undefined && value !== null) {
            return String(value);
        }
        return defaultValue || "";
    });
    return result;
}
/**
 * Load a single prompt definition from a JSON file
 */
async function loadPromptFile(filePath) {
    try {
        const content = await readFile(filePath, "utf-8");
        const promptDef = JSON.parse(content);
        // Validate required fields
        if (!promptDef.name || !promptDef.description || !promptDef.template) {
            console.error(`Invalid prompt file ${filePath}: missing required fields`);
            return null;
        }
        return promptDef;
    }
    catch (err) {
        console.error(`Error loading prompt file ${filePath}:`, err);
        return null;
    }
}
/**
 * Load all prompt files from a directory
 */
async function loadPromptsFromDirectory(dirPath) {
    const prompts = [];
    try {
        const files = await readdir(dirPath);
        for (const file of files) {
            if (extname(file) !== ".json")
                continue;
            const filePath = join(dirPath, file);
            const promptDef = await loadPromptFile(filePath);
            if (promptDef) {
                prompts.push(promptDef);
            }
        }
    }
    catch (err) {
        // Directory might not exist, which is fine
        if (err.code !== "ENOENT") {
            console.error(`Error reading prompts directory ${dirPath}:`, err);
        }
    }
    return prompts;
}
/**
 * Register a prompt definition with the MCP server
 */
function registerPrompt(server, promptDef) {
    // Build Zod schema for parameters
    const paramSchema = {};
    for (const [key, param] of Object.entries(promptDef.parameters || {})) {
        paramSchema[key] = createZodSchema(param);
    }
    server.prompt(promptDef.name, promptDef.description, paramSchema, async (args) => {
        // Apply defaults for missing optional parameters
        const params = { ...args };
        for (const [key, param] of Object.entries(promptDef.parameters || {})) {
            if (params[key] === undefined && param.default !== undefined) {
                params[key] = param.default;
            }
        }
        const text = renderTemplate(promptDef.template, params);
        return {
            messages: [
                {
                    role: "user",
                    content: {
                        type: "text",
                        text,
                    },
                },
            ],
        };
    });
}
/**
 * Stored prompt definitions for hot-reload
 */
const promptRegistry = new Map();
/**
 * Load all prompts from directories and update registry
 */
async function loadAllPrompts() {
    const allPrompts = [];
    // Load public prompts
    const publicPrompts = await loadPromptsFromDirectory(PROMPT_PATHS.PUBLIC);
    for (const promptDef of publicPrompts) {
        promptRegistry.set(promptDef.name, promptDef);
        allPrompts.push(promptDef);
    }
    // Load private prompts (these override public prompts with the same name)
    const privatePrompts = await loadPromptsFromDirectory(PROMPT_PATHS.PRIVATE);
    for (const promptDef of privatePrompts) {
        promptRegistry.set(promptDef.name, promptDef);
        allPrompts.push(promptDef);
    }
    return allPrompts;
}
/**
 * Setup file watchers for hot-reload
 */
async function setupHotReload(server) {
    if (!HOT_RELOAD_CONFIG.ENABLED) {
        console.error("Hot-reload disabled");
        return;
    }
    const debounceTimers = new Map();
    const watchDirectory = async (dirPath) => {
        try {
            const watcher = watch(dirPath, { recursive: false });
            console.error(`Watching for prompt changes in: ${dirPath}`);
            for await (const event of watcher) {
                if (!event.filename || !event.filename.endsWith(".json"))
                    continue;
                const dirKey = dirPath;
                // Clear existing timer for this directory
                if (debounceTimers.has(dirKey)) {
                    clearTimeout(debounceTimers.get(dirKey));
                }
                // Set new debounced reload
                debounceTimers.set(dirKey, setTimeout(async () => {
                    console.error(`\nPrompt file changed: ${event.filename} - Reloading...`);
                    try {
                        // Reload all prompts
                        const prompts = await loadAllPrompts();
                        // Re-register all prompts
                        for (const promptDef of prompts) {
                            registerPrompt(server, promptDef);
                        }
                        console.error(`✓ Reloaded ${prompts.length} prompt(s)`);
                    }
                    catch (err) {
                        console.error(`Error reloading prompts:`, err);
                    }
                }, HOT_RELOAD_CONFIG.DEBOUNCE_MS));
            }
        }
        catch (err) {
            // Directory might not exist, which is fine
            if (err.code !== "ENOENT") {
                console.error(`Error watching directory ${dirPath}:`, err);
            }
        }
    };
    // Watch both directories
    watchDirectory(PROMPT_PATHS.PUBLIC).catch(() => { });
    watchDirectory(PROMPT_PATHS.PRIVATE).catch(() => { });
}
/**
 * Load and register all prompts from public and private directories
 * Also sets up hot-reload if enabled
 */
export async function loadAndRegisterExternalPrompts(server) {
    // Initial load
    const prompts = await loadAllPrompts();
    for (const promptDef of prompts) {
        registerPrompt(server, promptDef);
    }
    if (prompts.length > 0) {
        console.error(`Loaded ${prompts.length} external prompt(s) from:`);
        console.error(`  - Public: ${PROMPT_PATHS.PUBLIC}`);
        console.error(`  - Private: ${PROMPT_PATHS.PRIVATE}`);
    }
    // Setup hot-reload
    if (HOT_RELOAD_CONFIG.ENABLED) {
        setupHotReload(server).catch((err) => {
            console.error("Failed to setup hot-reload:", err);
        });
    }
    return prompts.length;
}
