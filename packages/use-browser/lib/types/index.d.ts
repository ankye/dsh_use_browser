/**
 * Codex-style local browser automation for the harness agent: open / extract /
 * screenshot / click / type / eval against a Playwright page, either a managed
 * headless Chromium or the user's own Chrome connected over CDP (visible, and
 * able to load Chrome extensions that headless cannot).
 *
 * The tool entry points are backend-agnostic: a `browser` settings namespace
 * selects the backend; one shared session serves all calls. Screenshots land
 * on disk so the model can pair them with the vision plugin (`analyze_image`).
 * @module @deepseek-ai/dsh-tool-use-browser
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { type BrowserConfig } from './session.ts';
/** Cordis plugin name used by loader diagnostics. */
export declare const name = "tool-use-browser";
/** Services this plugin consumes (all host-plane; it publishes nothing). */
export declare const inject: string[];
/** Settings namespace carrying the browser backend selection. */
export declare const BROWSER_SETTINGS_NAMESPACE: import("@deepseek-ai/dsh-settings").SettingsNamespace;
/** Runtime configuration schema for the browser plugin. */
export declare const Config: z<BrowserConfig>;
/**
 * Mount the browser tool set and settings section.
 * @param ctx - plugin context.
 * @param config - the composed row config (schema-defaulted by Cordis).
 */
export declare function apply(ctx: Context, config: BrowserConfig): void;
//# sourceMappingURL=index.d.ts.map