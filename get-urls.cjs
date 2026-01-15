const { Client } = require('@replit/object-storage');

async function getUrls() {
  const client = new Client();
  const categories = ['hero', 'inventory', 'recipes', 'mealplan', 'scanning'];
  
  for (const category of categories) {
    const prefix = `public/showcase/${category}/`;
    const list = await client.list({ prefix });
    for (const obj of list.objects || []) {
      const url = await client.getSignedDownloadUrl(obj.name);
      console.log(obj.name, '->', url.substring(0, 80) + '...');
    }
  }
}
getUrls();
