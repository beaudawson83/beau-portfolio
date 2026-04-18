#!/usr/bin/env node
// Contentful content-model setup. Run once per space.
//
// Usage:
//   CONTENTFUL_SPACE_ID=xxx CONTENTFUL_MANAGEMENT_TOKEN=yyy \
//     node scripts/setup-contentful.mjs
//
// Or, if you've populated .env.local:
//   node --env-file=.env.local scripts/setup-contentful.mjs
//
// Idempotent: safe to re-run. Skips fields that already exist on the
// `systemLog` content type and adds any missing ones.

import contentfulManagement from 'contentful-management';

const { createClient } = contentfulManagement;

const SPACE_ID = process.env.CONTENTFUL_SPACE_ID;
const TOKEN = process.env.CONTENTFUL_MANAGEMENT_TOKEN;
const ENVIRONMENT_ID = process.env.CONTENTFUL_ENVIRONMENT_ID || 'master';

const CONTENT_TYPE_ID = 'systemLog';

const TAG_VALUES = [
  'AI_STRATEGY',
  'OPS_EFFICIENCY',
  'FRACTIONAL_INSIGHTS',
  'AUTOMATION',
  'CRM_ARCHITECTURE',
  'LEADERSHIP',
];

const STATUS_VALUES = ['DRAFT', 'DEPLOYED', 'ARCHIVED'];

const FIELD_SPECS = [
  { id: 'title', name: 'Title', type: 'Symbol', required: true },
  { id: 'slug', name: 'Slug', type: 'Symbol', required: true, validations: [{ unique: true }] },
  { id: 'entryId', name: 'Entry ID', type: 'Symbol', required: true, validations: [{ unique: true }] },
  { id: 'publishedDate', name: 'Published Date', type: 'Date', required: true },
  { id: 'status', name: 'Status', type: 'Symbol', required: true, validations: [{ in: STATUS_VALUES }] },
  {
    id: 'tags',
    name: 'Tags',
    type: 'Array',
    required: false,
    items: { type: 'Symbol', validations: [{ in: TAG_VALUES }] },
  },
  { id: 'executiveSummary', name: 'Executive Summary', type: 'Text', required: true },
  { id: 'bottleneckIdentified', name: 'Bottleneck Identified', type: 'Text', required: false },
  { id: 'body', name: 'Body', type: 'RichText', required: true },
  { id: 'recommendedArchitecture', name: 'Recommended Architecture', type: 'Text', required: false },
  { id: 'metaDescription', name: 'Meta Description', type: 'Symbol', required: false },
];

function bail(msg) {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

if (!SPACE_ID) bail('CONTENTFUL_SPACE_ID is not set.');
if (!TOKEN) bail('CONTENTFUL_MANAGEMENT_TOKEN is not set.');

const client = createClient({ accessToken: TOKEN });

async function main() {
  console.log(`\n→ Connecting to space ${SPACE_ID} (env: ${ENVIRONMENT_ID})...`);

  const space = await client.getSpace(SPACE_ID);
  const environment = await space.getEnvironment(ENVIRONMENT_ID);

  let contentType;
  try {
    contentType = await environment.getContentType(CONTENT_TYPE_ID);
    console.log(`→ Existing content type '${CONTENT_TYPE_ID}' found. Syncing fields...`);
  } catch (err) {
    if (err.name === 'NotFound' || err.status === 404) {
      console.log(`→ Creating content type '${CONTENT_TYPE_ID}'...`);
      contentType = await environment.createContentTypeWithId(CONTENT_TYPE_ID, {
        name: 'System Log',
        fields: [],
      });
    } else {
      throw err;
    }
  }

  const existingFieldIds = new Set(contentType.fields.map((f) => f.id));
  let added = 0;

  for (const spec of FIELD_SPECS) {
    if (existingFieldIds.has(spec.id)) {
      console.log(`  · '${spec.id}' already exists, skipping`);
      continue;
    }
    contentType.fields.push(spec);
    added++;
    console.log(`  + added '${spec.id}' (${spec.type})`);
  }

  // Ensure displayField points to the title field once it exists
  if (
    contentType.fields.some((f) => f.id === 'title') &&
    contentType.displayField !== 'title'
  ) {
    contentType.displayField = 'title';
  }

  if (added === 0 && contentType.displayField === (contentType.sys?.publishedVersion ? contentType.displayField : 'title')) {
    console.log('\n✓ Content type already has all required fields. Nothing to do.');
  } else {
    console.log(`\n→ Saving content type...`);
    contentType = await contentType.update();
    console.log('→ Publishing content type...');
    await contentType.publish();
    console.log(`\n✓ Content type '${CONTENT_TYPE_ID}' is live in space ${SPACE_ID}.`);
  }

  console.log('\nNext step: add these four env vars to Vercel (Settings → Environment Variables):');
  console.log('  CONTENTFUL_SPACE_ID          (you already have this locally)');
  console.log('  CONTENTFUL_ACCESS_TOKEN      (Contentful: Settings → API keys → Delivery API token)');
  console.log('  CONTENTFUL_PREVIEW_TOKEN     (same API key, Preview API token)');
  console.log('  CONTENTFUL_MANAGEMENT_TOKEN  (Account settings → CMA tokens — treat like a password)');
  console.log('\nThen redeploy on Vercel. See BLOG_SETUP.md for the full walkthrough.\n');
}

main().catch((err) => {
  console.error('\n✗ Setup failed:');
  console.error(err.message || err);
  if (err.details?.errors) {
    console.error(JSON.stringify(err.details.errors, null, 2));
  }
  process.exit(1);
});
