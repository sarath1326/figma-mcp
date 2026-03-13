#!/usr/bin/env node
// ─────────────────────────────────────────────
//  Figma MCP Server — Main Entry Point
// ─────────────────────────────────────────────
import "dotenv/config";
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";



import { FigmaClient } from "./figma-client.js";
import {
    simplifyNode,
    extractDesignTokens,
    nodeToCodeContext,
} from "./utils.js";
import {
    GetFileSchema,
    GetFileNodesSchema,
    GetImagesSchema,
    GetFileStylesSchema,
    GetFileComponentsSchema,
    GetCommentsSchema,
    PostCommentSchema,
    GetTeamProjectsSchema,
    GetProjectFilesSchema,
    GetLocalVariablesSchema,
    ExtractDesignTokensSchema,
    DesignToCodeSchema,
} from "./types.js";

// ── Bootstrap ──────────────────────────────────

const token = process.env.FIGMA_ACCESS_TOKEN;
if (!token) {
    console.error(
        "[figma-mcp] ERROR: FIGMA_ACCESS_TOKEN environment variable is not set.\n" +
        "  Create a .env file with: FIGMA_ACCESS_TOKEN=your_token_here\n" +
        "  Get a token at: Figma → Settings → Security → Personal Access Tokens"
    );
    process.exit(1);
}

const figma = new FigmaClient(token);

const server = new McpServer({
    name: "figma-mcp",
    version: "1.0.0",
});

// ── Helper ─────────────────────────────────────

function ok(data: unknown) {
    return {
        content: [
            {
                type: "text" as const,
                text: typeof data === "string" ? data : JSON.stringify(data, null, 2),
            },
        ],
    };
}

function err(message: string) {
    return {
        content: [{ type: "text" as const, text: `ERROR: ${message}` }],
        isError: true,
    };
}

async function safeCall<T>(fn: () => Promise<T>) {
    try {
        return ok(await fn());
    } catch (e: unknown) {
        const message =
            e instanceof Error ? e.message : "Unknown error occurred";
        const axiosData = (e as { response?: { data?: unknown } })?.response?.data;
        return err(axiosData ? JSON.stringify(axiosData) : message);
    }
}

// ── Tool: get_file ─────────────────────────────

server.tool(
    "get_file",
    "Fetch a Figma file by key. Returns file name, pages, component list, styles, and the full document node tree.",
    GetFileSchema.shape,
    async ({ file_key, depth }) => {
        return safeCall(async () => {
            const file = await figma.getFile(file_key, depth);
            return {
                name: file.name,
                lastModified: file.lastModified,
                version: file.version,
                thumbnailUrl: file.thumbnailUrl,
                pages: file.document.children?.map((p) => ({
                    id: p.id,
                    name: p.name,
                    childCount: p.children?.length ?? 0,
                })),
                componentCount: Object.keys(file.components ?? {}).length,
                styleCount: Object.keys(file.styles ?? {}).length,
                document: simplifyNode(file.document),
            };
        });
    }
);

// ── Tool: get_file_nodes ───────────────────────

server.tool(
    "get_file_nodes",
    "Get one or more specific nodes from a Figma file by their node IDs.",
    GetFileNodesSchema.shape,
    async ({ file_key, node_ids, depth }) => {
        return safeCall(async () => {
            const ids = node_ids.split(",").map((id) => id.trim());
            const result = await figma.getFileNodes(file_key, ids, depth);
            const simplified: Record<string, unknown> = {};
            for (const [id, value] of Object.entries(result.nodes)) {
                simplified[id] = value?.document
                    ? simplifyNode(value.document)
                    : null;
            }
            return simplified;
        });
    }
);

// ── Tool: get_images ───────────────────────────

server.tool(
    "get_images",
    "Export one or more Figma nodes as images. Returns URLs for each exported node.",
    GetImagesSchema.shape,
    async ({ file_key, node_ids, format, scale }) => {
        return safeCall(async () => {
            const ids = node_ids.split(",").map((id) => id.trim());
            return figma.getImages(file_key, ids, format, scale);
        });
    }
);

// ── Tool: get_file_styles ──────────────────────

server.tool(
    "get_file_styles",
    "List all published styles (colors, text, effects, grids) in a Figma file.",
    GetFileStylesSchema.shape,
    async ({ file_key }) => {
        return safeCall(() => figma.getFileStyles(file_key));
    }
);

// ── Tool: get_file_components ──────────────────

server.tool(
    "get_file_components",
    "List all published components and component sets in a Figma file.",
    GetFileComponentsSchema.shape,
    async ({ file_key }) => {
        return safeCall(() => figma.getFileComponents(file_key));
    }
);

// ── Tool: get_comments ─────────────────────────

server.tool(
    "get_comments",
    "Get all comments on a Figma file, including resolved comments and their authors.",
    GetCommentsSchema.shape,
    async ({ file_key }) => {
        return safeCall(() => figma.getComments(file_key));
    }
);

// ── Tool: post_comment ─────────────────────────

server.tool(
    "post_comment",
    "Post a new comment on a Figma file. Optionally pin it to a specific node.",
    PostCommentSchema.shape,
    async ({ file_key, message, node_id }) => {
        return safeCall(() => figma.postComment(file_key, message, node_id));
    }
);

// ── Tool: get_team_projects ────────────────────

server.tool(
    "get_team_projects",
    "List all projects in a Figma team.",
    GetTeamProjectsSchema.shape,
    async ({ team_id }) => {
        return safeCall(() => figma.getTeamProjects(team_id));
    }
);

// ── Tool: get_project_files ────────────────────

server.tool(
    "get_project_files",
    "List all files inside a Figma project.",
    GetProjectFilesSchema.shape,
    async ({ project_id }) => {
        return safeCall(() => figma.getProjectFiles(project_id));
    }
);

// ── Tool: get_local_variables ──────────────────

server.tool(
    "get_local_variables",
    "Get all local variables and variable collections in a Figma file (design tokens, themes).",
    GetLocalVariablesSchema.shape,
    async ({ file_key }) => {
        return safeCall(() => figma.getLocalVariables(file_key));
    }
);

// ── Tool: extract_design_tokens ────────────────

server.tool(
    "extract_design_tokens",
    "Extract colors, typography styles, and spacing values from a Figma file as structured design tokens.",
    ExtractDesignTokensSchema.shape,
    async ({ file_key }) => {
        return safeCall(async () => {
            const file = await figma.getFile(file_key);
            return extractDesignTokens(file);
        });
    }
);

// ── Tool: design_to_code ───────────────────────

server.tool(
    "design_to_code",
    `Generate production-ready code from a Figma node for a specified tech stack.
Supported stacks: react, react-tailwind, vue, next, html, flutter, react-native, svelte, angular.
Returns a rich structured context (layout tree, colors, fonts, spacing, shadows) that you should use to immediately write the component code.`,
    DesignToCodeSchema.shape,
    async ({ file_key, node_id, tech_stack, include_images }) => {
        return safeCall(async () => {
            // 1. Fetch the target node
            const result = await figma.getFileNodes(file_key, [node_id]);
            const nodeEntry = result.nodes[node_id];
            if (!nodeEntry?.document) {
                throw new Error(
                    `Node "${node_id}" not found in file "${file_key}". ` +
                    `Check the node ID in the Figma URL (right-click a layer → Copy/Paste → Copy link).`
                );
            }

            // 2. Simplify the node tree
            const simplified = simplifyNode(nodeEntry.document);

            // 3. Optionally export images
            let imageUrls: Record<string, string | null> | undefined;
            if (include_images) {
                const imgResult = await figma.getImages(file_key, [node_id], "png", 2);
                imageUrls = imgResult.images;
            }

            // 4. Build code-generation context
            const context = nodeToCodeContext(simplified, tech_stack, imageUrls);

            return {
                instructions: context,
                _meta: {
                    nodeId: node_id,
                    nodeName: nodeEntry.document.name,
                    nodeType: nodeEntry.document.type,
                    techStack: tech_stack,
                    dimensions: {
                        width: simplified.width,
                        height: simplified.height,
                    },
                },
            };
        });
    }
);

// ── Resources ──────────────────────────────────

server.resource(
    "figma-file",
    new ResourceTemplate("figma://file/{file_key}", { list: undefined }),
    async (uri, { file_key }) => {
        const key = Array.isArray(file_key) ? file_key[0] : file_key;
        try {
            const file = await figma.getFile(key);
            return {
                contents: [
                    {
                        uri: uri.href,
                        mimeType: "application/json",
                        text: JSON.stringify(
                            {
                                name: file.name,
                                lastModified: file.lastModified,
                                version: file.version,
                                document: simplifyNode(file.document),
                            },
                            null,
                            2
                        ),
                    },
                ],
            };
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            return { contents: [{ uri: uri.href, text: `Error: ${msg}` }] };
        }
    }
);

server.resource(
    "figma-nodes",
    new ResourceTemplate("figma://file/{file_key}/nodes/{node_ids}", { list: undefined }),
    async (uri, { file_key, node_ids }) => {
        const key = Array.isArray(file_key) ? file_key[0] : file_key;
        const rawIds = Array.isArray(node_ids) ? node_ids[0] : node_ids;
        const nodeIds = rawIds.split(",").map((id: string) => id.trim());
        try {
            const result = await figma.getFileNodes(key, nodeIds);
            const simplified: Record<string, unknown> = {};
            for (const [id, value] of Object.entries(result.nodes)) {
                simplified[id] = value?.document ? simplifyNode(value.document) : null;
            }
            return {
                contents: [
                    {
                        uri: uri.href,
                        mimeType: "application/json",
                        text: JSON.stringify(simplified, null, 2),
                    },
                ],
            };
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            return { contents: [{ uri: uri.href, text: `Error: ${msg}` }] };
        }
    }
);

// ── Start ──────────────────────────────────────

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("[figma-mcp] Server running on stdio. Ready for connections.");
}

main().catch((e) => {
    console.error("[figma-mcp] Fatal error:", e);
    process.exit(1);
});
