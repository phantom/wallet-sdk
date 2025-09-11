import { PhantomProvider, type PhantomSDKConfig, AddressType } from "@phantom/react-ui";
import ConnectExample from "./ConnectExample";

const config: PhantomSDKConfig = {
  providerType: "embedded" as const,
  addressTypes: [AddressType.solana, AddressType.ethereum] as const,
  appId: "7b91c1dd-c3c2-4088-8db3-3e9e6b72ce96",
};

function App() {
  return (
      <PhantomProvider theme="light" config={config}>
        <div style={{ 
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '2rem',
          maxWidth: '800px',
          margin: '0 auto',
          padding: '2rem'
        }}>
          <div style={{
            textAlign: 'center',
            marginBottom: '2rem'
          }}>
            <h1 style={{
              fontSize: '2.5rem',
              background: 'linear-gradient(135deg, #ab9ff2 0%, #7c3aed 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '0.5rem'
            }}>
              Phantom React UI Example
            </h1>
            <p style={{
              color: '#6b7280',
              fontSize: '1.1rem',
              lineHeight: '1.6'
            }}>
              Test the connect modal with mobile deeplink support
            </p>
          </div>
          
          <ConnectExample />
          
          <div style={{
            marginTop: '3rem',
            padding: '1.5rem',
            background: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#1f2937' }}>
              📱 Mobile Testing
            </h3>
            <p style={{ 
              color: '#6b7280', 
              margin: '0',
              lineHeight: '1.5'
            }}>
              On mobile devices, you'll see an additional "Open in Phantom App" button 
              that will redirect to the Phantom mobile app via phantom.app/ul
            </p>
          </div>
        </div>
      </PhantomProvider>
  );
}

export default App;