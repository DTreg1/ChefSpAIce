const fs = require('fs');
const path = require('path');

const schemaDir = 'shared/schema';
const files = fs.readdirSync(schemaDir).filter(f => f.endsWith('.ts'));

files.forEach(file => {
  const filePath = path.join(schemaDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace .omit({ id: true, createdAt: true, updatedAt: true }) with just removing .omit()
  // This lets Drizzle auto-handle optional fields
  content = content.replace(/\.omit\(\{[\s\n]*id: true,[\s\n]*createdAt: true,[\s\n]*updatedAt: true,?[\s\n]*\}\)/g, '');
  content = content.replace(/\.omit\(\{[\s\n]*id: true,[\s\n]*createdAt: true,[\s\n]*\}\)/g, '');
  content = content.replace(/\.omit\(\{[\s\n]*id: true,[\s\n]*\}\)/g, '');
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed ${file}`);
});

console.log('Done!');
