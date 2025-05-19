import { useState, useEffect } from "react";
import { createPhantom, Phantom, Position } from "../../../sdk/src/index";
import { NavigationScreen } from "./NavigationScreen";
import { NormalConfigScreen } from "./NormalConfigScreen";
import { ElementConfigScreen } from "./ElementConfigScreen";
import { WalletContainer } from "./WalletContainer";

type WalletScreen = "navigation" | "normal" | "element";

export function PhantomWallet() {
  const [currentScreen, setCurrentScreen] =
    useState<WalletScreen>("navigation");
  const [normalPhantom, setNormalPhantom] = useState<Phantom | null>(null);
  const [elementPhantom, setElementPhantom] = useState<Phantom | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Cleanup function for when component unmounts
    return () => {
      // Hide any wallets when navigating away
      normalPhantom?.hide();
      elementPhantom?.hide();
    };
  }, [normalPhantom, elementPhantom]);

  const initNormalWallet = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const phantomInstance = await createPhantom({
        position: Position.bottomRight,
        hideLauncherBeforeOnboarded: false,
        namespace: "normal-wallet",
      });

      setNormalPhantom(phantomInstance);
      setCurrentScreen("normal");
    } catch (err) {
      setError("Failed to initialize normal wallet configuration");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const initElementWallet = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setCurrentScreen("element");

      // Use setTimeout to ensure the container is mounted in the DOM
      setTimeout(async () => {
        const phantomInstance = await createPhantom({
          element: "wallet-container",
          namespace: "element-wallet",
        });

        setElementPhantom(phantomInstance);
        phantomInstance.show();
        setIsLoading(false);
      }, 100);
    } catch (err) {
      setError("Failed to initialize element wallet configuration");
      console.error(err);
      setIsLoading(false);
    }
  };

  const handleNavigateBack = () => {
    setCurrentScreen("navigation");
  };

  return (
    <div className="wallet-demo">
      {currentScreen === "navigation" && (
        <NavigationScreen
          onNormalWalletSelect={initNormalWallet}
          onElementWalletSelect={initElementWallet}
          isLoading={isLoading}
          error={error}
        />
      )}

      {currentScreen === "normal" && (
        <NormalConfigScreen
          phantom={normalPhantom}
          onBack={handleNavigateBack}
        />
      )}

      {currentScreen === "element" && (
        <>
          <ElementConfigScreen
            phantom={elementPhantom}
            onBack={handleNavigateBack}
          >
            <WalletContainer />
          </ElementConfigScreen>
        </>
      )}
    </div>
  );
}
