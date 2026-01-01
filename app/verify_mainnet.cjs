
const { Connection, PublicKey } = require('@solana/web3.js');
const { getAssociatedTokenAddress } = require('@solana/spl-token');

async function main() {
  // Mainnet RPC
  const connection = new Connection('https://api.mainnet-beta.solana.com');

  // Constants
  const PROGRAM_ID = new PublicKey('EAo3vy4cYj9ezXbkZRwWkhUnNCjiBcF2qp8vwXwNsPPD');
  const ARB_MINT = new PublicKey('D7ao8w8yjmjMWDfNzgt7J1uVP6qa3JNiRndkoXncyai');
  const EXPECTED_USER_VAULT = '3YH1vWtFPzWYfMxAcaqyftq7kuYmwQRyMA8sK7ALywWp';

  console.log('--- Verifying Mainnet Configuration ---');

  // 1. Check Program
  const programInfo = await connection.getAccountInfo(PROGRAM_ID);
  if (programInfo) {
    console.log(`[OK] Program exists on Mainnet. Owner: ${programInfo.owner.toBase58()}`);
    console.log(`     Executable: ${programInfo.executable}`);
  } else {
    console.error('[ERROR] Program EAo3... NOT FOUND on Mainnet!');
  }

  // 2. Derive Vault Authority PDA
  const [vaultAuthorityPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault_authority")],
    PROGRAM_ID
  );
  console.log(`Derived Vault Authority PDA: ${vaultAuthorityPda.toBase58()}`);

  // 3. Derive Reward Vault ATA
  // Must check if Mint is Token-2022 to derive correctly
  const mintInfo = await connection.getAccountInfo(ARB_MINT);
  if (!mintInfo) {
    console.error('[ERROR] ARB Mint NOT FOUND on Mainnet!');
    return;
  }
  const tokenProgramId = mintInfo.owner;
  console.log(`Mint Program ID: ${tokenProgramId.toBase58()}`);

  const derivedVaultAddress = await getAssociatedTokenAddress(
    ARB_MINT,
    vaultAuthorityPda,
    true, // allowOwnerOffCurve
    tokenProgramId
  );
  console.log(`Derived Reward Vault Address: ${derivedVaultAddress.toBase58()}`);

  // 4. Compare
  if (derivedVaultAddress.toBase58() === EXPECTED_USER_VAULT) {
    console.log(`[MATCH] The user's vault address matches the derived address.`);
  } else {
    console.error(`[MISMATCH] CAUTION! User provided: ${EXPECTED_USER_VAULT}`);
    console.error(`           Actual derived vault: ${derivedVaultAddress.toBase58()}`);
    console.log('The user likely funded the wrong account.');
  }
}

main().catch(console.error);
