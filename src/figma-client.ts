// ─────────────────────────────────────────────
//  Figma REST API Client
// ─────────────────────────────────────────────
import axios, { AxiosInstance } from "axios";
import type {
    FigmaFile,
    FigmaNode,
    FigmaComponent,
    FigmaStyle,
    FigmaComment,
    FigmaVariable,
    FigmaVariableCollection,
    FigmaTeamProject,
    FigmaProjectFile,
} from "./types.js";

const FIGMA_BASE_URL = "https://api.figma.com/v1";

export class FigmaClient {
    private http: AxiosInstance;

    constructor(accessToken: string) {
        this.http = axios.create({
            baseURL: FIGMA_BASE_URL,
            headers: {
                "X-Figma-Token": accessToken,
                "Content-Type": "application/json",
            },
        });
    }

    // ── Files ──────────────────────────────────

    async getFile(fileKey: string, depth?: number): Promise<FigmaFile> {
        const params: Record<string, string | number> = {};
        if (depth !== undefined) params.depth = depth;
        const res = await this.http.get(`/files/${fileKey}`, { params });
        return res.data;
    }

    async getFileNodes(
        fileKey: string,
        nodeIds: string[],
        depth?: number
    ): Promise<{ nodes: Record<string, { document: FigmaNode }> }> {
        const params: Record<string, string | number> = {
            ids: nodeIds.join(","),
        };
        if (depth !== undefined) params.depth = depth;
        const res = await this.http.get(`/files/${fileKey}/nodes`, { params });
        return res.data;
    }

    // ── Exports ────────────────────────────────

    async getImages(
        fileKey: string,
        nodeIds: string[],
        format: "jpg" | "png" | "svg" | "pdf" = "png",
        scale: number = 1
    ): Promise<{ images: Record<string, string | null> }> {
        const res = await this.http.get(`/images/${fileKey}`, {
            params: {
                ids: nodeIds.join(","),
                format,
                scale,
            },
        });
        return res.data;
    }

    // ── Styles & Components ────────────────────

    async getFileStyles(
        fileKey: string
    ): Promise<{ meta: { styles: FigmaStyle[] } }> {
        const res = await this.http.get(`/files/${fileKey}/styles`);
        return res.data;
    }

    async getFileComponents(
        fileKey: string
    ): Promise<{ meta: { components: FigmaComponent[] } }> {
        const res = await this.http.get(`/files/${fileKey}/components`);
        return res.data;
    }

    // ── Comments ───────────────────────────────

    async getComments(
        fileKey: string
    ): Promise<{ comments: FigmaComment[] }> {
        const res = await this.http.get(`/files/${fileKey}/comments`);
        return res.data;
    }

    async postComment(
        fileKey: string,
        message: string,
        nodeId?: string
    ): Promise<{ comment: FigmaComment }> {
        const body: Record<string, unknown> = { message };
        if (nodeId) {
            body.client_meta = { node_id: nodeId };
        }
        const res = await this.http.post(`/files/${fileKey}/comments`, body);
        return res.data;
    }

    // ── Projects ───────────────────────────────

    async getTeamProjects(
        teamId: string
    ): Promise<{ projects: FigmaTeamProject[] }> {
        const res = await this.http.get(`/teams/${teamId}/projects`);
        return res.data;
    }

    async getProjectFiles(
        projectId: string
    ): Promise<{ files: FigmaProjectFile[] }> {
        const res = await this.http.get(`/projects/${projectId}/files`);
        return res.data;
    }

    // ── Variables ──────────────────────────────

    async getLocalVariables(fileKey: string): Promise<{
        meta: {
            variables: Record<string, FigmaVariable>;
            variableCollections: Record<string, FigmaVariableCollection>;
        };
    }> {
        const res = await this.http.get(`/files/${fileKey}/variables/local`);
        return res.data;
    }
}
