# Gamma Generate API Parameters Reference

Comprehensive documentation for all parameters in the Gamma Generate API.

> **Source**: [Gamma Generate API Documentation](https://developers.gamma.app/docs/generate-api-parameters-explained)  
> **Last Updated**: 2025-01-17

---

## Table of Contents

- [Overview](#overview)
- [Quick Reference](#quick-reference)
- [Top Level Parameters](#top-level-parameters)
  - [inputText](#inputtext-required)
  - [textMode](#textmode-required)
  - [format](#format)
  - [themeId](#themeid-optional-defaults-to-workspace-default-theme)
  - [numCards](#numcards)
  - [cardSplit](#cardsplit)
  - [additionalInstructions](#additionalinstructions-optional)
  - [folderIds](#folderids-optional)
  - [exportAs](#exportas-optional)
- [textOptions](#textoptions)
  - [amount](#textoptionsamount)
  - [tone](#textoptionstoneoptional)
  - [audience](#textoptionsaudienceoptional)
  - [language](#textoptionslanguage)
- [imageOptions](#imageoptions)
  - [source](#imageoptionssource)
  - [model](#imageoptionsmodeloptional)
  - [style](#imageoptionsstyleoptional)
- [cardOptions](#cardoptions)
  - [dimensions](#cardoptionsdimensionsoptional)
  - [headerFooter](#cardoptionsheaderfooteroptional)
- [sharingOptions](#sharingoptions)
  - [workspaceAccess](#sharingoptionsworkspaceaccessoptional-defaults-to-workspace-share-settings)
  - [externalAccess](#sharingoptionsexternalaccessoptional-defaults-to-workspace-share-settings)
  - [emailOptions](#sharingoptionsemailoptionsoptional)

---

## Overview

The Gamma Generate API allows you to programmatically create presentations, documents, webpages, and social media content. This guide provides detailed information about all available parameters to help you customize your generated content.

### Key Features

- **Multiple Formats**: Create presentations, documents, webpages, or social media content
- **Text Modes**: Generate, condense, or preserve your input text
- **Image Control**: Use AI-generated images, stock photos, GIFs, or your own images
- **Customization**: Control themes, layouts, headers/footers, and more
- **Export Options**: Get PDF or PPTX exports directly from the API
- **Sharing Controls**: Set granular access permissions for workspace members and external users

## Quick Reference

### API Endpoint

```
POST https://public-api.gamma.app/v1.0/generations
GET  https://public-api.gamma.app/v1.0/generations/{generationId}
```

### Required Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `inputText` | string | Content to generate from (text and/or image URLs) |
| `textMode` | string | How to process input: `generate`, `condense`, or `preserve` |

### Commonly Used Optional Parameters

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `format` | string | `presentation` | Output type: `presentation`, `document`, `webpage`, `social` |
| `themeId` | string | workspace default | Theme ID from your workspace |
| `numCards` | integer | `10` | Number of cards to create (1-60 Pro, 1-75 Ultra) |
| `cardSplit` | string | `auto` | How to split content: `auto` or `inputTextBreaks` |
| `exportAs` | string | none | Export format: `pdf` or `pptx` |

### Example Request

```bash
curl --request POST \
     --url https://public-api.gamma.app/v1.0/generations \
     --header 'Content-Type: application/json' \
     --header 'X-API-KEY: sk-gamma-xxxxxxxx' \
     --data '{
  "inputText": "Best hikes in the United States",
  "textMode": "generate",
  "format": "presentation",
  "numCards": 10,
  "exportAs": "pdf"
}'
```

### Example Response

```json
{
  "generationId": "yyyyyyyyyy",
  "status": "completed",
  "gammaUrl": "https://gamma.app/docs/yyyyyyyyyy",
  "credits": {
    "deducted": 150,
    "remaining": 3000
  }
}
```

---

## Top level parameters


### `inputText` *(required)*

Content used to generate your gamma, including text and image URLs.

**Add images to the input**

You can provide URLs for specific images you want to include. Simply insert the URLs into your content where you want each image to appear (see example below). You can also add instructions for how to display the images in `additionalInstructions`, eg, "Group the last 10 images into a gallery to showcase them together."

Note: If you want your gamma to use only the images you provide (and not generate additional ones), set `imageOptions.source` to `noImages`.

**Token limits**

The token limit is 100,000, which is approximately 400,000 characters. However, in some cases, the token limit may be lower, especially if your use case requires extra reasoning from our AI models. We highly recommend keeping inputText below 100,000 tokens and testing out a variety of inputs to get a good sense of what works for your use case.

**Other tips**

- Text can be as little as a few words that describe the topic of the content you want to generate.
- You can also input longer text -- pages of messy notes or highly structured, detailed text.
- You can control where cards are split by adding \n---\n to the text.
- You may need to apply JSON escaping to your text. Find out more about JSON escaping and try it out here.

```json
"inputText": "Ways to use AI for productivity"
```

```json
"inputText": "# The Final Frontier: Deep Sea Exploration\n* Less than 20% of our oceans have been explored\n* Deeper than 1,000 meters remains largely mysterious\n* More people have been to space than to the deepest parts of our ocean\n\nhttps://img.genially.com/5b34eda40057f90f3a45b977/1b02d693-2456-4379-a56d-4bc5e14c6ae1.jpeg\n---\n# Technological Breakthroughs\n* Advanced submersibles capable of withstanding extreme pressure\n* ROVs (Remotely Operated Vehicles) with HD cameras and sampling tools\n* Autonomous underwater vehicles for extended mapping missions\n* Deep-sea communication networks enabling real-time data transmission\n\nhttps://images.encounteredu.com/excited-hare/production/uploads/subject-update-about-exploring-the-deep-hero.jpg?w=1200&h=630&q=82&auto=format&fit=crop&dm=1631569543&s=48f275c76c565fdaa5d4bd365246afd3\n---\n# Ecological Discoveries\n* Unique ecosystems thriving without sunlight\n* Hydrothermal vent communities using chemosynthesis\n* Creatures with remarkable adaptations: bioluminescence, pressure resistance\n* Thousands of new species discovered annually\n---\n# Scientific & Economic Value\n* Understanding climate regulation and carbon sequestration\n* Pharmaceutical potential from deep-sea organisms\n* Mineral resources and rare earth elements\n* Insights into extreme life that could exist on other planets\n\nhttps://publicinterestnetwork.org/wp-content/uploads/2023/11/Western-Pacific-Jarvis_PD_NOAA-OER.jpg\n---\n# Future Horizons\n* Expansion of deep-sea protected areas\n* Sustainable exploration balancing discovery and conservation\n* Technological miniaturization enabling broader coverage\n* Citizen science initiatives through shared deep-sea data"
```


### `textMode` *(required)*

Determines how your `inputText` is modified, if at all.

- You can choose between `generate`, `condense`, or `preserve`
- `generate`: Using your `inputText` as a starting point, Gamma will rewrite and expand the content. Works best when you have brief text in the input that you want to elaborate on.
- `condense`: Gamma will summarize your `inputText` to fit the content length you want. Works best when you start with a large amount of text that you'd like to summarize.
- `preserve`: Gamma will retain the exact text in `inputText`, sometimes structuring it where it makes sense to do so, eg, adding headings to sections. (If you do not want any modifications at all, you can specify this in the `additionalInstructions` parameter.)

```json
"textMode": "generate"
```


### `format`

Determines the artifact Gamma will create for you.

- You can choose between `presentation`, `document`, `social`, or `webpage`.
- You can use the `cardOptions.dimensions` field to further specify the shape of your output.

```json
"format": "presentation"
```


### `themeId` *(optional, defaults to workspace default theme)*

Defines which theme from Gamma will be used for the output. Themes determine the look and feel of the gamma, including colors and fonts.

- You can use the GET Themes endpoint to pull a list of themes from your workspace. Or you can copy over the themeId from the app directly.

```json
"themeId": "abc123def456ghi"
```


### `numCards`

Determines how many cards are created if `auto` is chosen in `cardSplit`

- Pro users can choose any integer between 1 and 60.
- Ultra users can choose any integer between 1 and 75.

```json
"numCards": 10
```


### `cardSplit`

Determines how your content will be divided into cards.

inputText contains \n---\n
and how many

cardSplit

numCards

output has

No

auto

9

9 cards

No

auto

left blank

10 cards (default)

No

inputTextBreaks

9

1 card

Yes, 5

auto

9

9 cards

Yes, 5

inputTextBreaks

9

6 cards

- You can choose between `auto` or `inputTextBreaks`
- Choosing `auto` tells Gamma to looks at the `numCards` field and divide up content accordingly. (It will not adhere to text breaks \n---\n in your `inputText`.)

```json
"cardSplit": "auto"
```

| inputText contains \n---\n
and how many | cardSplit | numCards | output has |
| --- | --- | --- | --- |
| No | auto | 9 | 9 cards |
| No | auto | left blank | 10 cards (default) |
| No | inputTextBreaks | 9 | 1 card |
| Yes, 5 | auto | 9 | 9 cards |
| Yes, 5 | inputTextBreaks | 9 | 6 cards |


### `additionalInstructions` *(optional)*

Helps you add more specifications about your desired output.

- You can add specifications to steer content, layouts, and other aspects of the output.
- Works best when the instructions do not conflict with other parameters, eg, if the `textMode` is defined as `condense`, and the `additionalInstructions` say to preserve all text, the output will not be able to respect these conflicting requests.
- Character limits: 1-2000.

```json
"additionalInstructions": "Make the card headings humorous and catchy"
```


### `folderIds` *(optional)*

Defines which folder(s) your gamma is stored in.

- You can use the GET Folders endpoint to pull a list of folders. Or you can copy over the folderIds from the app directly.

- You must be a member of a folder to be able to add gammas to that folder.

```json
"folderIds": ["123abc456def", "456123abcdef"]
```


### `exportAs` *(optional)*

Indicates if you'd like to return the generated gamma as a PDF or PPTX file as well as a Gamma URL.

- Options are `pdf` or `pptx`
- Download the files once generated as the links will become invalid after a period of time.
- If you do not wish to directly export to a PDF or PPTX via the API, you may always do so later via the app.

```json
"exportAs": "pdf"
```


## textOptions


### `textOptions.amount`

Influences how much text each card contains. Relevant only if `textMode` is set to `generate` or `condense`.

- You can choose between `brief`, `medium`, `detailed` or `extensive`

```json
"textOptions": {
    "amount": "detailed"
  }
```


### `textOptions.tone` *(optional)*

Defines the mood or voice of the output. Relevant only if `textMode` is set to `generate`.

- You can add one or multiple words to hone in on the mood/voice to convey.
- Character limits: 1-500.

```json
"textOptions": {
    "tone": "neutral"
  }
```

```json
"textOptions": {
    "tone": "professional, upbeat, inspiring"
  }
```


### `textOptions.audience` *(optional)*

Describes who will be reading/viewing the gamma, which allows Gamma to cater the output to the intended group. Relevant only if `textMode` is set to `generate`.

- You can add one or multiple words to hone in on the intended viewers/readers of the gamma.
- Character limits: 1-500.

```json
"textOptions": {
    "audience": "outdoors enthusiasts, adventure seekers"
  }
```

```json
"textOptions": {
    "audience": "seven year olds"
  }
```


### `textOptions.language`

Determines the language in which your gamma is generated, regardless of the language of the `inputText`.

- You can choose from the languages listed here.

```json
"textOptions": {
    "language": "en"
  }
```


## imageOptions


### `imageOptions.source`

Determines where the images for the gamma are sourced from. You can choose from the options below. If you are providing your own image URLs in `inputText` and want only those to be used, set `imageOptions.source` to `noImages` to indicate that Gamma should not generate additional images.

```json
"imageOptions": {
    "source": "aiGenerated"
  }
```

| Options for source | Notes |
| --- | --- |
| aiGenerated | If you choose this option, you can also specify the imageOptions.model you want to use as well as an imageOptions.style. These parameters do not apply to other source options. |
| pictographic | Pulls images from Pictographic. |
| unsplash | Gets images from Unsplash. |
| giphy | Gets GIFs from Giphy. |
| webAllImages | Pulls the most relevant images from the web, even if licensing is unknown. |
| webFreeToUse | Pulls images licensed for personal use. |
| webFreeToUseCommercially | Gets images licensed for commercial use, like a sales pitch. |
| placeholder | Creates a gamma with placeholders for which images can be manually added later. |
| noImages | Creates a gamma with no images. Select this option if you are providing your own image URLs in inputText and want only those in your gamma. |


### `imageOptions.model` *(optional)*

This field is relevant if the `imageOptions.source` chosen is `aiGenerated`. The `imageOptions.model` parameter determines which model is used to generate images.

- You can choose from the models listed here.
- If no value is specified for this parameter, Gamma automatically selects a model for you.

```json
"imageOptions": {
	"model": "flux-1-pro"
  }
```


### `imageOptions.style` *(optional)*

This field is relevant if the `imageOptions.source` chosen is `aiGenerated`. The `imageOptions.style` parameter influences the artistic style of the images generated. While this is an optional field, we highly recommend adding some direction here to create images in a cohesive style.

- You can add one or multiple words to define the visual style of the images you want.
- Adding some direction -- even a simple one word like "photorealistic" -- can create visual consistency among the generated images.
- Character limits: 1-500.

```json
"imageOptions": {
	"style": "minimal, black and white, line art"
  }
```


## cardOptions


### `cardOptions.dimensions` *(optional)*

Determines the aspect ratio of the cards to be generated. Fluid cards expand with your content. Not applicable if `format` is `webpage`.

- Options if `format` is `presentation`: `fluid` (default), `16x9`, `4x3`
- Options if `format` is `document`: `fluid` (default), `pageless`, `letter`, `a4`
- Options if `format` is `social`: `1x1`, `4x5` (default) (good for Instagram posts and LinkedIn carousels), `9x16` (good for Instagram and TikTok stories)

```json
"cardOptions": {
  "dimensions": "16x9"
}
```


### `cardOptions.headerFooter` *(optional)*

Allows you to specify elements in the header and footer of the cards. Not applicable if `format` is `webpage`.

- Step 1: Pick which positions you want to populate. Options: `topLeft`, `topRight`, `topCenter`, `bottomLeft`, `bottomRight`, `bottomCenter`.
- Step 2: For each position, specify what type of content goes there. Options: `text`, `image`, and `cardNumber`.
- Set the `size` . Options: `sm`, `md`, `lg`, `xl` (optional)
- For a `custom` image, define a `src` image URL (required)

- `hideFromFirstCard` (optional) - Set to `true` to hide from first card. Default: `false`
- `hideFromLastCard` (optional) - Set to `true` to hide from last card. Default: `false`

```json
"cardOptions": {
    "headerFooter": {
      "topRight": {
        "type": "image",
        "source": "themeLogo",
        "size": "sm"
      },
      "bottomRight": {
        "type": "cardNumber",
      },
      "hideFromFirstCard": "true"
    },
}
```

```json
"cardOptions": {
    "headerFooter": {
      "topRight": {
        "type": "image",
        "source": "custom",
        "src": "https://example.com/logo.png",
        "size": "md"
      },
      "bottomRight": {
        "type": "text",
        "value": "© 2025 Company™"
      },
      "hideFromFirstCard": "true",
      "hideFromLastCard": "true"
    },
}
```


## sharingOptions


### `sharingOptions.workspaceAccess` *(optional, defaults to workspace share settings)*

Determines level of access members in your workspace will have to your generated gamma.

- Options are: `noAccess`, `view`, `comment`, `edit`, `fullAccess`
- `fullAccess` allows members from your workspace to view, comment, edit, and share with others.

```json
"sharingOptions": {
	"workspaceAccess": "comment"
}
```


### `sharingOptions.externalAccess` *(optional, defaults to workspace share settings)*

Determines level of access members **outside your workspace** will have to your generated gamma.

- Options are: `noAccess`, `view`, `comment`, or `edit`

```json
"sharingOptions": {
	"externalAccess": "noAccess"
}
```


### `sharingOptions.emailOptions` *(optional)*

Allows you to share your gamma with specific recipients via their email address.

Determines level of access those specified in `sharingOptions.emailOptions.recipients` have to your generated gamma. Only workspace members can have `fullAccess`

- Options are: `view`, `comment`, `edit`, or `fullAccess`


```json
"sharingOptions": {
  "emailOptions": {
    "recipients": ["<a href="/cdn-cgi/l/email-protection" class="__cf_email__" data-cfemail="ee8d8b81ae8b968f839e828bc08d8183">[email protected]</a>", "<a href="/cdn-cgi/l/email-protection" class="__cf_email__" data-cfemail="4427302b04213c25293428216a272b29">[email protected]</a>"]
}
```

```json
"sharingOptions": {
  "emailOptions": {
    "access": "comment"
}
```


---

## Special Topics

### Markdown Input Support

Gamma supports markdown formatting in the `inputText` parameter:

- Use `#` for headings
- Use `*` or `-` for bullet points
- Use `\n---\n` to explicitly split cards
- Include image URLs directly in the text

Example:

```json
{
  "inputText": "# Main Title\n\n## Subtitle\n* Point 1\n* Point 2\n---\n# Next Card",
  "textMode": "preserve",
  "cardSplit": "inputTextBreaks"
}
```

### A4 Document Generation

To generate A4-sized documents, use the following parameters:

```json
{
  "format": "document",
  "cardOptions": {
    "dimensions": "a4"
  }
}
```

Available document dimensions:
- `fluid` - Expands with content (default)
- `pageless` - Continuous scroll
- `letter` - US Letter size (8.5" x 11")
- `a4` - A4 size (210mm x 297mm)

### Export Options (PDF/PPTX)

When using `exportAs`, the API response will include download URLs:

```json
{
  "generationId": "abc123",
  "status": "completed",
  "gammaUrl": "https://gamma.app/docs/abc123",
  "exportUrl": "https://gamma.app/exports/abc123.pdf"
}
```

**Important Notes:**
- Export URLs are temporary and expire after a period of time
- Download files immediately after generation
- PDF exports preserve all formatting and images
- PPTX exports can be edited in PowerPoint or compatible software

---

## Tips and Best Practices

### Input Text Optimization

1. **Token Limits**: Keep input under 100,000 tokens (~400,000 characters)
2. **Structure**: Use markdown formatting for better results
3. **Images**: Insert image URLs where you want them to appear
4. **Card Breaks**: Use `\n---\n` with `cardSplit: "inputTextBreaks"` for precise control

### Choosing Text Mode

- **`generate`**: Best for brief outlines that need expansion
- **`condense`**: Best for long content that needs summarization
- **`preserve`**: Best when you want minimal changes to your text

### Image Generation

For best results with AI-generated images:
1. Always specify an `imageOptions.style` (e.g., "photorealistic", "minimal")
2. Choose an appropriate `imageOptions.model`
3. Use `noImages` if providing all images via URLs in `inputText`

### Theme Selection

- Use the [List Themes API](https://developers.gamma.app/docs/list-themes-and-list-folders-apis-explained) to get available themes
- Or copy theme IDs directly from the Gamma app URL
- Themes control colors, fonts, and overall visual style

---

## Error Handling

### Common Error Responses

**Invalid Parameters (400)**
```json
{
  "message": "Input validation errors: ...",
  "statusCode": 400
}
```

**No Credits (403)**
```json
{
  "message": "Forbidden",
  "statusCode": 403
}
```

**Generation Not Found (404)**
```json
{
  "message": "Generation ID not found. generationId: xxxxxx",
  "statusCode": 404,
  "credits": {"deducted": 0, "remaining": 3000}
}
```

---

## Related Documentation

- [API Reference](https://developers.gamma.app/reference)
- [Create from Template API](https://developers.gamma.app/docs/create-from-template-parameters-explained)
- [List Themes and Folders API](https://developers.gamma.app/docs/list-themes-and-list-folders-apis-explained)
- [Get Help](https://developers.gamma.app/docs/get-help)

