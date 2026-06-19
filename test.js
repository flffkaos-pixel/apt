const { execSync } = require('child_process');
const http = require('http');

const server = require('./server.js');

setTimeout(() => {
  http.get('http://localhost:3000/api/trade?lawdCd=11110&dealYmd=202505', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log('RESPONSE:', data.substring(0, 300)));
  }).on('error', e => console.log('ERROR:', e.message));
}, 3000);
