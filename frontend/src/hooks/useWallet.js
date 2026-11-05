/**
 * useWallet.js — React hook for MetaMask wallet connection.
 * Handles connection, account changes, and network changes.
 */

import { useState, useCallback, useEffect } from "react";
import { connectWallet, isAuthorizedIssuer, getAdministrator } from "../utils/contract.js";

export function useWallet() {
  const [address,      setAddress]      = useState(null);
  const [signer,       setSigner]       = useState(null);
  const [isAdmin,      setIsAdmin]      = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [connecting,   setConnecting]   = useState(false);
  const [error,        setError]        = useState(null);

  const checkRoles = useCallback(async (addr) => {
    try {
      const [admin, authorized] = await Promise.all([
        getAdministrator(),
        isAuthorizedIssuer(addr),
      ]);
      setIsAdmin(addr.toLowerCase() === admin.toLowerCase());
      setIsAuthorized(authorized);
    } catch {
      // Contract not deployed yet — silent
    }
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const { signer, address } = await connectWallet();
      setSigner(signer);
      setAddress(address);
      await checkRoles(address);
    } catch (err) {
      setError(err.message || "Failed to connect wallet.");
    } finally {
      setConnecting(false);
    }
  }, [checkRoles]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setSigner(null);
    setIsAdmin(false);
    setIsAuthorized(false);
    setError(null);
  }, []);

  // Listen for MetaMask account / chain changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        setAddress(accounts[0]);
        checkRoles(accounts[0]);
      }
    };

    const handleChainChanged = () => {
      // Page reload is the recommended approach for chain changes
      window.location.reload();
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged",    handleChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged",    handleChainChanged);
    };
  }, [disconnect, checkRoles]);

  const refresh = useCallback(() => {
    if (address) checkRoles(address);
  }, [address, checkRoles]);

  return { address, signer, isAdmin, isAuthorized, connecting, error, connect, disconnect, refresh };
}
