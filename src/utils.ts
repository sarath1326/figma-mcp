// ─────────────────────────────────────────────
//  Utility Functions & Design Helpers
// ─────────────────────────────────────────────
import type { FigmaColor, FigmaNode, FigmaFile, FigmaPaint, FigmaEffect } from "./types.js";
import type { TechStack } from "./types.js";

// ── Color Helpers ──────────────────────────────

/** Convert a Figma RGBA (0–1 floats) to a CSS hex or rgba string */
export function formatColor(color: FigmaColor): string {
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    const a = color.a;

    if (a >= 0.999) {
        return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
    }
    return `rgba(${r}, ${g}, ${b}, ${Math.round(a * 100) / 100})`;
}

function paintToCSS(paint: FigmaPaint): string {
    if (!paint.visible && paint.visible !== undefined) return "transparent";
    if (paint.type === "SOLID" && paint.color) {
        const c = { ...paint.color, a: (paint.color.a ?? 1) * (paint.opacity ?? 1) };
        return formatColor(c);
    }
    if (paint.type === "IMAGE") return `url(imageRef:${paint.imageRef})`;
    if (
        (paint.type === "GRADIENT_LINEAR" ||
            paint.type === "GRADIENT_RADIAL" ||
            paint.type === "GRADIENT_ANGULAR") &&
        paint.gradientStops
    ) {
        const stops = paint.gradientStops
            .map((s) => `${formatColor(s.color)} ${Math.round(s.position * 100)}%`)
            .join(", ");
        const dir =
            paint.type === "GRADIENT_RADIAL" ? "radial-gradient" : "linear-gradient";
        return `${dir}(${stops})`;
    }
    return paint.type.toLowerCase();
}

function effectToCSS(effect: FigmaEffect): string {
    if (!effect.visible && effect.visible !== undefined) return "";
    if (
        (effect.type === "DROP_SHADOW" || effect.type === "INNER_SHADOW") &&
        effect.color &&
        effect.offset
    ) {
        const inset = effect.type === "INNER_SHADOW" ? "inset " : "";
        return `${inset}${effect.offset.x}px ${effect.offset.y}px ${effect.radius ?? 0}px ${effect.spread ?? 0}px ${formatColor(effect.color)}`;
    }
    if (effect.type === "LAYER_BLUR" || effect.type === "BACKGROUND_BLUR") {
        return `blur(${effect.radius ?? 0}px)`;
    }
    return "";
}

// ── Node Simplifier ────────────────────────────

export interface SimplifiedNode {
    id: string;
    name: string;
    type: string;
    visible: boolean;
    // Layout
    width?: number;
    height?: number;
    x?: number;
    y?: number;
    layoutMode?: string; // HORIZONTAL | VERTICAL | NONE
    primaryAxisAlign?: string;
    counterAxisAlign?: string;
    gap?: number;
    padding?: { top: number; right: number; bottom: number; left: number };
    // Appearance
    backgroundColor?: string;
    fills?: string[];
    strokes?: string[];
    strokeWeight?: number;
    borderRadius?: number | number[];
    opacity?: number;
    boxShadow?: string[];
    blur?: string;
    // Text content
    text?: string;
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: number;
    lineHeight?: number;
    letterSpacing?: number;
    textAlign?: string;
    textColor?: string;
    // Children
    children?: SimplifiedNode[];
}

/** Recursively simplify a Figma node tree, dropping verbose/internal fields */
export function simplifyNode(node: FigmaNode): SimplifiedNode {
    const simplified: SimplifiedNode = {
        id: node.id,
        name: node.name,
        type: node.type,
        visible: node.visible !== false,
    };

    // Dimensions
    if (node.absoluteBoundingBox) {
        simplified.width = Math.round(node.absoluteBoundingBox.width);
        simplified.height = Math.round(node.absoluteBoundingBox.height);
        simplified.x = Math.round(node.absoluteBoundingBox.x);
        simplified.y = Math.round(node.absoluteBoundingBox.y);
    }

    // Auto-layout
    if (node.layoutMode && node.layoutMode !== "NONE") {
        simplified.layoutMode = node.layoutMode;
        simplified.primaryAxisAlign = node.primaryAxisAlignItems;
        simplified.counterAxisAlign = node.counterAxisAlignItems;
        simplified.gap = node.itemSpacing;
        const p = {
            top: node.paddingTop ?? 0,
            right: node.paddingRight ?? 0,
            bottom: node.paddingBottom ?? 0,
            left: node.paddingLeft ?? 0,
        };
        if (Object.values(p).some((v) => v > 0)) simplified.padding = p;
    }

    // Fills
    if (node.fills && node.fills.length > 0) {
        const fillStrings = node.fills
            .filter((f) => f.visible !== false)
            .map(paintToCSS);
        if (fillStrings.length > 0) simplified.fills = fillStrings;
    }

    // Strokes
    if (node.strokes && node.strokes.length > 0) {
        simplified.strokes = node.strokes
            .filter((s) => s.visible !== false)
            .map(paintToCSS);
        simplified.strokeWeight = node.strokeWeight;
    }

    // Border radius
    if (node.rectangleCornerRadii && node.rectangleCornerRadii.some((r) => r > 0)) {
        simplified.borderRadius = node.rectangleCornerRadii;
    } else if (node.cornerRadius && node.cornerRadius > 0) {
        simplified.borderRadius = node.cornerRadius;
    }

    // Opacity
    if (node.opacity !== undefined && node.opacity < 1) {
        simplified.opacity = node.opacity;
    }

    // Effects: shadows & blur
    if (node.effects && node.effects.length > 0) {
        const shadows = node.effects
            .filter(
                (e) =>
                    (e.type === "DROP_SHADOW" || e.type === "INNER_SHADOW") &&
                    e.visible !== false
            )
            .map(effectToCSS)
            .filter(Boolean);
        if (shadows.length > 0) simplified.boxShadow = shadows;

        const blurEffect = node.effects.find(
            (e) =>
                (e.type === "LAYER_BLUR" || e.type === "BACKGROUND_BLUR") &&
                e.visible !== false
        );
        if (blurEffect) simplified.blur = effectToCSS(blurEffect);
    }

    // Text
    if (node.type === "TEXT" && node.characters !== undefined) {
        simplified.text = node.characters;
        if (node.style) {
            simplified.fontFamily = node.style.fontFamily;
            simplified.fontSize = node.style.fontSize;
            simplified.fontWeight = node.style.fontWeight;
            simplified.lineHeight = node.style.lineHeightPx
                ? Math.round(node.style.lineHeightPx)
                : undefined;
            simplified.letterSpacing = node.style.letterSpacing;
            simplified.textAlign = node.style.textAlignHorizontal?.toLowerCase();
        }
        // Text colour from fills
        if (node.fills && node.fills[0]?.color) {
            simplified.textColor = formatColor(node.fills[0].color);
        }
    }

    // Recurse children
    if (node.children && node.children.length > 0) {
        simplified.children = node.children.map(simplifyNode);
    }

    return simplified;
}

// ── Design Tokens Extractor ────────────────────

export interface DesignTokens {
    colors: Record<string, string>;
    typography: Record<
        string,
        {
            fontFamily: string;
            fontSize: number;
            fontWeight: number;
            lineHeight?: number;
        }
    >;
    spacing: number[];
}

/** Walk a Figma file and extract colour, typography, and spacing tokens */
export function extractDesignTokens(file: FigmaFile): DesignTokens {
    const colors: Record<string, string> = {};
    const typography: DesignTokens["typography"] = {};
    const spacingSet = new Set<number>();

    function walk(node: FigmaNode) {
        // Colors from fills
        if (node.fills) {
            for (const fill of node.fills) {
                if (fill.type === "SOLID" && fill.color && fill.visible !== false) {
                    const key = node.name.replace(/\s+/g, "-").toLowerCase();
                    colors[key] = formatColor(fill.color);
                }
            }
        }

        // Typography
        if (node.type === "TEXT" && node.style) {
            const key = `${node.style.fontFamily.replace(/\s+/g, "-")}-${node.style.fontWeight}-${node.style.fontSize}`;
            typography[key] = {
                fontFamily: node.style.fontFamily,
                fontSize: node.style.fontSize,
                fontWeight: node.style.fontWeight,
                lineHeight: node.style.lineHeightPx
                    ? Math.round(node.style.lineHeightPx)
                    : undefined,
            };
        }

        // Spacing from padding/gap
        if (node.paddingTop) spacingSet.add(node.paddingTop);
        if (node.paddingRight) spacingSet.add(node.paddingRight);
        if (node.paddingBottom) spacingSet.add(node.paddingBottom);
        if (node.paddingLeft) spacingSet.add(node.paddingLeft);
        if (node.itemSpacing) spacingSet.add(node.itemSpacing);

        if (node.children) node.children.forEach(walk);
    }

    walk(file.document);

    return {
        colors,
        typography,
        spacing: Array.from(spacingSet).sort((a, b) => a - b),
    };
}

// ── Design-to-Code Context Builder ────────────

const TECH_STACK_HINTS: Record<TechStack, string> = {
    react: `Generate a React functional component using CSS Modules.
- Use .tsx extension
- Import styles from a companion .module.css file
- Use className={styles.xyz} pattern
- Prefer semantic HTML (div, section, button, p, h1-h6, img, etc.)
- Export the component as default`,

    "react-tailwind": `Generate a React functional component using Tailwind CSS.
- Use .tsx extension
- Apply Tailwind utility classes directly via className
- Do NOT use inline styles or separate CSS files
- Use responsive classes where applicable (sm:, md:, lg:)
- Export the component as default`,

    vue: `Generate a Vue 3 Single File Component (.vue) using the Composition API.
- Use <script setup lang="ts"> syntax
- Use <style scoped> for component styles
- Use CSS custom properties for design tokens
- Export nothing (SFC doesn't need explicit export)`,

    next: `Generate a Next.js React Server Component using CSS Modules.
- Use .tsx extension
- Import styles from a companion .module.css file
- Use 'use client' directive only if interactive state is needed
- Use Next.js Image component (<Image>) for images
- Export the component as default`,

    html: `Generate plain HTML with an embedded or companion CSS file.
- Use semantic HTML5 elements
- Write clean, readable CSS in a <style> block or companion file
- Use CSS custom properties (--color-xxx) for design tokens
- No JavaScript frameworks`,

    flutter: `Generate Flutter Dart widget code.
- Use StatelessWidget or StatefulWidget appropriately
- Map fills to Color() / BoxDecoration
- Map auto-layout to Row/Column/Flex/Wrap
- Map text styles to TextStyle()
- Map border-radius to BorderRadius.circular()
- Return a complete Widget build() method`,

    "react-native": `Generate a React Native component using StyleSheet.
- Use .tsx extension
- Use View, Text, Image, TouchableOpacity, ScrollView, etc.
- Create styles with StyleSheet.create({}) at bottom of file
- Map auto-layout flexbox to flexDirection/justifyContent/alignItems
- Export the component as default`,

    svelte: `Generate a Svelte 4 component (.svelte).
- Use <script lang="ts"> block at top
- Use <style> block at bottom with scoped CSS
- Use CSS custom properties for design tokens
- Keep the template clean and semantic`,

    angular: `Generate an Angular standalone component.
- Use @Component({ standalone: true, ... }) decorator
- Write the template inline or as a companion .html file
- Write styles as a companion .scss file
- Use Angular directives (@for, @if) where needed
- Export as a standalone component class`,
};

/**
 * Build a rich, structured code-generation context from a simplified node tree.
 * The returned string is meant to be provided as context to an AI agent that
 * will then generate the actual code.
 */
export function nodeToCodeContext(
    node: SimplifiedNode,
    techStack: TechStack,
    imageUrls?: Record<string, string | null>
): string {
    const hint = TECH_STACK_HINTS[techStack];

    const lines: string[] = [
        `# Design-to-Code Context`,
        ``,
        `## Target Tech Stack: ${techStack}`,
        ``,
        `### Instructions`,
        hint,
        ``,
        `## Component: "${node.name}"`,
        `Root type: ${node.type}`,
        `Dimensions: ${node.width ?? "auto"} × ${node.height ?? "auto"} px`,
        ``,
        `## Design Tree (JSON)`,
        "```json",
        JSON.stringify(node, null, 2),
        "```",
    ];

    if (imageUrls && Object.keys(imageUrls).length > 0) {
        lines.push(``, `## Image Export URLs`, "```json");
        lines.push(JSON.stringify(imageUrls, null, 2));
        lines.push("```");
    }

    lines.push(
        ``,
        `## Code Generation Rules`,
        `1. Reproduce the layout as faithfully as possible using the dimensions and spacing above.`,
        `2. Use the exact hex colors provided — do not approximate.`,
        `3. Respect font family, size, weight, and line-height values.`,
        `4. Convert auto-layout (HORIZONTAL/VERTICAL) to flexbox or equivalent.`,
        `5. Apply border-radius, box-shadow, and opacity where specified.`,
        `6. Use descriptive, semantic names for variables and classes (derived from node names).`,
        `7. Do NOT add any functionality not implied by the design.`,
        `8. Add brief comments for any non-obvious CSS or styling choice.`
    );

    return lines.join("\n");
}
