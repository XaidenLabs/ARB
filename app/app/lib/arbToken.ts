/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Connection, PublicKey, Transaction, SystemProgram, Keypair } from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID, 
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddress, 
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
  getMint
} from '@solana/spl-token';

// $ARB Token Details
const DEFAULT_ARB_MINT = 'D7ao8w8yjmjMWDfNzgt7J1uVP6qa3JNiRndkoXncyai';
const mintAddress =
  process.env.NEXT_PUBLIC_ARB_MINT_ADDRESS && process.env.NEXT_PUBLIC_ARB_MINT_ADDRESS.length > 0
    ? process.env.NEXT_PUBLIC_ARB_MINT_ADDRESS
    : DEFAULT_ARB_MINT;

export const ARB_TOKEN_MINT = new PublicKey(mintAddress);
export const ARB_DECIMALS = Number(process.env.NEXT_PUBLIC_ARB_DECIMALS || 9); // ARB token decimals (9)

// Treasury wallet that holds $ARB tokens for distribution
// You'll need to fund this wallet with $ARB tokens
const TREASURY_PRIVATE_KEY = process.env.ARB_TREASURY_PRIVATE_KEY || '';

// List of public/free RPC endpoints for failover
const RPC_ENDPOINTS = [
  process.env.NEXT_PUBLIC_RPC_ENDPOINT, // Primary (User's Helius)
  'https://api.mainnet-beta.solana.com', // Official Public
  'https://solana-rpc.publicnode.com',   // PublicNode
  'https://rpc.ankr.com/solana',         // Ankr
  'https://solana.drpc.org',             // dRPC
].filter(Boolean) as string[];

export class ARBTokenService {
  private connections: Connection[];
  private treasuryKeypair: Keypair | null = null;
  private tokenProgramId: PublicKey = TOKEN_PROGRAM_ID;
  private programIdResolved = false;

  constructor() {
    // Initialize a connection pool
    this.connections = RPC_ENDPOINTS.map(url => new Connection(url, 'confirmed'));
    
    // Initialize treasury wallet if private key is available
    if (TREASURY_PRIVATE_KEY) {
      try {
        const secretKey = Uint8Array.from(JSON.parse(TREASURY_PRIVATE_KEY));
        this.treasuryKeypair = Keypair.fromSecretKey(secretKey);
        console.log('Treasury wallet initialized:', this.treasuryKeypair.publicKey.toBase58());
      } catch (error) {
        console.error('Failed to initialize treasury wallet:', error);
      }
    }
  }

  /**
   * Execute a callback with failover/retry logic across multiple RPCs
   */
  private async executeWithRetry<T>(
    operation: (connection: Connection) => Promise<T>,
    description: string
  ): Promise<T> {
    let lastError: any;

    for (const connection of this.connections) {
      try {
        // @ts-ignore - Accessing private _rpcEndpoint for logging serves debug purposes
        const rpcUrl = connection._rpcEndpoint; 
        // console.log(`Attempting ${description} via ${rpcUrl}...`);
        
        return await operation(connection);
      } catch (error: any) {
        lastError = error;
        // If it's a rate limit (429) or generic fetch error, try next. 
        // If it's a logic error (Sim error), don't retry as it will fail everywhere.
        const msg = error?.message || "";
        const isNetworkError = msg.includes("429") || msg.includes("500") || msg.includes("502") || msg.includes("503") || msg.includes("504") || msg.includes("fetch") || msg.includes("network") || msg.includes("401") || msg.includes("403");
        // @ts-ignore
        const currentUrl = connection._rpcEndpoint;
        
        if (!isNetworkError) {
             console.log(`Non-network error encountered on ${currentUrl}:`, error.message);
             throw error; // Don't retry logic errors
        }
        console.warn(`RPC failed (${currentUrl}) with ${msg}, switching...`);
      }
    }
    throw new Error(`All RPCs failed for ${description}. Last error: ${lastError?.message}`);
  }

  /**
   * Resolve the correct Token Program ID (Token or Token-2022) based on the Mint's owner
   */
  private async getProgramId(): Promise<PublicKey> {
    if (ARB_TOKEN_MINT.toBase58() === 'D7ao8w8yjmjMWDfNzgt7J1uVP6qa3JNiRndkoXncyai') {
        this.tokenProgramId = TOKEN_2022_PROGRAM_ID;
        this.programIdResolved = true;
        return this.tokenProgramId;
    }

    if (this.programIdResolved) return this.tokenProgramId;

    try {
      await this.executeWithRetry(async (connection) => {
        console.log('Fetching ARB Mint info...');
        const mintAccount = await connection.getAccountInfo(ARB_TOKEN_MINT);
        if (mintAccount) {
            this.tokenProgramId = mintAccount.owner;
            this.programIdResolved = true;
        } else {
            throw new Error(`ARB Mint not found on this RPC`);
        }
      }, "resolveProgramId");
      
    } catch (error) {
       console.error('Critical Error: Failed to resolve Mint Program ID.', error);
       throw new Error("Failed to resolve Token Program ID. Check RPC connection.");
    }
    return this.tokenProgramId;
  }

  /**
   * Convert token amount to smallest units (considering decimals)
   */
  toTokenAmount(amount: number): number {
    return Math.floor(amount * Math.pow(10, ARB_DECIMALS));
  }

  /**
   * Convert smallest units back to readable amount
   */
  fromTokenAmount(amount: number): number {
    return amount / Math.pow(10, ARB_DECIMALS);
  }

  /**
   * Get or create Associated Token Account for a user
   */
  async getOrCreateTokenAccount(userPublicKey: PublicKey): Promise<PublicKey> {
    return this.executeWithRetry(async (connection) => {
      try {
        const programId = await this.getProgramId();
        const associatedTokenAddress = await getAssociatedTokenAddress(
          ARB_TOKEN_MINT,
          userPublicKey,
          false,
          programId
        );
  
        // Check if account exists
        try {
          await getAccount(connection, associatedTokenAddress, undefined, programId);
          console.log('Token account exists:', associatedTokenAddress.toBase58());
          return associatedTokenAddress;
        } catch (error) {
          // Account doesn't exist, we'll need to create it
          console.log('Token account needs to be created');
          return associatedTokenAddress;
        }
      } catch (error) {
        console.error('Error getting token account:', error);
        throw error;
      }
    }, "getOrCreateTokenAccount");
  }

  /**
   * Transfer $ARB tokens from treasury to user
   */
  async transferTokens(
    recipientPublicKey: PublicKey,
    amount: number,
    reason: string
  ): Promise<string> {
    if (!this.treasuryKeypair) {
      throw new Error('Treasury wallet not initialized. Please set ARB_TREASURY_PRIVATE_KEY');
    }

    return this.executeWithRetry(async (connection) => {
        console.log(`Transferring ${amount} $ARB to ${recipientPublicKey.toBase58()}...`);

        const programId = await this.getProgramId();
        
        // 1. Get Accounts
        const treasuryTokenAccount = await getAssociatedTokenAddress(
            ARB_TOKEN_MINT,
            this.treasuryKeypair!.publicKey,
            false,
            programId
        );
        const recipientTokenAccount = await getAssociatedTokenAddress(
            ARB_TOKEN_MINT,
            recipientPublicKey,
            false,
            programId
        );

        // 2. Build Transaction
        const transaction = new Transaction();

        // Check/Create destination ATA
        try {
            await getAccount(connection, recipientTokenAccount, undefined, programId);
        } catch {
            transaction.add(
              createAssociatedTokenAccountInstruction(
                this.treasuryKeypair!.publicKey,
                recipientTokenAccount,
                recipientPublicKey,
                ARB_TOKEN_MINT,
                programId
              )
            );
        }

        // Add Transfer
        transaction.add(
            createTransferInstruction(
              treasuryTokenAccount,
              recipientTokenAccount,
              this.treasuryKeypair!.publicKey,
              this.toTokenAmount(amount),
              [],
              programId
            )
        );

        // 3. Send and Confirm
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = this.treasuryKeypair!.publicKey;
        transaction.sign(this.treasuryKeypair!);

        const signature = await connection.sendRawTransaction(transaction.serialize());
        await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight });

        console.log('Token transfer successful:', signature);
        return signature;

    }, "transferTokens");
  }

  /**
   * Get user's $ARB token balance with retry
   */
  async getTokenBalance(userPublicKey: PublicKey): Promise<number> {
    return this.executeWithRetry(async (connection) => {
        try {
            // Need to replicate ensureTokenAccount logic but read-only
            const programId = await this.getProgramId();
            const ata = await getAssociatedTokenAddress(ARB_TOKEN_MINT, userPublicKey, false, programId);
            const info = await getAccount(connection, ata, undefined, programId);
            return this.fromTokenAmount(Number(info.amount));
        } catch (error) {
            return 0;
        }
    }, "getTokenBalance");
  }

  /**
   * Ensure ATA exists; create it (paid by treasury) if missing.
   */
  private async ensureTokenAccount(userPublicKey: PublicKey): Promise<PublicKey | null> {
    return this.executeWithRetry(async (connection) => {
      const programId = await this.getProgramId();
      const associatedTokenAddress = await getAssociatedTokenAddress(
        ARB_TOKEN_MINT,
        userPublicKey,
        false,
        programId
      );
  
      try {
        await getAccount(connection, associatedTokenAddress, undefined, programId);
        return associatedTokenAddress;
      } catch (error) {
        if (!this.treasuryKeypair) {
          console.warn('Treasury keypair missing; cannot create ATA for', userPublicKey.toBase58());
          return null;
        }
  
        try {
          const transaction = new Transaction().add(
            createAssociatedTokenAccountInstruction(
              this.treasuryKeypair.publicKey, // payer
              associatedTokenAddress,
              userPublicKey,
              ARB_TOKEN_MINT,
              programId
            )
          );
  
          const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
          transaction.recentBlockhash = blockhash;
          transaction.feePayer = this.treasuryKeypair.publicKey;
  
          transaction.sign(this.treasuryKeypair);
          const signature = await connection.sendRawTransaction(transaction.serialize());
          await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight });
  
          return associatedTokenAddress;
        } catch (creationError) {
          console.error('Failed to create associated token account:', creationError);
          return null;
        }
      }
    }, "ensureTokenAccount");
  }

  /**
   * Get treasury balance
   */
  async getTreasuryBalance(): Promise<number> {
    if (!this.treasuryKeypair) {
      return 0;
    }
    
    return this.executeWithRetry(async (connection) => {
      try {
        const programId = await this.getProgramId();
        const treasuryTokenAccount = await getAssociatedTokenAddress(
          ARB_TOKEN_MINT,
          this.treasuryKeypair!.publicKey,
          false,
          programId
        );
  
        const accountInfo = await getAccount(connection, treasuryTokenAccount, undefined, programId);
        return this.fromTokenAmount(Number(accountInfo.amount));
      } catch (error) {
        console.error('Error getting treasury balance:', error);
        return 0;
      }
    }, "getTreasuryBalance");
  }

  /**
   * Batch transfer to multiple recipients (for airdrops)
   */
  async batchTransfer(
    recipients: Array<{ publicKey: PublicKey; amount: number; reason: string }>
  ): Promise<string[]> {
    const signatures: string[] = [];

    for (const recipient of recipients) {
      try {
        const signature = await this.transferTokens(
          recipient.publicKey,
          recipient.amount,
          recipient.reason
        );
        signatures.push(signature);
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Failed to transfer to ${recipient.publicKey.toBase58()}:`, error);
      }
    }

    return signatures;
  }
}

// Reward amounts (in $ARB tokens)
export const REWARD_AMOUNTS = {
  SIGNUP_BONUS: 100,           // 100 $ARB for signing up
  DATASET_UPLOAD: 50,          // 50 $ARB per upload
  DATASET_VERIFIED: 200,       // 200 $ARB when dataset gets verified
  REVIEW_SUBMITTED: 20,        // 20 $ARB per review
  HIGH_QUALITY_BONUS: 100,     // 100 $ARB for 90+ quality score
  MILESTONE_1000: 500,         // 500 $ARB at 1000 total tokens
  REFERRAL_BONUS: 50          // 50 $ARB per referral
};

// Export singleton instance
export const arbTokenService = new ARBTokenService();
