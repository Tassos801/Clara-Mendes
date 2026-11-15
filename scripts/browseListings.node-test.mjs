import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const read = (file) => readFileSync(resolve(file), 'utf8');

test('/artists prices "from" what the buyer can buy, released variants only', () => {
  const page = read('app/routes/artists._index.tsx');
  assert.match(page, /filter\(\(product\) => product\.availableForSale\)/);
  assert.match(page, /deriveCardPricing\(product\)\.price/);
  // With nothing buyable the row still prices every work.
  assert.match(page, /buyable\.length \? buyable : liveListed/);
  assert.match(page, /ArtistsIndex[\s\S]*availableForSale[\s\S]*sizeVariants: variants\(first: 10\)/);
});

test('a failed clothing read never takes down the shop or a collection', () => {
  for (const file of [
    'app/routes/collections.all.tsx',
    'app/routes/collections.$handle.tsx',
  ]) {
    const source = read(file);
    assert.match(source, /loadClothingProducts\(context\.storefront\)\.catch\(\s*\(\) => \[\],?\s*\)/, file);
    assert.doesNotMatch(source, /await loadClothingProducts/, file);
    // The listing loads alongside; the type redirect still comes first.
    const redirectAt = source.indexOf('if (normalizedProductTypes)');
    assert.ok(redirectAt > 0 && source.indexOf('await listingLoad') > redirectAt, file);
    assert.match(source, /listingLoad( as Promise<unknown>\))?\.catch\(\(\) => \{\}\)/, file);
  }
});

test('collection tabs stay on their collection; a clothing line keeps its line', () => {
  const view = read('app/routes/collections.all.tsx');
  assert.match(view, /const listingPath = `\/collections\/\$\{data\.activeHandle\}`/);
  assert.match(view, /path: `\$\{listingPath\}\$\{categorySearch\(option\.label\)\}`/);
  assert.match(view, /\{capsule: data\.activeHandle\}/);
  assert.match(view, /clothingFilterUrl\(lineParams, 'category', category\.slug\)/);
  assert.doesNotMatch(view, /\/clothing\?category=\$\{category\.slug\}#pieces/);
  const handle = read('app/routes/collections.$handle.tsx');
  assert.match(handle, /clothingOnly\s*\?\s*clothing\.filter\(\(product\) =>\s*product\.collections\.nodes\.some/);
});

test('the shop count never shows a "+" or a filtered-off number', () => {
  const view = read('app/routes/collections.all.tsx');
  assert.match(view, /listingCountLabel\(nodes\.length, hasNextPage, data\.totalCount\)/);
  assert.doesNotMatch(view, /hasNextPage \? '\+' : ''/);
});

test('the shop fallback never calls released prints unreleased', () => {
  const preview = read('app/components/OriginalArtPreview.tsx');
  assert.doesNotMatch(preview, /Coming soon|Not yet released/);
  assert.match(preview, /to=\{`\/products\/\$\{item\.handle\}`\}/);
});

test('Karina of Time lists newest first and numbers issues before the cover filter', () => {
  const blog = read('app/routes/blogs.$blogHandle._index.tsx');
  assert.match(blog, /sortKey: PUBLISHED_AT,\s*reverse: true/);
  const numbersAt = blog.indexOf('const issueNumbers = new Map(');
  const filterAt = blog.indexOf('.filter((article) => article.image)');
  assert.ok(numbersAt > 0 && filterAt > numbersAt);
  assert.match(blog, /label: `Issue \$\{issueNumber\(article\.id\)\}`/);
  assert.match(blog, /Issue \{issueNumber\(article\.id\)\}/);
});

test('search fills a short page from whole following pages, cursors intact', () => {
  const search = read('app/routes/search.tsx');
  assert.match(search, /const SEARCH_PAGE_SIZE = 8;/);
  assert.match(search, /products\.length < SEARCH_PAGE_SIZE && fill < SEARCH_FILL_REQUESTS/);
  assert.match(search, /endCursor: nextInfo\.endCursor,\s*hasNextPage: nextInfo\.hasNextPage/);
  assert.match(search, /hasPreviousPage: nextInfo\.hasPreviousPage,\s*startCursor: nextInfo\.startCursor/);
});

test('gifts reads every curated handle directly, both markets at once', () => {
  const gifts = read('app/routes/gifts.tsx');
  assert.doesNotMatch(gifts, /products\(first: 250/);
  assert.match(gifts, /g\$\{index\}: product\(handle: \$\{JSON\.stringify\(handle\)\}\)/);
  assert.match(gifts, /const \[index, cards\] = await Promise\.all\(\[/);
});
