/**
 * Pure helpers for staging dropped files (PDF / docs / binary) into the vault so
 * EVERY provider can read them. All providers run with the vault as their
 * workspace, so a vault-relative `@path` mention is universally readable — no
 * per-provider plumbing needed. The actual file write happens in the caller.
 */

/** Vault-relative folder where dropped attachments are staged. */
export const VAULT_ATTACHMENT_DIR = '.claudian/attachments';

/** Splits a filename into a safe stem + extension (both sanitized). */
function splitName(name: string): { stem: string; ext: string } {
  const base = (name.split(/[\\/]/).pop() ?? 'file').trim();
  const dot = base.lastIndexOf('.');
  const rawStem = dot > 0 ? base.slice(0, dot) : base;
  const rawExt = dot > 0 ? base.slice(dot + 1) : '';
  const stem = rawStem.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'file';
  const ext = rawExt.replace(/[^a-zA-Z0-9]+/g, '').slice(0, 12);
  return { stem, ext };
}

/** Safe vault filename (stem + optional extension) for a dropped file. */
export function safeAttachmentFileName(name: string): string {
  const { stem, ext } = splitName(name);
  return ext ? `${stem}.${ext}` : stem;
}

/**
 * Builds a unique vault-relative attachment path, e.g.
 * `.claudian/attachments/report-1718800000000.pdf`.
 */
export function buildVaultAttachmentPath(name: string, uniqueSuffix: string): string {
  const { stem, ext } = splitName(name);
  const fileName = ext ? `${stem}-${uniqueSuffix}.${ext}` : `${stem}-${uniqueSuffix}`;
  return `${VAULT_ATTACHMENT_DIR}/${fileName}`;
}

/** Parent folder of a vault-relative path (or '' when top-level). */
export function parentFolder(relPath: string): string {
  const slash = relPath.lastIndexOf('/');
  return slash > 0 ? relPath.slice(0, slash) : '';
}
