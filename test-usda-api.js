import https from 'https';

const apiKey = process.env.USDA_FDC_API_KEY || 'DEMO_KEY';
const query = 'apple';

const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}&query=${query}&pageSize=5`;

console.log('Making request to:', url);

https.get(url, (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Status Message:', res.statusMessage);
  console.log('Headers:', res.headers);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('\nResponse body (first 500 chars):');
    console.log(data.substring(0, 500));
    
    // Try to parse as JSON
    try {
      const json = JSON.parse(data);
      console.log('\nSuccessfully parsed JSON!');
      console.log('Total hits:', json.totalHits);
      console.log('First food item:', json.foods?.[0]);
    } catch (e) {
      console.log('\nFailed to parse as JSON - response is not JSON');
      if (data.includes('<!DOCTYPE html>')) {
        console.log('Response is HTML - API might be redirecting or down');
      }
    }
  });
}).on('error', (e) => {
  console.error('Request error:', e);
});