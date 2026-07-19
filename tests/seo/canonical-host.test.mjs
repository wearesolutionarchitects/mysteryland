import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const htaccessPath = new URL('../../public/.htaccess', import.meta.url);

test('www requests permanently redirect to the canonical non-www host', async () => {
  const htaccess = await readFile(htaccessPath, 'utf8');

  assert.match(htaccess, /RewriteCond %\{HTTP_HOST\} \^www\\\.mysteryland\\\.biz\$ \[NC\]/);
  assert.match(
    htaccess,
    /RewriteRule \^ https:\/\/mysteryland\.biz%\{REQUEST_URI\} \[R=301,END,NE\]/,
  );
});

