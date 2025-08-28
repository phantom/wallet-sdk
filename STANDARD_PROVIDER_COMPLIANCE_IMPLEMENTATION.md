# **Browser SDK Standard Provider Compliance Implementation**

## **Project Motivation & Goals**

### **Problem Statement**
The current browser SDK returns custom chain interfaces (`ISolanaChain` & `IEthereumChain`) that are not directly compatible with standard Ethereum and Solana wallet libraries like wagmi and @solana/wallet-adapter-react. This requires developers to create wrapper adapters to integrate with these popular libraries, adding complexity and maintenance overhead.

### **Objectives**
1. **Direct Library Integration**: Make `sdk.ethereum` and `sdk.solana` directly compatible with wagmi and Solana wallet adapters
2. **Standard Compliance**: Implement EIP-1193 for Ethereum and Wallet Adapter standards for Solana
3. **Maintain Backward Compatibility**: Ensure all existing SDK functionality continues to work
4. **Clean Architecture**: Avoid circular dependencies and unnecessary abstraction layers
5. **Connection Binding**: Enable `chain.connect()` to properly delegate to `sdk.connect()`

### **Success Criteria**
- `sdk.ethereum` can be used directly as an EIP-1193 provider in wagmi configuration
- `sdk.solana` can be used directly as a wallet adapter in Solana applications
- All existing SDK methods and properties continue to function
- No circular dependencies in the codebase
- Standard events are properly implemented and emitted

## **Implementation Strategy**

### **Key Design Decisions**

1. **Direct Interface Compliance**: Modify chain interfaces themselves to be standard-compliant rather than creating wrapper layers
2. **Callback-Based Architecture**: Use callback functions instead of SDK references to avoid circular dependencies
3. **Event Bridge Pattern**: Bridge native provider events to standard provider events
4. **Standard Return Types**: Return raw values where standards expect them (e.g., strings instead of wrapped objects)
5. **Connection Delegation**: Chain connect/disconnect methods delegate to SDK methods via callbacks

### **Architecture Overview**

```
BrowserSDK
  └── ProviderManager
      └── InjectedProvider / EmbeddedProvider
          └── EthereumChain (callbacks) ─┐
          └── SolanaChain (callbacks) ───┤
                                        │
          callbacks = {                 │
            connect: () => provider.connect()
            disconnect: () => provider.disconnect()
            isConnected: () => provider.isConnected()
            getAddresses: () => provider.getAddresses()
            on/off: () => provider.on/off()
          }
```

## **Implementation Instructions**

### **Phase 1: Update Chain Interfaces**

#### **Step 1.1: Update IEthereumChain Interface**
**File**: `packages/chains/src/interfaces/IEthereumChain.ts`

**Required Changes**:
- Extend `EventEmitter` interface
- Add EIP-1193 required properties: `connected`, `chainId`, `accounts`
- Keep existing `request()` method (already EIP-1193 compliant)
- Add `connect()` and `disconnect()` methods that return standard types
- Update return types for signing methods to return raw strings instead of `ParsedSignatureResult`
- Document expected EIP-1193 events in comments

**Key Requirements**:
- `connected: boolean` - Current connection state
- `chainId: string` - Current chain ID in hex format
- `accounts: string[]` - Array of connected account addresses
- `request<T>(args: { method: string; params?: unknown[] }): Promise<T>` - EIP-1193 core method
- Standard events: `connect`, `disconnect`, `accountsChanged`, `chainChanged`, `message`

#### **Step 1.2: Update ISolanaChain Interface**
**File**: `packages/chains/src/interfaces/ISolanaChain.ts`

**Required Changes**:
- Extend `EventEmitter` interface
- Add wallet adapter required properties: `connected`, `publicKey`
- Add `connect()` method that returns `{ publicKey: string }`
- Update `signMessage()` to return `{ signature: Uint8Array; publicKey: string }`
- Update `signAndSendTransaction()` to return `{ signature: string }`
- Add optional `signAllTransactions()` method
- Document expected wallet adapter events in comments

**Key Requirements**:
- `connected: boolean` - Current connection state
- `publicKey: string | null` - Current connected public key
- Standard return types for all signing methods
- Standard events: `connect`, `disconnect`, `accountChanged`

### **Phase 2: Create Callback System**

#### **Step 2.1: Define Callback Interface**
**File**: `packages/browser-sdk/src/providers/injected/chains/ChainCallbacks.ts` (new file)

**Purpose**: Define clean callback interface to avoid circular dependencies between SDK and chains.

**Required Interface**:
```typescript
export interface ChainCallbacks {
  connect(): Promise<WalletAddress[]>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getAddresses(): WalletAddress[];
  on(event: string, callback: (data: any) => void): void;
  off(event: string, callback: (data: any) => void): void;
}
```

**Critical Notes**:
- These callbacks allow chains to interact with SDK functionality without holding SDK references
- Must be implemented by providers to enable proper connection delegation
- Event callbacks enable chains to listen to SDK events for state synchronization

### **Phase 3: Implement Standard-Compliant Chains**

#### **Step 3.1: Update InjectedEthereumChain**
**File**: `packages/browser-sdk/src/providers/injected/chains/EthereumChain.ts`

**Implementation Requirements**:

1. **Constructor Changes**:
   - Accept `ChainCallbacks` instead of SDK reference
   - Initialize internal state properties (`_connected`, `_chainId`, `_accounts`)
   - Call `setupEventListeners()` and `syncInitialState()`

2. **EIP-1193 Properties**:
   - Implement getters for `connected`, `chainId`, `accounts`
   - Ensure properties reflect current state

3. **Connection Methods**:
   - `connect()`: Call `callbacks.connect()`, filter for Ethereum addresses, update state
   - `disconnect()`: Call `callbacks.disconnect()`

4. **Standard Method Updates**:
   - Update signing methods to return raw strings instead of wrapped objects
   - Keep existing phantom SDK calls but unwrap results

5. **Event System**:
   - Bridge phantom provider events to EIP-1193 events
   - Listen to SDK events via callbacks for state synchronization
   - Emit standard events: `connect`, `disconnect`, `accountsChanged`, `chainChanged`

6. **State Management**:
   - `syncInitialState()`: Sync chain state with SDK state on initialization
   - `updateConnectionState()`: Update internal state and emit events when needed

**Critical Implementation Notes**:
- Never store SDK reference - only use callbacks
- Ensure all EIP-1193 events are properly emitted
- Handle both phantom provider events and SDK events for complete state sync
- Return addresses in the format expected by wagmi/EIP-1193

#### **Step 3.2: Update InjectedSolanaChain**
**File**: `packages/browser-sdk/src/providers/injected/chains/SolanaChain.ts`

**Implementation Requirements**:

1. **Constructor Changes**:
   - Accept `ChainCallbacks` instead of SDK reference
   - Initialize internal state properties (`_connected`, `_publicKey`)

2. **Wallet Adapter Properties**:
   - Implement getters for `connected`, `publicKey`

3. **Connection Methods**:
   - `connect()`: Call `callbacks.connect()`, find Solana address, return `{ publicKey: string }`
   - `disconnect()`: Call `callbacks.disconnect()`

4. **Standard Method Updates**:
   - `signMessage()`: Return `{ signature: Uint8Array; publicKey: string }`
   - `signAndSendTransaction()`: Return `{ signature: string }`
   - `signAllTransactions()`: Map to multiple `signTransaction()` calls
   - Handle Uint8Array/Buffer conversions properly

5. **Event System**:
   - Bridge phantom provider events to wallet adapter events
   - Listen to SDK events via callbacks
   - Emit standard events: `connect`, `disconnect`, `accountChanged`

**Critical Implementation Notes**:
- Handle both string and Uint8Array message formats
- Proper signature format conversion (base64 to Uint8Array)
- Graceful handling when sign-only transactions aren't supported

### **Phase 4: Update Provider Implementations**

#### **Step 4.1: Update InjectedProvider**
**File**: `packages/browser-sdk/src/providers/injected/index.ts`

**Required Changes**:

1. **Constructor Updates**:
   - Remove SDK parameter
   - Create callback object using `createCallbacks()` method
   - Pass callbacks to chain constructors instead of SDK reference

2. **Callback Implementation**:
   ```typescript
   private createCallbacks(): ChainCallbacks {
     return {
       connect: async () => {
         const result = await this.connect();
         return result.addresses;
       },
       disconnect: async () => await this.disconnect(),
       isConnected: () => this.isConnected(),
       getAddresses: () => this.getAddresses(),
       on: (event, callback) => this.on(event as any, callback),
       off: (event, callback) => this.off(event as any, callback)
     };
   }
   ```

3. **Chain Creation**:
   - Pass callbacks to chain constructors
   - Remove any SDK reference passing

**Critical Notes**:
- Callbacks delegate to provider methods, not SDK methods directly
- This maintains proper separation of concerns
- Provider handles its own connection logic, chains use callbacks to access it

#### **Step 4.2: Update EmbeddedProvider**
**File**: `@phantom/embedded-provider-core` (similar changes)

**Required Changes**:
- Implement similar callback system for embedded provider
- Create embedded chain implementations that use embedded provider methods
- Bridge embedded provider events to standard events
- Handle embedded provider specific connection logic

**Key Differences**:
- Use embedded provider methods instead of phantom provider methods
- Handle embedded provider's `request()` method mapping for Ethereum
- Return unwrapped results (e.g., `result.signature` instead of full `ParsedSignatureResult`)

### **Phase 5: Update SDK Classes**

#### **Step 5.1: Update BrowserSDK**
**File**: `packages/browser-sdk/src/BrowserSDK.ts`

**Required Changes**:
- Remove SDK reference passing to ProviderManager
- Chain getters remain unchanged (they already return the provider's chains)
- No major changes needed - the interface changes are transparent

#### **Step 5.2: Update ProviderManager**
**File**: `packages/browser-sdk/src/ProviderManager.ts`

**Required Changes**:
- Remove SDK parameter from constructor
- Update `createProvider()` calls to not pass SDK reference
- No other changes needed

### **Phase 6: Testing & Validation**

#### **Step 6.1: Unit Tests**
**Required Test Updates**:

1. **Chain Interface Tests**:
   - Verify EIP-1193 property compliance
   - Test wallet adapter property compliance
   - Validate standard event emission
   - Test connection delegation via callbacks

2. **Integration Tests**:
   - Test with actual wagmi configuration
   - Test with Solana wallet adapter setup
   - Verify backward compatibility of all existing methods

3. **Event Tests**:
   - Verify EIP-1193 events are emitted correctly
   - Test wallet adapter events
   - Validate event bridging from native providers

#### **Step 6.2: Example Applications**
**Create Working Examples**:

1. **Wagmi Integration Example**:
   ```typescript
   const wagmiConfig = createConfig({
     chains: [mainnet],
     connectors: [injected({ target: () => sdk.ethereum })]
   });
   ```

2. **Solana Wallet Adapter Example**:
   ```typescript
   const phantomSdkAdapter = {
     ...sdk.solana,
     name: 'Phantom SDK',
     // ... other adapter properties
   };
   ```

### **Phase 7: Documentation & Migration**

#### **Step 7.1: Update Documentation**
**Required Updates**:
- Update README examples to show direct library integration
- Document new standard-compliant properties and events
- Provide migration guide for developers
- Update TypeScript examples

#### **Step 7.2: Migration Guide**
**Create Comprehensive Guide**:
- Show before/after code examples
- Explain new capabilities (direct wagmi/wallet adapter integration)
- Highlight backward compatibility
- Provide troubleshooting tips

## **Implementation Guidelines & Best Practices**

### **Code Quality Standards**
1. **Type Safety**: Maintain strict TypeScript typing throughout
2. **Error Handling**: Proper error messages for unsupported operations
3. **Event Management**: Clean event listener setup and cleanup
4. **State Synchronization**: Reliable state sync between SDK and chains

### **Testing Strategy**
1. **Backward Compatibility**: Ensure all existing functionality works
2. **Standard Compliance**: Validate EIP-1193 and wallet adapter compliance
3. **Integration Testing**: Test with real libraries (wagmi, wallet-adapter)
4. **Error Scenarios**: Test error handling and edge cases

### **Performance Considerations**
1. **Event Listener Management**: Proper cleanup to prevent memory leaks
2. **State Updates**: Efficient state synchronization
3. **Async Operations**: Proper handling of concurrent operations

## **Common Pitfalls to Avoid**

### **Circular Dependency Issues**
- ❌ **Don't**: Pass SDK reference to chains
- ✅ **Do**: Use callback functions for SDK interaction

### **Event Handling**
- ❌ **Don't**: Emit events without proper state updates
- ✅ **Do**: Update internal state before emitting events

### **Return Type Compatibility**
- ❌ **Don't**: Return wrapped objects where standards expect raw values
- ✅ **Do**: Return standard-compliant types (strings, arrays, etc.)

### **Connection State Management**
- ❌ **Don't**: Allow chain state to get out of sync with SDK state
- ✅ **Do**: Properly synchronize state through callbacks and events

## **Success Validation Checklist**

### **EIP-1193 Compliance (Ethereum)**
- [ ] `sdk.ethereum` has `connected`, `chainId`, `accounts` properties
- [ ] `request()` method works with standard RPC calls
- [ ] `connect()` returns string array of addresses
- [ ] Standard events are emitted: `connect`, `disconnect`, `accountsChanged`, `chainChanged`
- [ ] Works directly with wagmi configuration

### **Wallet Adapter Compliance (Solana)**
- [ ] `sdk.solana` has `connected`, `publicKey` properties
- [ ] `connect()` returns `{ publicKey: string }`
- [ ] `signMessage()` returns `{ signature: Uint8Array; publicKey: string }`
- [ ] Standard events are emitted: `connect`, `disconnect`, `accountChanged`
- [ ] Works directly with Solana wallet adapter

### **Architecture Quality**
- [ ] No circular dependencies between SDK and chains
- [ ] Clean callback-based architecture
- [ ] Proper event listener cleanup
- [ ] State synchronization works correctly

### **Backward Compatibility**
- [ ] All existing SDK methods continue to work
- [ ] No breaking changes to public API
- [ ] Existing applications work without modifications

### **Integration Testing**
- [ ] Successfully integrates with wagmi
- [ ] Successfully integrates with @solana/wallet-adapter-react
- [ ] Event handling works in both libraries
- [ ] Connection/disconnection works properly

## **Future Considerations**

### **Extensibility**
- Design allows for easy addition of new blockchain chains
- Standard compliance patterns can be applied to other chains
- Callback system is flexible for different provider types

### **Maintenance**
- Standard interfaces reduce maintenance overhead
- Direct library compatibility reduces support burden
- Clear separation of concerns makes debugging easier

## **Implementation Details**

### **Updated Chain Interfaces**

#### **packages/chains/src/interfaces/IEthereumChain.ts**

```typescript
import { EventEmitter } from 'events';

export interface EthTransactionRequest {
  to?: string;
  from?: string;
  value?: string;
  gas?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  data?: string;
  nonce?: string;
  type?: string;
  chainId?: string;
}

// Now directly EIP-1193 compliant
export interface IEthereumChain extends EventEmitter {
  // EIP-1193 required properties
  readonly connected: boolean;
  readonly chainId: string;
  readonly accounts: string[];

  // EIP-1193 core method
  request<T = any>(args: { method: string; params?: unknown[] }): Promise<T>;

  // Connection methods (bound to SDK)
  connect(): Promise<string[]>;
  disconnect(): Promise<void>;

  // Convenience methods (return raw values for standard compliance)
  signPersonalMessage(message: string, address: string): Promise<string>;
  signTypedData(typedData: any, address: string): Promise<string>;
  sendTransaction(transaction: EthTransactionRequest): Promise<string>;
  switchChain(chainId: number): Promise<void>;
  getChainId(): Promise<number>;
  getAccounts(): Promise<string[]>;
  isConnected(): boolean;

  // Standard EIP-1193 Events:
  // - connect: (connectInfo: { chainId: string }) => void
  // - disconnect: (error: { code: number; message: string }) => void  
  // - accountsChanged: (accounts: string[]) => void
  // - chainChanged: (chainId: string) => void
  // - message: (message: { type: string; data: unknown }) => void
}
```

#### **packages/chains/src/interfaces/ISolanaChain.ts**

```typescript
import { EventEmitter } from 'events';

// Now directly wallet-adapter compliant
export interface ISolanaChain extends EventEmitter {
  // Wallet adapter required properties
  readonly publicKey: string | null;
  readonly connected: boolean;

  // Core wallet adapter methods (bound to SDK)
  connect(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: string }>;
  disconnect(): Promise<void>;

  // Standard wallet adapter signing methods
  signMessage(message: string | Uint8Array): Promise<{ signature: Uint8Array; publicKey: string }>;
  signTransaction<T>(transaction: T): Promise<T>;
  signAndSendTransaction<T>(transaction: T): Promise<{ signature: string }>;
  signAllTransactions?<T>(transactions: T[]): Promise<T[]>;

  // Network switching
  switchNetwork?(network: 'mainnet' | 'devnet'): Promise<void>;

  // Legacy compatibility methods
  getPublicKey(): Promise<string | null>;
  isConnected(): boolean;

  // Standard Wallet Adapter Events:
  // - connect: (publicKey: string) => void
  // - disconnect: () => void
  // - accountChanged: (publicKey: string | null) => void
}
```

### **Callback Interfaces**

#### **packages/browser-sdk/src/providers/injected/chains/ChainCallbacks.ts**

```typescript
import type { WalletAddress } from '../../../types';

export interface ChainCallbacks {
  connect(): Promise<WalletAddress[]>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getAddresses(): WalletAddress[];
  on(event: string, callback: (data: any) => void): void;
  off(event: string, callback: (data: any) => void): void;
}
```

### **Updated Chain Implementations**

#### **packages/browser-sdk/src/providers/injected/chains/EthereumChain.ts**

```typescript
import { EventEmitter } from 'events';
import type { IEthereumChain, EthTransactionRequest } from '@phantom/chains';
import type { Ethereum } from '@phantom/browser-injected-sdk/ethereum';
import type { Extension } from '@phantom/browser-injected-sdk';
import type { WalletAddress } from '../../../types';
import { AddressType } from '@phantom/client';
import type { ChainCallbacks } from './ChainCallbacks';

interface PhantomExtended {
  extension: Extension;
  ethereum: Ethereum;
}

export class InjectedEthereumChain extends EventEmitter implements IEthereumChain {
  private phantom: PhantomExtended;
  private callbacks: ChainCallbacks;
  private _connected: boolean = false;
  private _chainId: string = '0x1';
  private _accounts: string[] = [];

  constructor(phantom: PhantomExtended, callbacks: ChainCallbacks) {
    super();
    this.phantom = phantom;
    this.callbacks = callbacks;
    this.setupEventListeners();
    this.syncInitialState();
  }

  // EIP-1193 compliant properties
  get connected(): boolean {
    return this._connected;
  }

  get chainId(): string {
    return this._chainId;
  }

  get accounts(): string[] {
    return this._accounts;
  }

  // EIP-1193 core method - unchanged, already compliant!
  async request<T = any>(args: { method: string; params?: unknown[] }): Promise<T> {
    const provider = await this.phantom.ethereum.getProvider();
    return await provider.request(args);
  }

  // Connection methods - bound to SDK via callbacks
  async connect(): Promise<string[]> {
    const result = await this.callbacks.connect();
    const ethAddresses = result
      .filter(addr => addr.addressType === AddressType.ethereum)
      .map(addr => addr.address);
    
    this.updateConnectionState(true, ethAddresses);
    return ethAddresses;
  }

  async disconnect(): Promise<void> {
    await this.callbacks.disconnect();
  }

  // Standard compliant methods (return raw values, not wrapped objects)
  async signPersonalMessage(message: string, address: string): Promise<string> {
    return await this.phantom.ethereum.signPersonalMessage(message, address);
  }

  async signTypedData(typedData: any, address: string): Promise<string> {
    return await this.phantom.ethereum.signTypedData(typedData, address);
  }

  async sendTransaction(transaction: EthTransactionRequest): Promise<string> {
    return await this.phantom.ethereum.sendTransaction(transaction);
  }

  async switchChain(chainId: number): Promise<void> {
    await this.phantom.ethereum.switchChain(`0x${chainId.toString(16)}`);
    this._chainId = `0x${chainId.toString(16)}`;
    this.emit('chainChanged', this._chainId);
  }

  async getChainId(): Promise<number> {
    const chainId = await this.phantom.ethereum.getChainId();
    return parseInt(chainId, 16);
  }

  async getAccounts(): Promise<string[]> {
    return await this.phantom.ethereum.getAccounts();
  }

  isConnected(): boolean {
    return this._connected && this.callbacks.isConnected();
  }

  private setupEventListeners(): void {
    // Bridge phantom events to EIP-1193 standard events
    this.phantom.ethereum.addEventListener("connect", (accounts: string[]) => {
      this.updateConnectionState(true, accounts);
      this.emit('connect', { chainId: this._chainId });
      this.emit('accountsChanged', accounts);
    });

    this.phantom.ethereum.addEventListener("disconnect", () => {
      this.updateConnectionState(false, []);
      this.emit('disconnect', { code: 4900, message: 'Provider disconnected' });
      this.emit('accountsChanged', []);
    });

    this.phantom.ethereum.addEventListener("accountsChanged", (accounts: string[]) => {
      this._accounts = accounts;
      this.emit('accountsChanged', accounts);
    });

    this.phantom.ethereum.addEventListener("chainChanged", (chainId: string) => {
      this._chainId = chainId;
      this.emit('chainChanged', chainId);
    });

    // Listen to SDK events via callbacks (no circular reference)
    this.callbacks.on('connect', (data) => {
      const ethAddresses = data.addresses
        ?.filter((addr: any) => addr.addressType === AddressType.ethereum)
        ?.map((addr: any) => addr.address) || [];
      
      if (ethAddresses.length > 0) {
        this.updateConnectionState(true, ethAddresses);
      }
    });

    this.callbacks.on('disconnect', () => {
      this.updateConnectionState(false, []);
    });
  }

  private syncInitialState(): void {
    // Sync initial state using callbacks
    if (this.callbacks.isConnected()) {
      const ethAddresses = this.callbacks.getAddresses()
        .filter(addr => addr.addressType === AddressType.ethereum)
        .map(addr => addr.address);
      
      if (ethAddresses.length > 0) {
        this.updateConnectionState(true, ethAddresses);
      }
    }
  }

  private updateConnectionState(connected: boolean, accounts: string[]): void {
    this._connected = connected;
    this._accounts = accounts;
  }
}
```

#### **packages/browser-sdk/src/providers/injected/chains/SolanaChain.ts**

```typescript
import { EventEmitter } from 'events';
import type { ISolanaChain } from '@phantom/chains';
import type { Solana } from '@phantom/browser-injected-sdk/solana';
import type { Extension } from '@phantom/browser-injected-sdk';
import type { WalletAddress } from '../../../types';
import { AddressType } from '@phantom/client';
import { Buffer } from 'buffer';
import type { ChainCallbacks } from './ChainCallbacks';

interface PhantomExtended {
  extension: Extension;
  solana: Solana;
}

export class InjectedSolanaChain extends EventEmitter implements ISolanaChain {
  private phantom: PhantomExtended;
  private callbacks: ChainCallbacks;
  private _connected: boolean = false;
  private _publicKey: string | null = null;

  constructor(phantom: PhantomExtended, callbacks: ChainCallbacks) {
    super();
    this.phantom = phantom;
    this.callbacks = callbacks;
    this.setupEventListeners();
    this.syncInitialState();
  }

  // Wallet adapter compliant properties
  get connected(): boolean {
    return this._connected;
  }

  get publicKey(): string | null {
    return this._publicKey;
  }

  // Connection methods - use callbacks
  async connect(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: string }> {
    const result = await this.callbacks.connect();
    const solanaAddress = result.find(addr => addr.addressType === AddressType.solana);
    
    if (!solanaAddress) {
      throw new Error('Solana not enabled for this provider');
    }

    this.updateConnectionState(true, solanaAddress.address);
    return { publicKey: solanaAddress.address };
  }

  async disconnect(): Promise<void> {
    await this.callbacks.disconnect();
  }

  // Standard wallet adapter methods
  async signMessage(message: string | Uint8Array): Promise<{ signature: Uint8Array; publicKey: string }> {
    const messageBytes = typeof message === 'string' ? new TextEncoder().encode(message) : message;
    const result = await this.phantom.solana.signMessage(messageBytes);

    return {
      signature: result.signature instanceof Uint8Array 
        ? result.signature 
        : new Uint8Array(Buffer.from(result.signature, 'base64')),
      publicKey: this._publicKey || ''
    };
  }

  async signTransaction<T>(transaction: T): Promise<T> {
    try {
      return await this.phantom.solana.signTransaction(transaction as any);
    } catch {
      throw new Error('Sign-only transactions not supported by injected provider. Use signAndSendTransaction instead.');
    }
  }

  async signAndSendTransaction<T>(transaction: T): Promise<{ signature: string }> {
    const result = await this.phantom.solana.signAndSendTransaction(transaction as any);
    return { signature: result.signature };
  }

  async signAllTransactions<T>(transactions: T[]): Promise<T[]> {
    const results = await Promise.all(transactions.map(tx => this.signTransaction(tx)));
    return results;
  }

  async switchNetwork(network: 'mainnet' | 'devnet'): Promise<void> {
    console.warn('Network switching not supported by injected provider');
  }

  // Legacy methods
  async getPublicKey(): Promise<string | null> {
    return this._publicKey;
  }

  isConnected(): boolean {
    return this._connected && this.callbacks.isConnected();
  }

  private setupEventListeners(): void {
    // Bridge phantom events to wallet adapter standard events
    this.phantom.solana.addEventListener("connect", (publicKey: string) => {
      this.updateConnectionState(true, publicKey);
      this.emit('connect', publicKey);
    });

    this.phantom.solana.addEventListener("disconnect", () => {
      this.updateConnectionState(false, null);
      this.emit('disconnect');
    });

    this.phantom.solana.addEventListener("accountChanged", (publicKey: string) => {
      this._publicKey = publicKey;
      this.emit('accountChanged', publicKey);
    });

    // Listen to SDK events via callbacks (no circular reference)
    this.callbacks.on('connect', (data) => {
      const solanaAddress = data.addresses
        ?.find((addr: any) => addr.addressType === AddressType.solana);
      
      if (solanaAddress) {
        this.updateConnectionState(true, solanaAddress.address);
      }
    });

    this.callbacks.on('disconnect', () => {
      this.updateConnectionState(false, null);
    });
  }

  private syncInitialState(): void {
    if (this.callbacks.isConnected()) {
      const solanaAddress = this.callbacks.getAddresses()
        .find(addr => addr.addressType === AddressType.solana);
      
      if (solanaAddress) {
        this.updateConnectionState(true, solanaAddress.address);
      }
    }
  }

  private updateConnectionState(connected: boolean, publicKey: string | null): void {
    this._connected = connected;
    this._publicKey = publicKey;
  }
}
```

### **Updated Provider Implementation**

#### **packages/browser-sdk/src/providers/injected/index.ts**

```typescript
import { InjectedEthereumChain } from './chains/EthereumChain';
import { InjectedSolanaChain } from './chains/SolanaChain';
import type { ChainCallbacks } from './chains/ChainCallbacks';

export class InjectedProvider implements Provider {
  // ... existing properties unchanged ...
  
  constructor(config: InjectedProviderConfig) {
    // ... existing setup code unchanged ...
    
    // Create callback objects to avoid circular dependencies
    const callbacks = this.createCallbacks();
    
    // Create chains with callbacks instead of SDK reference
    if (this.addressTypes.includes(AddressType.solana)) {
      this._solanaChain = new InjectedSolanaChain(this.phantom, callbacks);
    }
    if (this.addressTypes.includes(AddressType.ethereum)) {
      this._ethereumChain = new InjectedEthereumChain(this.phantom, callbacks);
    }
  }

  private createCallbacks(): ChainCallbacks {
    return {
      connect: async (): Promise<WalletAddress[]> => {
        const result = await this.connect();
        return result.addresses;
      },
      disconnect: async (): Promise<void> => {
        await this.disconnect();
      },
      isConnected: (): boolean => {
        return this.isConnected();
      },
      getAddresses: (): WalletAddress[] => {
        return this.getAddresses();
      },
      on: (event: string, callback: (data: any) => void): void => {
        this.on(event as any, callback);
      },
      off: (event: string, callback: (data: any) => void): void => {
        this.off(event as any, callback);
      }
    };
  }

  // ... rest of existing methods unchanged ...
}
```

## **Usage Examples**

### **With Wagmi (Ethereum)**

```typescript
import { createConfig, http, injected } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { BrowserSDK } from '@phantom/browser-sdk';

const sdk = new BrowserSDK({ 
  providerType: 'injected',
  addressTypes: ['ethereum']
});

// sdk.ethereum is now directly EIP-1193 compliant!
const wagmiConfig = createConfig({
  chains: [mainnet],
  connectors: [
    injected({ 
      target: () => ({
        provider: sdk.ethereum,  // ✅ Direct usage!
        ...sdk.ethereum          // Spread all EIP-1193 methods/properties
      })
    })
  ],
  transports: {
    [mainnet.id]: http()
  }
});

// Usage examples:
await sdk.ethereum.connect();                    // ← Calls sdk.connect() under the hood
console.log(sdk.ethereum.connected);            // ✅ EIP-1193 property
await sdk.ethereum.request({ method: 'eth_accounts' }); // ✅ EIP-1193 method
sdk.ethereum.on('accountsChanged', console.log); // ✅ EIP-1193 events
```

### **With Solana Wallet Adapter**

```typescript
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { BrowserSDK } from '@phantom/browser-sdk';

const sdk = new BrowserSDK({ 
  providerType: 'embedded',
  appId: 'your-app-id',
  addressTypes: ['solana']
});

// sdk.solana is now directly wallet-adapter compliant!
const phantomSdkAdapter = {
  name: 'Phantom SDK',
  url: 'https://phantom.app',
  icon: 'phantom-icon.svg',
  readyState: 'Installed',
  publicKey: sdk.solana.publicKey,               // ✅ Standard property
  connected: sdk.solana.connected,              // ✅ Standard property
  connect: sdk.solana.connect.bind(sdk.solana), // ✅ Bound to SDK
  disconnect: sdk.solana.disconnect.bind(sdk.solana),
  signMessage: sdk.solana.signMessage.bind(sdk.solana),
  signTransaction: sdk.solana.signTransaction.bind(sdk.solana),
  signAndSendTransaction: sdk.solana.signAndSendTransaction.bind(sdk.solana),
  signAllTransactions: sdk.solana.signAllTransactions?.bind(sdk.solana),
  on: sdk.solana.on.bind(sdk.solana),           // ✅ EventEmitter
  off: sdk.solana.off.bind(sdk.solana)
};

// Direct usage:
await sdk.solana.connect();                     // ← Calls sdk.connect() under the hood
console.log(sdk.solana.publicKey);             // ✅ Standard property
sdk.solana.on('connect', console.log);         // ✅ Standard events
```

## **Migration Guide**

### **Existing Code (Still Works)**

```typescript
// Backward compatible - no changes needed
const result = await sdk.solana.signMessage(message);
console.log(result.signature, result.rawSignature); // ✅ Still works
```

### **New Standard-Compliant Usage**

```typescript
// New standard format
const result = await sdk.solana.signMessage(message);
console.log(result.signature, result.publicKey); // ✅ Standard format

// Direct library integration
sdk.ethereum.on('accountsChanged', console.log); // ✅ EIP-1193 events
```

This implementation provides a robust, standards-compliant solution that enables direct integration with popular Web3 libraries while maintaining backward compatibility and clean architecture principles.