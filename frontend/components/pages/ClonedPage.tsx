import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { Metadata } from 'next';
import { HtmlFragment } from '@/components/site/HtmlFragment';
import { PageScriptRunner } from '@/components/pages/PageScriptRunner';
import { resolvePageDir } from '@/lib/pages-manifest';

type ClonedPageProps = {
  pathKey: string;
};

function readPageFile(dir: string, file: string): string {
  const full = join(process.cwd(), 'content', 'pages', dir, file);
  if (!existsSync(full)) return '';
  return readFileSync(full, 'utf8');
}

export function getClonedPageMetadata(pathKey: string): Metadata {
  const dir = resolvePageDir(pathKey);
  if (!dir) return { title: 'Not Found' };
  const metaPath = join(process.cwd(), 'content', 'pages', dir, 'meta.json');
  if (!existsSync(metaPath)) return { title: 'Not Found' };
  const meta = JSON.parse(readFileSync(metaPath, 'utf8')) as { title: string };
  return { title: meta.title };
}

export function ClonedPage({ pathKey }: ClonedPageProps) {
  const dir = resolvePageDir(pathKey);
  if (!dir) return null;

  const meta = JSON.parse(readPageFile(dir, 'meta.json') || '{}') as {
    externalScripts?: string[];
  };
  const body = readPageFile(dir, 'body.html');
  const styles = readPageFile(dir, 'styles.css');
  const scripts = readPageFile(dir, 'scripts.js');

  return (
    <>
      {styles ? <style dangerouslySetInnerHTML={{ __html: styles }} /> : null}
      <HtmlFragment html={body} />
      <PageScriptRunner
        pathKey={pathKey}
        inlineScript={scripts}
        externalSrcs={meta.externalScripts ?? []}
      />
    </>
  );
}
