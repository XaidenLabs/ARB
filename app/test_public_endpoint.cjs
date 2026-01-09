/* eslint-disable @typescript-eslint/no-require-imports */

const { Connection } = require('@solana/web3.js');

async function testPublicRPC() {
  const endpoint = "https://api.mainnet-beta.solana.com";
  console.log(`Testing Public Endpoint: ${endpoint}`);
  
  const connection = new Connection(endpoint, 'confirmed');
  try {
    const version = await connection.getVersion();
    console.log('Success! Connected to Solana Mainnet:', version);
  } catch (err) {
    console.error('FAILED to connect to Public RPC:', err.message);
    if (err.message.includes('403')) {
      console.error('*** DIAGNOSIS: The PUBLIC node is blocking you (403 Forbidden) ***');
    }
  }
}

testPublicRPC();
