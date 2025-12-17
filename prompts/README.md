# Gamma MCP Server Prompts

This directory contains prompt templates for the Gamma MCP Server.

## Directory Structure

- `public/` - Public prompt templates (included in git repository)
- `private/` - Private/custom prompt templates (excluded from git)

## Prompt File Format

Each prompt is defined in a JSON file with the following structure:

```json
{
  "name": "prompt-name",
  "description": "Brief description of what this prompt does",
  "parameters": {
    "param1": {
      "type": "string",
      "description": "Description of param1",
      "required": true
    },
    "param2": {
      "type": "string",
      "description": "Description of param2",
      "required": false,
      "default": "default value"
    }
  },
  "template": "Create a presentation about {{param1}}...\n\nUse the generate-presentation tool with these parameters:\n- numCards: 10\n- tone: {{param2}}"
}
```

## Template Variables

Use `{{parameterName}}` to insert parameter values into your template.

Special syntax:
- `{{parameterName}}` - Insert parameter value
- `{{parameterName || "default"}}` - Use default if parameter is not provided

## Adding Custom Prompts

1. Create a new JSON file in `prompts/private/` directory
2. Follow the format above
3. Restart the MCP server
4. Your prompt will be automatically registered

## Example

See `public/example-prompt.json` for a complete example.
