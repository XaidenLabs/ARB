
const { Keypair } = require('@solana/web3.js');
const fs = require('fs');

const KEYPAIR_PATH = '../target/deploy/africa_research_base-keypair.json';
const EXPECTED_PROGRAM_ID = 'EAo3vy4cYj9ezXbkZRwWkhUnNCjiBcF2qp8vwXwNsPPD';

try {
  const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(KEYPAIR_PATH, 'utf-8')));
  const keypair = Keypair.fromSecretKey(secretKey);
  const pubkey = keypair.publicKey.toBase58();

  console.log(`Local Keypair Public Key: ${pubkey}`);
  console.log(`Expected Program ID:      ${EXPECTED_PROGRAM_ID}`);

  if (pubkey === EXPECTED_PROGRAM_ID) {
    console.log('MATCH! YOU CAN RECOVER THE FUNDS.');
  } else {
    console.log('MISMATCH. This keypair is for a different program.');
  }
} catch (err) {
  console.error('Error reading keypair:', err);
}
