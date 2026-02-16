const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

const SKELETON_PATH = path.join(__dirname, 'chefspaice-api.openapi.yaml');
const SECTION_FILES = [
  path.join(__dirname, 'sections', 'auth-paths.yaml'),
  path.join(__dirname, 'sections', 'sync-paths.yaml'),
  path.join(__dirname, 'sections', 'ai-paths.yaml'),
  path.join(__dirname, 'sections', 'platform-paths.yaml'),
];

const skeleton = YAML.parse(fs.readFileSync(SKELETON_PATH, 'utf8'));

if (!skeleton.paths) skeleton.paths = {};
if (!skeleton.components) skeleton.components = {};
if (!skeleton.components.schemas) skeleton.components.schemas = {};

for (const filePath of SECTION_FILES) {
  const fileName = path.basename(filePath);
  console.log(`Processing: ${fileName}`);
  const raw = YAML.parse(fs.readFileSync(filePath, 'utf8'));

  if (raw.components && raw.components.schemas) {
    for (const [schemaName, schemaDef] of Object.entries(raw.components.schemas)) {
      if (!skeleton.components.schemas[schemaName]) {
        skeleton.components.schemas[schemaName] = schemaDef;
        console.log(`  + schema: ${schemaName}`);
      } else {
        console.log(`  ~ schema: ${schemaName} (skeleton takes precedence)`);
      }
    }
    if (raw.components.securitySchemes) {
      if (!skeleton.components.securitySchemes) skeleton.components.securitySchemes = {};
      for (const [name, def] of Object.entries(raw.components.securitySchemes)) {
        if (!skeleton.components.securitySchemes[name]) {
          skeleton.components.securitySchemes[name] = def;
        }
      }
    }
  }

  let paths = {};
  if (raw.paths) {
    paths = raw.paths;
  }

  for (const [key, value] of Object.entries(raw)) {
    if (key === 'components' || key === 'paths' || key === 'openapi' || key === 'info' || key === 'servers' || key === 'tags' || key === 'security') continue;
    if (key.startsWith('/')) {
      paths[key] = value;
    }
  }

  let pathCount = 0;
  for (const [pathKey, pathDef] of Object.entries(paths)) {
    skeleton.paths[pathKey] = pathDef;
    pathCount++;
  }
  console.log(`  Added ${pathCount} paths from ${fileName}`);
}

const sortedPaths = {};
for (const key of Object.keys(skeleton.paths).sort()) {
  sortedPaths[key] = skeleton.paths[key];
}
skeleton.paths = sortedPaths;

const sortedSchemas = {};
for (const key of Object.keys(skeleton.components.schemas).sort()) {
  sortedSchemas[key] = skeleton.components.schemas[key];
}
skeleton.components.schemas = sortedSchemas;

const output = YAML.stringify(skeleton, {
  lineWidth: 0,
  defaultStringType: 'PLAIN',
  defaultKeyType: 'PLAIN',
});

fs.writeFileSync(SKELETON_PATH, output, 'utf8');

console.log(`\nMerged spec written to: ${SKELETON_PATH}`);
console.log(`Total paths: ${Object.keys(skeleton.paths).length}`);
console.log(`Total schemas: ${Object.keys(skeleton.components.schemas).length}`);

console.log('\n--- Validation ---');
const reparsed = YAML.parse(fs.readFileSync(SKELETON_PATH, 'utf8'));

if (!reparsed.openapi) {
  console.error('FAIL: Missing openapi field');
  process.exit(1);
}
console.log(`openapi: ${reparsed.openapi}`);

const pathKeys = Object.keys(reparsed.paths || {});
if (pathKeys.length === 0) {
  console.error('FAIL: No paths found');
  process.exit(1);
}
console.log(`paths count: ${pathKeys.length}`);

const schemaNames = Object.keys(reparsed.components?.schemas || {});
console.log(`schema count: ${schemaNames.length}`);

function collectRefs(obj, refs) {
  if (!obj || typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    for (const item of obj) collectRefs(item, refs);
    return;
  }
  for (const [key, value] of Object.entries(obj)) {
    if (key === '$ref' && typeof value === 'string') {
      refs.add(value);
    } else {
      collectRefs(value, refs);
    }
  }
}

const allRefs = new Set();
collectRefs(reparsed, allRefs);

let unresolvedCount = 0;
for (const ref of allRefs) {
  const match = ref.match(/^#\/components\/schemas\/(.+)$/);
  if (match) {
    const schemaName = match[1];
    if (!reparsed.components?.schemas?.[schemaName]) {
      console.error(`UNRESOLVED $ref: ${ref}`);
      unresolvedCount++;
    }
  }
  const secMatch = ref.match(/^#\/components\/securitySchemes\/(.+)$/);
  if (secMatch) {
    const name = secMatch[1];
    if (!reparsed.components?.securitySchemes?.[name]) {
      console.error(`UNRESOLVED $ref: ${ref}`);
      unresolvedCount++;
    }
  }
}

if (unresolvedCount > 0) {
  console.error(`\nFAIL: ${unresolvedCount} unresolved $ref(s)`);
  process.exit(1);
}

console.log(`All ${allRefs.size} $ref references resolve correctly`);
console.log('\nVALIDATION PASSED');
