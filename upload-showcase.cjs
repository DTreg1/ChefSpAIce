const { Client } = require('@replit/object-storage');
const fs = require('fs');
const path = require('path');

async function uploadFiles() {
  const client = new Client();
  const showcaseDir = path.join(process.cwd(), 'assets', 'showcase');
  const categories = ['hero', 'inventory', 'recipes', 'mealplan', 'scanning'];
  
  for (const category of categories) {
    const categoryDir = path.join(showcaseDir, category);
    if (!fs.existsSync(categoryDir)) continue;
    
    const files = fs.readdirSync(categoryDir).filter(f => f.endsWith('.jpeg'));
    for (const file of files) {
      const filePath = path.join(categoryDir, file);
      const objectPath = `public/showcase/${category}/${file}`;
      
      try {
        const buffer = fs.readFileSync(filePath);
        await client.uploadFromBytes(objectPath, buffer);
        console.log('Uploaded:', objectPath);
      } catch (err) {
        console.error('Failed', objectPath, err.message);
      }
    }
  }
}

uploadFiles().then(() => console.log('Done'));
