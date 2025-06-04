import { PhantomWallet } from "./components/PhantomWallet";
import "./App.css";

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Phantom Wallet SDK Demo</h1>
        <p>This app demonstrates how to integrate with the Phantom Wallet SDK</p>
      </header>
      <main>
        <PhantomWallet />
      </main>
      <footer>
        <p>Example implementation of Phantom Wallet SDK</p>
      </footer>
    </div>
  );
}

export default App;
