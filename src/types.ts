// ─────────────────────────────────────────────
//  Figma API Type Definitions & Zod Schemas
// ─────────────────────────────────────────────
import { z } from "zod";

// ── Figma REST API Shapes ──────────────────────

export interface FigmaColor {
    r: number;
    g: number;
    b: number;
    a: number;
}

export interface FigmaRectangle {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface FigmaTypeStyle {
    fontFamily: string;
    fontPostScriptName?: string;
    fontWeight: number;
    fontSize: number;
    lineHeightPx?: number;
    letterSpacing?: number;
    textCase?: string;
    textDecoration?: string;
    textAlignHorizontal?: string;
    textAlignVertical?: string;
}

export interface FigmaPaint {
    type: string;
    visible?: boolean;
    opacity?: number;
    color?: FigmaColor;
    gradientStops?: Array<{ color: FigmaColor; position: number }>;
    imageRef?: string;
    scaleMode?: string;
}

export interface FigmaEffect {
    type: string;
    visible?: boolean;
    radius?: number;
    color?: FigmaColor;
    blendMode?: string;
    offset?: { x: number; y: number };
    spread?: number;
}

export interface FigmaNode {
    id: string;
    name: string;
    type: string;
    visible?: boolean;
    children?: FigmaNode[];
    // Layout
    absoluteBoundingBox?: FigmaRectangle;
    absoluteRenderBounds?: FigmaRectangle;
    constraints?: { vertical: string; horizontal: string };
    layoutMode?: string;
    primaryAxisAlignItems?: string;
    counterAxisAlignItems?: string;
    primaryAxisSizingMode?: string;
    counterAxisSizingMode?: string;
    itemSpacing?: number;
    paddingLeft?: number;
    paddingRight?: number;
    paddingTop?: number;
    paddingBottom?: number;
    // Appearance
    fills?: FigmaPaint[];
    strokes?: FigmaPaint[];
    strokeWeight?: number;
    strokeAlign?: string;
    cornerRadius?: number;
    rectangleCornerRadii?: number[];
    effects?: FigmaEffect[];
    opacity?: number;
    blendMode?: string;
    // Text
    characters?: string;
    style?: FigmaTypeStyle;
    // Component
    componentId?: string;
    componentProperties?: Record<string, unknown>;
}

export interface FigmaFile {
    name: string;
    lastModified: string;
    thumbnailUrl?: string;
    version: string;
    document: FigmaNode;
    components: Record<string, FigmaComponent>;
    componentSets: Record<string, FigmaComponentSet>;
    styles: Record<string, FigmaStyle>;
    schemaVersion: number;
}

export interface FigmaComponent {
    key: string;
    name: string;
    description: string;
    componentSetId?: string;
    documentationLinks?: Array<{ uri: string }>;
}

export interface FigmaComponentSet {
    key: string;
    name: string;
    description: string;
}

export interface FigmaStyle {
    key: string;
    name: string;
    description: string;
    styleType: "FILL" | "TEXT" | "EFFECT" | "GRID";
}

export interface FigmaComment {
    id: string;
    message: string;
    created_at: string;
    resolved_at?: string;
    user: { handle: string; img_url?: string };
    client_meta?: {
        node_id?: string;
        node_offset?: { x: number; y: number };
    };
}

export interface FigmaVariable {
    id: string;
    name: string;
    resolvedType: "BOOLEAN" | "FLOAT" | "STRING" | "COLOR";
    valuesByMode: Record<string, unknown>;
    variableCollectionId: string;
    description?: string;
}

export interface FigmaVariableCollection {
    id: string;
    name: string;
    modes: Array<{ modeId: string; name: string }>;
    defaultModeId: string;
    variableIds: string[];
}

export interface FigmaTeamProject {
    id: string;
    name: string;
}

export interface FigmaProjectFile {
    key: string;
    name: string;
    thumbnail_url?: string;
    last_modified: string;
}

// ── MCP Tool Input Schemas (Zod) ───────────────

export const GetFileSchema = z.object({
    file_key: z.string().describe("The Figma file key (found in the file URL)"),
    depth: z
        .number()
        .optional()
        .describe("Depth of the node tree to return (default: full tree)"),
});

export const GetFileNodesSchema = z.object({
    file_key: z.string().describe("The Figma file key"),
    node_ids: z
        .string()
        .describe(
            "Comma-separated list of node IDs to fetch (e.g. '1:2,1:3')"
        ),
    depth: z
        .number()
        .optional()
        .describe("Depth of node tree to return"),
});

export const GetImagesSchema = z.object({
    file_key: z.string().describe("The Figma file key"),
    node_ids: z
        .string()
        .describe("Comma-separated list of node IDs to export"),
    format: z
        .enum(["jpg", "png", "svg", "pdf"])
        .default("png")
        .describe("Image format"),
    scale: z
        .number()
        .min(0.01)
        .max(4)
        .default(1)
        .describe("Export scale (0.01–4)"),
});

export const GetFileStylesSchema = z.object({
    file_key: z.string().describe("The Figma file key"),
});

export const GetFileComponentsSchema = z.object({
    file_key: z.string().describe("The Figma file key"),
});

export const GetCommentsSchema = z.object({
    file_key: z.string().describe("The Figma file key"),
});

export const PostCommentSchema = z.object({
    file_key: z.string().describe("The Figma file key"),
    message: z.string().describe("The comment message text"),
    node_id: z
        .string()
        .optional()
        .describe("Optional: pin the comment to a specific node ID"),
});

export const GetTeamProjectsSchema = z.object({
    team_id: z.string().describe("The Figma team ID"),
});

export const GetProjectFilesSchema = z.object({
    project_id: z.string().describe("The Figma project ID"),
});

export const GetLocalVariablesSchema = z.object({
    file_key: z.string().describe("The Figma file key"),
});

export const ExtractDesignTokensSchema = z.object({
    file_key: z.string().describe("The Figma file key"),
});

export const DesignToCodeSchema = z.object({
    file_key: z.string().describe("The Figma file key"),
    node_id: z
        .string()
        .describe(
            "The node ID of the frame or component to convert (e.g. '1:234')"
        ),
    tech_stack: z
        .enum([
            "react",
            "react-tailwind",
            "vue",
            "next",
            "html",
            "flutter",
            "react-native",
            "svelte",
            "angular",
        ])
        .describe("Target tech stack for code generation"),
    include_images: z
        .boolean()
        .default(false)
        .describe("Whether to include image export URLs for image fills"),
});

export type TechStack = z.infer<typeof DesignToCodeSchema>["tech_stack"];
