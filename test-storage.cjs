const { Client } = require('@replit/object-storage');
const client = new Client();
async function test() {
  try {
    const result = await client.downloadAsBytes('public/showcase/hero/EB0F64E2-5BB7-4CB9-9C62-3AABEAF61B38_1_105_c.jpeg');
    console.log('Result type:', typeof result);
    console.log('Result keys:', Object.keys(result));
    console.log('ok:', result.ok);
    if (result.ok) {
      console.log('Value type:', typeof result.value);
      console.log('Is Buffer:', Buffer.isBuffer(result.value));
      console.log('Length:', result.value?.length);
    } else {
      console.log('Error:', result.error);
    }
  } catch(e) {
    console.error('Exception:', e.message);
  }
}
test();
