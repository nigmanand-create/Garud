import { describe, expect, it } from 'vitest';
import { localizeSnapshotHtml } from '../snapshot-html';

describe('blog and legal snapshot link cleanup (NEXT-U1)', () => {
  it('rewrites legacy blogging query URLs to path routes', () => {
    const out = localizeSnapshotHtml(
      '<a href="/blogging?slug=my-post">post</a><a href="/blogging?category=guides">cat</a>',
    );
    expect(out).toContain('href="/blogging/post/my-post"');
    expect(out).toContain('href="/blogging/category/guides"');
  });
});

describe('localizeSnapshotHtml — legacy enquiry.php retirement', () => {
  it('rewrites relative, absolute and query-string enquiry.php links to /enquiry', () => {
    const html = [
      '<a href="enquiry.php">a</a>',
      '<a href="/enquiry.php">b</a>',
      '<a href="../enquiry.php?service=repair">c</a>',
      '<a href="https://garudhub.com/enquiry.php?subject=Hi">d</a>',
    ].join('');
    const out = localizeSnapshotHtml(html);
    expect(out).not.toContain('enquiry.php');
    expect(out).toContain('href="/enquiry"');
    expect(out).toContain('href="/enquiry?service=repair"');
    expect(out).toContain('href="/enquiry?subject=Hi"');
  });
});
