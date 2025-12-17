# External Prompts Guide

The Gamma MCP Server now supports loading custom prompt templates from external JSON files, allowing you to keep private or company-specific prompts separate from the public codebase.

## Directory Structure

```
gamma-mcp-server/
├── prompts/
│   ├── public/          # Public prompts (committed to git)
│   │   └── *.json
│   └── private/         # Private prompts (excluded from git)
│       └── *.json
```

## How It Works

1. **Built-in Prompts**: The server includes built-in prompts in `src/mcp-prompts.ts`
2. **Public External Prompts**: JSON files in `prompts/public/` are loaded and registered
3. **Private External Prompts**: JSON files in `prompts/private/` are loaded (git-ignored)
4. **Priority**: External prompts can override built-in prompts with the same name

## Creating a Custom Prompt

### 1. Create a JSON File

Create a new file in `prompts/private/` (for private prompts) or `prompts/public/` (for shared prompts):

```json
{
  "name": "my-custom-prompt",
  "description": "Description shown to MCP clients",
  "parameters": {
    "param1": {
      "type": "string",
      "description": "Description of this parameter",
      "required": true
    },
    "param2": {
      "type": "string",
      "description": "Optional parameter with default",
      "required": false,
      "default": "default value"
    }
  },
  "template": "Your prompt template here...\n\nUse {{param1}} and {{param2}} to insert values."
}
```

### 2. Parameter Types

Supported parameter types:
- `"string"` - Text values
- `"number"` - Numeric values
- `"boolean"` - True/false values

### 3. Template Syntax

Use double curly braces to insert parameter values:

- `{{parameterName}}` - Insert parameter value
- `{{parameterName || "default"}}` - Use default if parameter not provided

### 4. Template Best Practices

Include clear instructions for the `generate-presentation` tool:

```json
{
  "template": "Create a presentation about {{topic}}.\n\nStructure:\n1. Introduction\n2. Main content\n3. Conclusion\n\nUse the generate-presentation tool with these parameters:\n- numCards: 10\n- textAmount: medium\n- tone: {{tone || \"professional\"}}\n- audience: {{audience}}\n- exportAs: pptx\n- additionalInstructions: {{additionalInstructions}}"
}
```

## Example: Private Company Prompt

**File: `prompts/private/board-meeting.json`**

```json
{
  "name": "board-meeting",
  "description": "Generate board meeting presentation for executives",
  "parameters": {
    "quarter": {
      "type": "string",
      "description": "Quarter (e.g., 'Q1 2025')",
      "required": true
    },
    "focus": {
      "type": "string",
      "description": "Main focus area",
      "required": false,
      "default": "Financial Performance"
    }
  },
  "template": "Create a board meeting presentation for {{quarter}}.\n\n**CONFIDENTIAL - BOARD LEVEL**\n\nFocus: {{focus}}\n\nStructure:\n1. Executive Summary\n2. Financial Performance\n3. Strategic Initiatives\n4. Risk Assessment\n5. Competitive Analysis\n6. Management Discussion\n7. Next Steps\n\nUse the generate-presentation tool with these parameters:\n- numCards: 7\n- textAmount: short\n- tone: direct and executive-level\n- audience: board of directors\n- exportAs: pptx\n- additionalInstructions: Mark all slides as CONFIDENTIAL. Use executive summary format. Include decision points."
}
```

## Git Configuration

Private prompts are automatically excluded from git:

```gitignore
# Private prompt templates (exclude from git)
prompts/private/*.json
!prompts/private/.gitkeep
```

This means you can:
- ✅ Commit `prompts/public/*.json` to the repository
- ✅ Keep `prompts/private/*.json` local and private
- ✅ Share the public MCP server codebase without exposing private prompts

## Loading Order

Prompts are loaded in this order:

1. Built-in prompts from `src/mcp-prompts.ts`
2. Public external prompts from `prompts/public/*.json`
3. Private external prompts from `prompts/private/*.json`

Later prompts can override earlier ones with the same name.

## Testing Your Prompts

After adding a new prompt JSON file:

1. Rebuild the server: `npm run build`
2. Restart your MCP client
3. The new prompt should appear in the available prompts list
4. Check server logs for any loading errors

## Validation

The prompt loader validates:
- ✅ Required fields: `name`, `description`, `template`
- ✅ Parameter schema structure
- ✅ JSON syntax

Invalid prompts are logged as errors but don't crash the server.

## Use Cases

### Public Prompts
- Standard presentation templates
- Industry-specific formats
- Open-source prompt libraries

### Private Prompts
- Company-specific templates
- Confidential formats
- Client-specific presentations
- Internal-only content

## Advanced Example

**File: `prompts/private/customer-onboarding.json`**

```json
{
  "name": "customer-onboarding",
  "description": "Generate customer onboarding presentation with company branding",
  "parameters": {
    "customer_name": {
      "type": "string",
      "description": "Customer company name",
      "required": true
    },
    "plan_tier": {
      "type": "string",
      "description": "Plan tier (starter, professional, enterprise)",
      "required": true
    },
    "start_date": {
      "type": "string",
      "description": "Onboarding start date",
      "required": false,
      "default": "this week"
    }
  },
  "template": "Create a customer onboarding presentation for {{customer_name}} ({{plan_tier}} plan).\n\nOnboarding Start: {{start_date}}\n\nStructure:\n1. Welcome to [Your Company]\n2. Your {{plan_tier}} Plan Benefits\n3. Getting Started Checklist\n4. Platform Overview\n5. Key Features for {{plan_tier}} Users\n6. Best Practices\n7. Support and Resources\n8. Success Metrics\n9. Next Steps and Timeline\n10. Your Dedicated Team\n\nUse the generate-presentation tool with these parameters:\n- numCards: 10\n- textAmount: medium\n- tone: welcoming and helpful\n- audience: new {{plan_tier}} customers\n- imageStyle: professional and branded\n- exportAs: pptx\n- additionalInstructions: Personalize with {{customer_name}} throughout. Use company brand colors and logo. Include contact information for the customer success team. Add interactive onboarding checklist."
}
```

## Troubleshooting

### Prompt Not Loading

1. Check JSON syntax is valid
2. Verify file is in correct directory (`prompts/public/` or `prompts/private/`)
3. Ensure file has `.json` extension
4. Check server logs for error messages
5. Rebuild: `npm run build`

### Template Variables Not Working

- Use `{{variableName}}` not `{variableName}`
- Ensure parameter names match exactly
- Check parameter is defined in `parameters` object

### Override Not Working

- Private prompts override public prompts
- Later prompts override earlier prompts
- Ensure prompt `name` matches exactly

## Migration Strategy

To move built-in prompts to external files:

1. Copy prompt content from `src/mcp-prompts.ts`
2. Create JSON file in `prompts/public/` or `prompts/private/`
3. Convert TypeScript template to JSON format
4. Test the external version
5. Optionally remove from `src/mcp-prompts.ts`

This allows gradual migration without breaking existing functionality.
