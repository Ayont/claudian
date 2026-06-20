import {
  buildVaultAttachmentPath,
  parentFolder,
  safeAttachmentFileName,
  VAULT_ATTACHMENT_DIR,
} from '../../../../../../src/features/chat/ui/file-drop/vaultAttachment';

describe('safeAttachmentFileName', () => {
  it('keeps a clean name + extension', () => {
    expect(safeAttachmentFileName('report.pdf')).toBe('report.pdf');
  });

  it('sanitizes unsafe characters and strips paths', () => {
    expect(safeAttachmentFileName('/a/b/My Report (final).pdf')).toBe('My-Report-final.pdf');
    expect(safeAttachmentFileName('résumé.docx')).toBe('r-sum.docx');
  });

  it('falls back to "file" for empty/garbage stems', () => {
    expect(safeAttachmentFileName('***.bin')).toBe('file.bin');
    expect(safeAttachmentFileName('noext')).toBe('noext');
  });
});

describe('buildVaultAttachmentPath', () => {
  it('builds a unique vault-relative path with the suffix before the extension', () => {
    expect(buildVaultAttachmentPath('doc.pdf', '123')).toBe(`${VAULT_ATTACHMENT_DIR}/doc-123.pdf`);
  });

  it('handles extensionless files', () => {
    expect(buildVaultAttachmentPath('Makefile', '9')).toBe(`${VAULT_ATTACHMENT_DIR}/Makefile-9`);
  });
});

describe('parentFolder', () => {
  it('returns the folder of a vault-relative path', () => {
    expect(parentFolder('.claudian/attachments/x.pdf')).toBe('.claudian/attachments');
  });

  it('returns empty for a top-level path', () => {
    expect(parentFolder('x.pdf')).toBe('');
  });
});
