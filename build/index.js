import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();
// Gamma API base
const GAMMA_API_URL = "https://public-api.gamma.app/v1.0/generations";
const GAMMA_API_KEY = process.env.GAMMA_API_KEY;
// Helper: normalize and make Gamma API requests (create + poll)
async function generatePresentation(params) {
    try {
        // Normalize parameters to the shape the Gamma Generate API expects.
        const body = {};
        // Required-ish: inputText
        body.inputText = params.inputText;
        // format (default to presentation)
        body.format = params.format || "presentation";
        // textMode: Gamma expects one of: generate | condense | preserve
        body.textMode = params.textMode || (params.textMode === undefined && params.textMode !== null ? undefined : "generate");
        // exportAs (pdf|pptx)
        if (params.exportAs)
            body.exportAs = params.exportAs;
        // numCards
        if (typeof params.numCards === "number")
            body.numCards = params.numCards;
        // AdditionalInstructions
        if (params.additionalInstructions)
            body.additionalInstructions = params.additionalInstructions;
        // Support both older flat fields and newer nested textOptions/imageOptions
        const textOptions = {};
        if (params.textAmount)
            textOptions.amount = params.textAmount; // legacy
        if (params.textOptions?.amount)
            textOptions.amount = params.textOptions.amount;
        if (params.tone)
            textOptions.tone = params.tone;
        if (params.textOptions?.tone)
            textOptions.tone = params.textOptions.tone;
        if (params.audience)
            textOptions.audience = params.audience;
        if (params.textOptions?.audience)
            textOptions.audience = params.textOptions.audience;
        if (Object.keys(textOptions).length)
            body.textOptions = textOptions;
        const imageOptions = {};
        if (params.imageModel)
            imageOptions.model = params.imageModel;
        if (params.imageStyle)
            imageOptions.style = params.imageStyle;
        if (params.imageOptions?.model)
            imageOptions.model = params.imageOptions.model;
        if (params.imageOptions?.style)
            imageOptions.style = params.imageOptions.style;
        if (params.imageOptions?.source)
            imageOptions.source = params.imageOptions.source;
        if (Object.keys(imageOptions).length)
            body.imageOptions = imageOptions;
        if (params.folderIds)
            body.folderIds = params.folderIds;
        if (params.cardSplit)
            body.cardSplit = params.cardSplit;
        if (params.themeId)
            body.themeId = params.themeId;
        if (params.format)
            body.format = params.format;
        // Make the initial create request using API key header (Gamma uses X-API-KEY)
        const createResp = await fetch(GAMMA_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "X-API-KEY": GAMMA_API_KEY || "",
            },
            body: JSON.stringify(body),
        });
        if (!createResp.ok) {
            const bodyText = await createResp.text();
            throw new Error(`HTTP error! status: ${createResp.status}, body: ${bodyText}`);
        }
        const createData = await createResp.json();
        // Gamma may return a direct viewing URL or a generationId/generationId
        // Common shapes: { generationId: "xxx" } or { id: "xxx" } or { url: "https://..." }
        if (createData.gammaUrl || createData.url || createData.exportUrl || createData.output_url || createData.outputUrl) {
            const direct = createData.gammaUrl || createData.url || createData.exportUrl || createData.output_url || createData.outputUrl;
            return { url: direct, generationId: createData.generationId || createData.generation_id || createData.id || null, error: null };
        }
        const genId = createData.generationId || createData.generation_id || createData.id || createData.generationId;
        if (!genId) {
            return { url: null, generationId: null, error: `Unexpected response shape: ${JSON.stringify(createData)}` };
        }
        // Poll status endpoint using X-API-KEY header
        const statusUrl = `${GAMMA_API_URL}/${genId}`;
        const timeoutMs = 2 * 60000; // 2 minutes total timeout for generation
        const intervalMs = 1500; // 1.5s between polls
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            const stResp = await fetch(statusUrl, {
                method: "GET",
                headers: {
                    "Accept": "application/json",
                    "X-API-KEY": GAMMA_API_KEY || "",
                },
            });
            if (!stResp.ok) {
                const errText = await stResp.text();
                throw new Error(`Status poll error! status: ${stResp.status}, body: ${errText}`);
            }
            const stData = await stResp.json();
            const status = (stData.status || stData.state || "").toString().toLowerCase();
            if (status === "completed" || status === "succeeded") {
                // look for common URL locations
                const possible = stData.gammaUrl || stData.gamma_url || stData.exportUrl || stData.export_url || stData.outputUrl || stData.output_url || stData.url;
                if (possible)
                    return { url: possible, generationId: genId, error: null };
                // outputs/exports/artifacts arrays
                const arrUrl = stData.outputs?.[0]?.url || stData.exports?.[0]?.url || stData.artifacts?.[0]?.url || stData.exports?.[0];
                if (arrUrl)
                    return { url: arrUrl, generationId: genId, error: null };
                return { url: null, generationId: genId, error: `Generation completed but no export URL found: ${JSON.stringify(stData)}` };
            }
            if (status === "failed" || status === "error") {
                return { url: null, generationId: genId, error: `Generation failed: ${JSON.stringify(stData)}` };
            }
            await new Promise((r) => setTimeout(r, intervalMs));
        }
        return { url: null, generationId: genId, error: `Timed out waiting for generation ${genId}` };
    }
    catch (err) {
        return { url: null, generationId: null, error: err?.message || String(err) };
    }
}
// Create MCP server
const server = new McpServer({
    name: "gamma-presentation",
    version: "1.0.0",
    capabilities: {
        resources: {},
        tools: {},
        prompts: {},
    },
});
// Register the generate-presentation tool
server.tool("generate-presentation", "Generate a presentation using the Gamma API. The response will include a link to the generated presentation when available.", {
    inputText: z.string().describe("The topic or prompt for the presentation."),
    // Support both old and new parameter shapes – be permissive so clients that used curl continue to work.
    textMode: z
        .enum(["generate", "condense", "preserve"]) // matches Gamma docs
        .optional()
        .describe("Text mode for Gamma API (generate | condense | preserve)."),
    format: z.string().optional().describe("Format to create (presentation | document | social | webpage)."),
    numCards: z.number().min(1).max(75).optional().describe("Number of slides/cards to generate."),
    exportAs: z.string().optional().describe("If set, request a direct export: 'pdf' or 'pptx'."),
    // Legacy / convenience fields
    textAmount: z
        .enum(["short", "medium", "long"])
        .optional()
        .describe("Legacy shorthand for text amount (kept for backward compatibility)."),
    // More flexible nested options
    textOptions: z
        .object({
        amount: z
            .enum(["brief", "medium", "detailed", "extensive"])
            .optional(),
        tone: z.string().optional(),
        audience: z.string().optional(),
        language: z.string().optional(),
    })
        .optional(),
    imageOptions: z
        .object({
        source: z.string().optional(),
        model: z.string().optional(),
        style: z.string().optional(),
    })
        .optional(),
    additionalInstructions: z.string().optional(),
    folderIds: z.array(z.string()).optional(),
    cardSplit: z.string().optional(),
    themeId: z.string().optional(),
}, async (params) => {
    // Normalize small mismatches automatically (e.g., ensure textMode exists)
    if (!params.textMode)
        params.textMode = params.textMode || "generate";
    const { url, generationId, error } = await generatePresentation(params);
    if (!url) {
        // If we have a generationId but no URL (export pending), return the generationId so client can call get-presentation-assets
        if (generationId) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Generation created (id=${generationId}). No final URL available yet. Use the get-presentation-assets tool with generationId to fetch exports. Polling error / status: ${error || "unknown"}`,
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Failed to generate presentation using Gamma API. Error: ${error || "Unknown error."}`,
                },
            ],
        };
    }
    return {
        content: [
            {
                type: "text",
                text: `Presentation generated! View it here: ${url}`,
            },
        ],
    };
});
// Register get-presentation-assets (fetch exports by generationId)
server.tool("get-presentation-assets", "Given a generationId return downloadable URLs for pdf and pptx if available, and optionally download them into the MCP server and return local paths.", {
    generationId: z.string().describe("The generationId returned by the Gamma generate API."),
    download: z.boolean().optional().describe("If true, download the assets and return local file paths."),
}, async (params) => {
    const { generationId, download } = params;
    const statusUrl = `${GAMMA_API_URL}/${generationId}`;
    try {
        const stResp = await fetch(statusUrl, {
            method: "GET",
            headers: { Accept: "application/json", "X-API-KEY": GAMMA_API_KEY || "" },
        });
        if (!stResp.ok) {
            const body = await stResp.text();
            return { content: [{ type: "text", text: `Failed to fetch generation ${generationId}: ${stResp.status} ${body}` }] };
        }
        const stData = await stResp.json();
        // Look for common export locations
        const possiblePdf = stData.exportUrl && stData.exportUrl.endsWith('.pdf') ? stData.exportUrl : (Array.isArray(stData.exports) && stData.exports.find((e) => typeof e === 'string' && e.endsWith('.pdf')))
            || stData.pdfUrl || stData.exports?.find((e) => e?.url && e.url.endsWith('.pdf'))?.url || null;
        const possiblePptx = stData.exportUrl && stData.exportUrl.endsWith('.pptx') ? stData.exportUrl : (Array.isArray(stData.exports) && stData.exports.find((e) => typeof e === 'string' && e.endsWith('.pptx')))
            || stData.pptxUrl || stData.exports?.find((e) => e?.url && e.url.endsWith('.pptx'))?.url || null;
        const resp = { generationId };
        if (possiblePdf)
            resp.pdf = possiblePdf;
        if (possiblePptx)
            resp.pptx = possiblePptx;
        if (download) {
            const downloads = {};
            const fs = await import('fs');
            const path = await import('path');
            if (possiblePdf) {
                const fname = path.join('/tmp', `${generationId}.pdf`);
                const w = fs.createWriteStream(fname);
                const r = await fetch(possiblePdf, { method: 'GET' });
                if (r.ok && r.body) {
                    await new Promise((res, rej) => {
                        const stream = r.body;
                        stream.pipe(w);
                        w.on('finish', res);
                        w.on('error', rej);
                    });
                    downloads.pdf = fname;
                }
                else {
                    downloads.pdf_error = `${r.status} ${await r.text()}`;
                }
            }
            if (possiblePptx) {
                const fname = path.join('/tmp', `${generationId}.pptx`);
                const w = fs.createWriteStream(fname);
                const r = await fetch(possiblePptx, { method: 'GET' });
                if (r.ok && r.body) {
                    await new Promise((res, rej) => {
                        const stream = r.body;
                        stream.pipe(w);
                        w.on('finish', res);
                        w.on('error', rej);
                    });
                    downloads.pptx = fname;
                }
                else {
                    downloads.pptx_error = `${r.status} ${await r.text()}`;
                }
            }
            resp.downloads = downloads;
        }
        const content = [];
        const resourceObj = { generationId };
        if (possiblePdf)
            resourceObj.pdf = possiblePdf;
        if (possiblePptx)
            resourceObj.pptx = possiblePptx;
        if (download && resp.downloads)
            resourceObj.downloads = resp.downloads;
        content.push({ type: 'resource', resource: { text: JSON.stringify(resourceObj), uri: '', mimeType: 'application/json' } });
        return { content };
    }
    catch (err) {
        return { content: [{ type: 'text', text: `Error fetching generation: ${err.message || err}` }] };
    }
});
// Register prompts for common presentation types
server.prompt("business-pitch-deck", "Generate a professional business pitch deck with investor-focused content", {
    company_name: z.string().describe("Name of the company or product"),
    industry: z.string().describe("Industry or sector (e.g., 'fintech', 'healthcare AI', 'e-commerce')"),
    stage: z.string().optional().describe("Company stage (e.g., 'seed', 'Series A', 'growth')"),
}, async (args) => {
    const companyName = args.company_name || "Your Company";
    const industry = args.industry || "technology";
    const stage = args.stage || "seed";
    return {
        messages: [
            {
                role: "user",
                content: {
                    type: "text",
                    text: `Create a professional investor pitch deck for ${companyName}, a ${stage} stage ${industry} company.

Structure the presentation with these slides:
1. Cover slide with company name and tagline
2. Problem statement (market pain points)
3. Solution overview (your product/service)
4. Market opportunity (TAM/SAM/SOM)
5. Business model (revenue streams)
6. Traction (key metrics, growth, customers)
7. Competitive landscape
8. Go-to-market strategy
9. Team (founders and key hires)
10. Financial projections (3-5 year outlook)
11. Use of funds (if raising)
12. Closing ask

Use the generate-presentation tool with these parameters:
- numCards: 12
- textAmount: medium
- tone: professional and confident
- audience: investors and venture capitalists
- imageStyle: photo-realistic and professional
- exportAs: pptx
- additionalInstructions: Include speaker notes for each slide with talking points. Use data-driven language. Add charts for metrics and financials where appropriate.`,
                },
            },
        ],
    };
});
server.prompt("product-launch", "Generate a product launch presentation for marketing and sales teams", {
    product_name: z.string().describe("Name of the product being launched"),
    target_audience: z.string().describe("Target customer segment (e.g., 'small businesses', 'enterprise IT teams')"),
    launch_date: z.string().optional().describe("Expected or actual launch date"),
}, async (args) => {
    const productName = args.product_name || "New Product";
    const targetAudience = args.target_audience || "customers";
    const launchDate = args.launch_date || "upcoming quarter";
    return {
        messages: [
            {
                role: "user",
                content: {
                    type: "text",
                    text: `Create an engaging product launch presentation for ${productName}, targeting ${targetAudience}, with a launch planned for ${launchDate}.

Structure the presentation with these slides:
1. Title slide with product name and launch date
2. Executive summary (elevator pitch)
3. Market context (why now?)
4. Product overview and key features
5. Value proposition (benefits over features)
6. Target customer personas
7. Competitive differentiation
8. Pricing and packaging
9. Go-to-market strategy
10. Marketing campaign overview
11. Sales enablement and tools
12. Success metrics and KPIs
13. Launch timeline and milestones
14. Q&A and next steps

Use the generate-presentation tool with these parameters:
- numCards: 14
- textAmount: medium
- tone: enthusiastic and persuasive
- audience: marketing and sales teams
- imageStyle: modern and vibrant
- exportAs: pptx
- additionalInstructions: Include speaker notes. Use engaging visuals. Add product screenshots or mockups where relevant. Include timeline visualizations.`,
                },
            },
        ],
    };
});
server.prompt("quarterly-business-review", "Generate a quarterly business review (QBR) presentation with metrics and insights", {
    quarter: z.string().describe("Quarter and year (e.g., 'Q3 2024')"),
    department: z.string().optional().describe("Department or business unit (e.g., 'Sales', 'Engineering', 'Company-wide')"),
}, async (args) => {
    const quarter = args.quarter || "Q4 2024";
    const department = args.department || "Company-wide";
    return {
        messages: [
            {
                role: "user",
                content: {
                    type: "text",
                    text: `Create a comprehensive quarterly business review presentation for ${quarter} - ${department}.

Structure the presentation with these slides:
1. Title slide (QBR ${quarter})
2. Executive summary
3. Key metrics dashboard
4. Quarter highlights and wins
5. Performance vs. targets
6. Revenue and financial overview
7. Customer metrics (acquisition, retention, NPS)
8. Product/service updates
9. Challenges and blockers
10. Lessons learned
11. Priorities for next quarter
12. Resource needs and asks
13. Appendix (detailed data)

Use the generate-presentation tool with these parameters:
- numCards: 13
- textAmount: medium
- tone: analytical and professional
- audience: executives and leadership team
- imageStyle: clean charts and data visualizations
- exportAs: pptx
- additionalInstructions: Include speaker notes with detailed talking points. Add placeholder charts for metrics. Use professional color scheme. Include data tables in appendix.`,
                },
            },
        ],
    };
});
server.prompt("training-workshop", "Generate an educational training or workshop presentation", {
    topic: z.string().describe("Training topic or workshop title"),
    duration: z.string().optional().describe("Workshop duration (e.g., '2 hours', 'half-day', 'full-day')"),
    skill_level: z.string().optional().describe("Audience skill level (e.g., 'beginner', 'intermediate', 'advanced')"),
}, async (args) => {
    const topic = args.topic || "Professional Development";
    const duration = args.duration || "2 hours";
    const skillLevel = args.skill_level || "intermediate";
    return {
        messages: [
            {
                role: "user",
                content: {
                    type: "text",
                    text: `Create an engaging training workshop presentation on "${topic}" for a ${duration} session targeting ${skillLevel} participants.

Structure the presentation with these slides:
1. Title slide with topic and learning objectives
2. Agenda and session overview
3. Introduction and icebreaker
4. Background and context
5. Core concept #1 (with examples)
6. Core concept #2 (with examples)
7. Core concept #3 (with examples)
8. Hands-on exercise or activity
9. Common pitfalls and how to avoid them
10. Best practices and tips
11. Real-world case studies
12. Q&A and discussion
13. Key takeaways and action items
14. Resources and next steps

Use the generate-presentation tool with these parameters:
- numCards: 14
- textAmount: medium
- tone: educational and engaging
- audience: ${skillLevel} learners and workshop participants
- imageStyle: educational diagrams and illustrations
- exportAs: pptx
- additionalInstructions: Include detailed speaker notes with facilitation tips. Add interactive elements. Use clear examples and analogies. Include exercise instructions.`,
                },
            },
        ],
    };
});
server.prompt("sales-proposal", "Generate a customized sales proposal presentation for prospects", {
    prospect_name: z.string().describe("Name of the prospect company"),
    solution: z.string().describe("Your product or solution being proposed"),
    budget_range: z.string().optional().describe("Budget range or deal size (e.g., '$50K-$100K', 'enterprise tier')"),
}, async (args) => {
    const prospectName = args.prospect_name || "Prospect Company";
    const solution = args.solution || "our solution";
    const budgetRange = args.budget_range || "standard tier";
    return {
        messages: [
            {
                role: "user",
                content: {
                    type: "text",
                    text: `Create a persuasive sales proposal presentation for ${prospectName} proposing ${solution} at ${budgetRange}.

Structure the presentation with these slides:
1. Cover slide with prospect name and date
2. Agenda
3. Understanding your challenges (prospect's pain points)
4. Our proposed solution
5. Key features and capabilities
6. Implementation roadmap
7. Success stories and case studies
8. ROI and value justification
9. Pricing and investment
10. Our team and support
11. Why choose us (differentiators)
12. Next steps and timeline
13. Appendix (detailed specs)

Use the generate-presentation tool with these parameters:
- numCards: 13
- textAmount: medium
- tone: consultative and value-focused
- audience: decision makers and procurement teams
- imageStyle: professional and trustworthy
- exportAs: pptx
- additionalInstructions: Include speaker notes with objection handling. Personalize for ${prospectName}. Add ROI calculator. Include customer testimonials and logos.`,
                },
            },
        ],
    };
});
server.prompt("conference-talk", "Generate a conference or keynote presentation", {
    talk_title: z.string().describe("Title of your talk or presentation"),
    conference: z.string().optional().describe("Conference name or event"),
    talk_length: z.string().optional().describe("Presentation length (e.g., '20 minutes', '45 minutes', '1 hour')"),
}, async (args) => {
    const talkTitle = args.talk_title || "Innovation in Technology";
    const conference = args.conference || "Industry Conference";
    const talkLength = args.talk_length || "30 minutes";
    return {
        messages: [
            {
                role: "user",
                content: {
                    type: "text",
                    text: `Create an engaging conference presentation titled "${talkTitle}" for ${conference}, designed for a ${talkLength} talk.

Structure the presentation with these slides:
1. Title slide with speaker bio
2. Hook or attention-grabber
3. Agenda and key takeaways
4. Background and context
5. The problem or challenge
6. Your unique insight or approach
7. Deep dive: Key point #1
8. Deep dive: Key point #2
9. Deep dive: Key point #3
10. Real-world examples and demos
11. Lessons learned
12. Future implications
13. Call to action
14. Thank you and contact info

Use the generate-presentation tool with these parameters:
- numCards: 14
- textAmount: short
- tone: inspiring and thought-provoking
- audience: conference attendees and industry professionals
- imageStyle: bold and impactful visuals
- exportAs: pptx
- additionalInstructions: Include minimal text per slide (presentation-style, not document-style). Add compelling visuals. Include speaker notes with timing suggestions. Design for stage presentation with high contrast.`,
                },
            },
        ],
    };
});
server.prompt("project-kickoff", "Generate a project kickoff presentation for team alignment", {
    project_name: z.string().describe("Name of the project"),
    project_duration: z.string().optional().describe("Expected project duration (e.g., '3 months', '6 weeks', 'Q1 2025')"),
}, async (args) => {
    const projectName = args.project_name || "New Project";
    const projectDuration = args.project_duration || "3 months";
    return {
        messages: [
            {
                role: "user",
                content: {
                    type: "text",
                    text: `Create a comprehensive project kickoff presentation for "${projectName}" with an expected duration of ${projectDuration}.

Structure the presentation with these slides:
1. Title slide (Project Kickoff)
2. Meeting agenda
3. Project vision and objectives
4. Success criteria and KPIs
5. Scope and deliverables
6. Team roles and responsibilities
7. Project timeline and milestones
8. Budget and resources
9. Stakeholders and communication plan
10. Risks and mitigation strategies
11. Dependencies and constraints
12. Ways of working (processes, tools)
13. First sprint/phase priorities
14. Q&A and next steps

Use the generate-presentation tool with these parameters:
- numCards: 14
- textAmount: medium
- tone: clear and collaborative
- audience: project team members and stakeholders
- imageStyle: clean diagrams and timelines
- exportAs: pptx
- additionalInstructions: Include speaker notes. Add project timeline visualization. Include RACI matrix for roles. Add risk assessment matrix. Use team-friendly language.`,
                },
            },
        ],
    };
});
server.prompt("executive-briefing", "Generate a concise executive briefing for leadership", {
    topic: z.string().describe("Topic or issue being briefed (e.g., 'Market expansion strategy', 'Security incident')"),
    urgency: z.string().optional().describe("Urgency level (e.g., 'routine', 'important', 'urgent')"),
}, async (args) => {
    const topic = args.topic || "Strategic Update";
    const urgency = args.urgency || "important";
    return {
        messages: [
            {
                role: "user",
                content: {
                    type: "text",
                    text: `Create a concise executive briefing on "${topic}" with ${urgency} priority.

Structure the presentation with these slides:
1. Cover slide with topic and date
2. Executive summary (one-page overview)
3. Situation overview
4. Key findings and insights
5. Impact analysis (financial, operational, strategic)
6. Options and recommendations
7. Risk assessment
8. Resource requirements
9. Timeline and next steps
10. Decision points for leadership
11. Appendix (supporting data)

Use the generate-presentation tool with these parameters:
- numCards: 11
- textAmount: short
- tone: direct and action-oriented
- audience: C-level executives and board members
- imageStyle: executive-level charts and infographics
- exportAs: pptx
- additionalInstructions: Use concise bullet points. Lead with conclusions. Include detailed data in appendix. Add decision framework. Highlight critical path items. Use executive summary format.`,
                },
            },
        ],
    };
});
server.prompt("investor-update", "Generate an investor update presentation for stakeholders", {
    period: z.string().describe("Update period (e.g., 'Q2 2024', 'Monthly - June', 'Annual 2024')"),
    company_name: z.string().optional().describe("Company name"),
}, async (args) => {
    const period = args.period || "Q1 2024";
    const companyName = args.company_name || "Company";
    return {
        messages: [
            {
                role: "user",
                content: {
                    type: "text",
                    text: `Create an investor update presentation for ${companyName} covering ${period}.

Structure the presentation with these slides:
1. Cover slide (Investor Update - ${period})
2. Executive summary highlights
3. Financial performance (revenue, burn, runway)
4. Key metrics and KPIs
5. Product developments and releases
6. Customer growth and traction
7. Market position and competitive landscape
8. Team growth and key hires
9. Milestones achieved
10. Challenges and how we're addressing them
11. Outlook and priorities
12. Capital needs (if applicable)
13. Ask and next steps

Use the generate-presentation tool with these parameters:
- numCards: 13
- textAmount: medium
- tone: transparent and confident
- audience: investors, board members, and advisors
- imageStyle: professional financial charts
- exportAs: pptx
- additionalInstructions: Include detailed speaker notes. Add financial charts and growth metrics. Use consistent formatting. Include YoY and MoM comparisons. Highlight both wins and challenges transparently.`,
                },
            },
        ],
    };
});
server.prompt("all-hands-meeting", "Generate an all-hands company meeting presentation", {
    date: z.string().describe("Meeting date or period (e.g., 'December 2024', 'End of Year')"),
    company_size: z.string().optional().describe("Approximate company size (e.g., 'startup 20 people', 'mid-size 200', 'enterprise')"),
}, async (args) => {
    const date = args.date || "This Month";
    const companySize = args.company_size || "growing company";
    return {
        messages: [
            {
                role: "user",
                content: {
                    type: "text",
                    text: `Create an engaging all-hands company meeting presentation for ${date} at a ${companySize}.

Structure the presentation with these slides:
1. Welcome and agenda
2. Company vision and mission reminder
3. Recent wins and achievements
4. Business performance overview
5. Product updates and roadmap
6. Customer success stories
7. Team growth and new hires
8. Department spotlights
9. Company values in action
10. Challenges and learnings
11. Looking ahead (priorities)
12. Q&A
13. Team recognition and shoutouts
14. Closing and next all-hands date

Use the generate-presentation tool with these parameters:
- numCards: 14
- textAmount: medium
- tone: inspiring and inclusive
- audience: entire company, all departments
- imageStyle: vibrant and team-oriented
- exportAs: pptx
- additionalInstructions: Include engaging visuals. Add team photos or celebrations. Use accessible language for all roles. Include interactive Q&A section. Celebrate wins and recognize contributors. Keep morale-building tone.`,
                },
            },
        ],
    };
});
// Start server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Gamma MCP Server running on stdio");
}
main().catch((error) => {
    console.error(error);
    process.exit(1);
});
