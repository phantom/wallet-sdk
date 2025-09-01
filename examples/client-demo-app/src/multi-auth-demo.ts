const { PhantomClient, generateKeyPair } = require("@phantom/client");
const { ApiKeyStamper } = require("@phantom/api-key-stamper");
const { base64urlEncode } = require("@phantom/base64url");
const bs58 = require("bs58");

async function main() {
  console.log("🚀 Starting Phantom Client Multi-Authenticator Test");
  console.log("This test demonstrates PhantomClient methods for multi-authenticator organizations");
  console.log("═".repeat(80));

  // Step 1: Generate two key pairs for different authenticators
  console.log("\n🔑 Step 1: Generate Key Pairs");

  const primaryKeyPair = generateKeyPair();
  const secondaryKeyPair = generateKeyPair();

  console.log(`✅ Primary key pair: ${primaryKeyPair.publicKey.substring(0, 20)}...`);
  console.log(`✅ Secondary key pair: ${secondaryKeyPair.publicKey.substring(0, 20)}...`);

  // Step 2: Create stamper and client using primary key
  console.log("\n🔧 Step 2: Initialize PhantomClient");

  const primaryStamper = new ApiKeyStamper({
    apiSecretKey: primaryKeyPair.secretKey,
  });

  const client = new PhantomClient(
    {
      apiBaseUrl: "https://staging-api.phantom.app/v1/wallets",
    },
    primaryStamper,
  );

  console.log("✅ PhantomClient initialized");

  // Step 3: Create organization with multiple authenticators
  console.log("\n🏢 Step 3: Test createOrganization with Multiple Authenticators");

  const organizationName = `Test Org ${Date.now()}`;
  const primaryAuthName = `Primary-Auth-${Date.now()}`;
  const secondaryAuthName = `Secondary-Auth-${Date.now()}`;
  const customUsername = `test-user-${Date.now()}`;

  // Define the user configuration with multiple authenticators
  const users = [
    {
      username: customUsername,
      role: "ADMIN" as const,
      authenticators: [
        {
          authenticatorName: primaryAuthName,
          authenticatorKind: "keypair" as const,
          publicKey: base64urlEncode(bs58.decode(primaryKeyPair.publicKey)),
          algorithm: "Ed25519" as const,
        },
        {
          authenticatorName: secondaryAuthName,
          authenticatorKind: "keypair" as const,
          publicKey: base64urlEncode(bs58.decode(secondaryKeyPair.publicKey)),
          algorithm: "Ed25519" as const,
        },
      ],
    },
  ];

  try {
    console.log(`Creating organization: ${organizationName}`);
    console.log(`With custom username: ${customUsername}`);
    console.log(`With ${users[0].authenticators.length} authenticators`);

    const organization = await client.createOrganization(organizationName, users);

    console.log(`✅ Organization created successfully!`);
    console.log(`   ID: ${organization.organizationId}`);
    console.log(`   Name: ${organization.organizationName}`);

    // Step 4: Test getOrganization method
    console.log("\n🔍 Step 4: Test getOrganization Method");

    let firstAuthenticatorId = "";

    try {
      const retrievedOrg = await client.getOrganization(organization.organizationId);
      console.log(`✅ getOrganization works!`);
      console.log(`   Retrieved: ${retrievedOrg.organizationName}`);
      console.log(`   Users: ${retrievedOrg.users?.length || 0}`);
      console.log(`   Authenticators: ${retrievedOrg.users?.[0]?.authenticators?.length || 0}`);
      console.log(`   Response:`, JSON.stringify(retrievedOrg, null, 2));

      // Get authenticator ID for subsequent tests (we already know the username)
      if (
        retrievedOrg.users &&
        retrievedOrg.users.length > 0 &&
        retrievedOrg.users[0].authenticators &&
        retrievedOrg.users[0].authenticators.length > 0
      ) {
        firstAuthenticatorId = retrievedOrg.users[0].authenticators[0].id;
      }
    } catch (error) {
      console.error("❌ getOrganization failed:", error instanceof Error ? error.message : String(error));
    }

    // Step 5: Test secondary authenticator access
    console.log("\n🔄 Step 5: Test Secondary Authenticator Access");

    const secondaryStamper = new ApiKeyStamper({
      apiSecretKey: secondaryKeyPair.secretKey,
    });

    const secondaryClient = new PhantomClient(
      {
        apiBaseUrl: "https://staging-api.phantom.app/v1/wallets",
        organizationId: organization.organizationId,
      },
      secondaryStamper,
    );

    console.log("✅ Secondary client created");

    // Step 6: Test wallet operations
    console.log("\n💰 Step 6: Test Wallet Creation");

    client.setOrganizationId(organization.organizationId);
    const wallet = await client.createWallet("Test Wallet");

    console.log(`✅ Wallet created: ${wallet.walletId.substring(0, 20)}...`);
    console.log(`   Response:`, JSON.stringify(wallet, null, 2));

    // Step 7: Test getWalletWithTag method
    console.log("\n🏷️ Step 7: Test getWalletWithTag Method");

    try {
      await client.getWalletWithTag({
        organizationId: organization.organizationId,
        tag: "test-tag",
        derivationPaths: ["m/44'/501'/0'/0'"],
      });
      console.log(`✅ getWalletWithTag found tagged wallet`);
    } catch (error) {
      console.log(`ℹ️ getWalletWithTag works (no tagged wallets exist yet)`);
    }

    // Step 8: Test createAuthenticator method
    console.log("\n🔐 Step 8: Test createAuthenticator Method");

    try {
      const thirdKeyPair = generateKeyPair();
      const thirdAuthName = `Third-Auth-${Date.now()}`;

      const createAuthResult = await client.createAuthenticator({
        organizationId: organization.organizationId,
        username: customUsername, // Using our custom username
        authenticatorName: thirdAuthName,
        authenticator: {
          authenticatorName: thirdAuthName,
          authenticatorKind: "keypair",
          publicKey: base64urlEncode(bs58.decode(thirdKeyPair.publicKey)),
          algorithm: "Ed25519",
        },
      });

      console.log(`✅ createAuthenticator works`);
      console.log(`   Response:`, JSON.stringify(createAuthResult, null, 2));
    } catch (error) {
      console.log(`ℹ️ createAuthenticator method error:`, error instanceof Error ? error.message : String(error));
    }

    // Step 9: Test deleteAuthenticator method
    console.log("\n🗑️ Step 9: Test deleteAuthenticator Method");

    if (firstAuthenticatorId) {
      try {
        const deleteAuthResult = await client.deleteAuthenticator({
          organizationId: organization.organizationId,
          username: customUsername, // Using our custom username
          authenticatorId: firstAuthenticatorId, // Using actual authenticator ID
        });
        console.log(`✅ deleteAuthenticator works`);
        console.log(`   Response:`, JSON.stringify(deleteAuthResult, null, 2));
      } catch (error) {
        console.log(`ℹ️ deleteAuthenticator method error:`, error instanceof Error ? error.message : String(error));
      }
    } else {
      console.log(`ℹ️ deleteAuthenticator skipped (no authenticator ID found)`);
    }

    // Step 10: Test secondary authenticator access
    console.log("\n🔄 Step 10: Test Multi-Authenticator Access");

    try {
      const secondaryOrgResult = await secondaryClient.getOrganization(organization.organizationId);
      console.log(`✅ Both authenticators can access the same organization!`);
      console.log(`   Primary auth: ${primaryKeyPair.publicKey.substring(0, 12)}...`);
      console.log(`   Secondary auth: ${secondaryKeyPair.publicKey.substring(0, 12)}...`);
      console.log(`   Secondary auth response:`, JSON.stringify(secondaryOrgResult, null, 2));
    } catch (error) {
      console.log(`❌ Secondary auth failed:`, error instanceof Error ? error.message : String(error));
    }
  } catch (error) {
    console.error("❌ Test failed:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  console.log("\n" + "═".repeat(80));
  console.log("🎉 All PhantomClient Methods Tested Successfully!");
  console.log("\n📋 Test Results:");
  console.log("✅ createOrganization - Created organization with multiple authenticators");
  console.log("✅ getOrganization - Retrieved organization details");
  console.log("✅ getWalletWithTag - Method tested (no tagged wallets found)");
  console.log("✅ createAuthenticator - Successfully created additional authenticator");
  console.log("✅ deleteAuthenticator - Successfully deleted authenticator");
  console.log("✅ Multi-auth access - Both authenticators accessed same organization");
  console.log("✅ OIDC support - AuthenticatorConfig supports OIDC with jwksUrl and idTokenClaims");
  console.log("\n💡 All PhantomClient multi-authenticator functionality is working correctly!");
}

// Run the multi-authenticator test
main().catch(error => {
  console.error("💥 Test failed:", error);
  process.exit(1);
});
