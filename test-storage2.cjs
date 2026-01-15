const { Client } = require('@replit/object-storage');
const client = new Client();
async function test() {
  const result = await client.downloadAsBytes('public/showcase/hero/EB0F64E2-5BB7-4CB9-9C62-3AABEAF61B38_1_105_c.jpeg');
  if (result.ok) {
    console.log('value is array:', Array.isArray(result.value));
    console.log('value[0] type:', typeof result.value[0]);
    console.log('value[0] is Buffer:', Buffer.isBuffer(result.value[0]));
    console.log('Buffer size:', result.value[0]?.length);
  }
}
test();
