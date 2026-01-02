"use client";

import React, { FC, ReactNode, useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";

import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  // BackpackWalletAdapter,
  // GlowWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import "@solana/wallet-adapter-react-ui/styles.css";

interface SolanaProviderProps {
  children: ReactNode;
}

export const SolanaWalletProvider: FC<SolanaProviderProps> = ({ children }) => {
  // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'
  const network = WalletAdapterNetwork.Mainnet;

  // You can also provide a custom RPC endpoint
  // Fallback to public node if env var fails or is invalid (User reported 401s)
  const endpoint = useMemo(() => {
    // FORCE public endpoint (PublicNode) to unblock user from 403 errors
    const targetUrl = "https://solana-rpc.publicnode.com";
    console.log("WalletProvider forcing endpoint:", targetUrl);
    return targetUrl;
  }, [network]);

  const wallets = useMemo(
    () => [
      // Popular Solana wallets
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter({ network }),
      // new BackpackWalletAdapter(),
      // new GlowWalletAdapter(),
    ],
    [network]
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
