import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.14.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

// NFT Core Functionality Tests
Clarinet.test({
    name: "Ensure that NFT minting works correctly",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const deployer = accounts.get("deployer")!;
        const wallet1 = accounts.get("wallet_1")!;

        let block = chain.mineBlock([
            Tx.contractCall(
                "charity_platform",
                "mint",
                [
                    types.utf8("ipfs://test-uri"),
                    types.utf8("art")
                ],
                wallet1.address
            )
        ]);

        // Assert successful mint
        assertEquals(block.receipts.length, 1);
        assertEquals(block.height, 2);
        assertEquals(block.receipts[0].result, '(ok u1)');

        // Verify NFT ownership
        const owner = chain.callReadOnlyFn(
            "charity_platform",
            "get-owner",
            [types.uint(1)],
            wallet1.address
        );
        assertEquals(owner.result, `(some ${wallet1.address})`);
    },
});

// NFT Trading Tests
Clarinet.test({
    name: "Ensure that NFT transfer and listing works correctly",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const wallet1 = accounts.get("wallet_1")!;
        const wallet2 = accounts.get("wallet_2")!;

        // First mint an NFT
        let block = chain.mineBlock([
            Tx.contractCall(
                "charity_platform",
                "mint",
                [types.utf8("ipfs://test-uri"), types.utf8("art")],
                wallet1.address
            )
        ]);

        // List NFT for sale
        block = chain.mineBlock([
            Tx.contractCall(
                "charity_platform",
                "list-for-sale",
                [types.uint(1), types.uint(1000)],
                wallet1.address
            )
        ]);
        assertEquals(block.receipts[0].result, '(ok true)');

        // Transfer NFT
        block = chain.mineBlock([
            Tx.contractCall(
                "charity_platform",
                "transfer",
                [types.uint(1), types.principal(wallet2.address)],
                wallet1.address
            )
        ]);
        assertEquals(block.receipts[0].result, '(ok true)');

        // Verify new owner
        const owner = chain.callReadOnlyFn(
            "charity_platform",
            "get-owner",
            [types.uint(1)],
            wallet2.address
        );
        assertEquals(owner.result, `(some ${wallet2.address})`);
    },
});

// Charity Campaign Tests
Clarinet.test({
    name: "Ensure that charity campaign creation and donation works",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const deployer = accounts.get("deployer")!;
        const wallet1 = accounts.get("wallet_1")!;

        // Create campaign
        let block = chain.mineBlock([
            Tx.contractCall(
                "charity_platform",
                "create-charity-campaign",
                [
                    types.utf8("Test Campaign"),
                    types.utf8("Description"),
                    types.uint(10000),
                    types.uint(100)
                ],
                deployer.address
            )
        ]);
        assertEquals(block.receipts[0].result, '(ok u1)');

        // Make donation
        block = chain.mineBlock([
            Tx.contractCall(
                "charity_platform",
                "donate-to-campaign",
                [types.uint(1), types.uint(1000)],
                wallet1.address
            )
        ]);
        assertEquals(block.receipts[0].result, '(ok true)');

        // Check campaign details
        const campaign = chain.callReadOnlyFn(
            "charity_platform",
            "get-campaign-details",
            [types.uint(1)],
            deployer.address
        );
        assertEquals(campaign.result.includes('"raised": u1000'), true);
    },
});

// NFT Donation to Campaign Tests
Clarinet.test({
    name: "Ensure that NFT donation to campaign works correctly",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const deployer = accounts.get("deployer")!;
        const wallet1 = accounts.get("wallet_1")!;

        // Create campaign
        let block = chain.mineBlock([
            Tx.contractCall(
                "charity_platform",
                "create-charity-campaign",
                [
                    types.utf8("NFT Campaign"),
                    types.utf8("Description"),
                    types.uint(10000),
                    types.uint(100)
                ],
                deployer.address
            )
        ]);

        // Mint NFT
        block = chain.mineBlock([
            Tx.contractCall(
                "charity_platform",
                "mint",
                [types.utf8("ipfs://test-uri"), types.utf8("art")],
                wallet1.address
            )
        ]);

        // List NFT with price
        block = chain.mineBlock([
            Tx.contractCall(
                "charity_platform",
                "list-for-sale",
                [types.uint(1), types.uint(1000)],
                wallet1.address
            )
        ]);

        // Donate NFT to campaign
        block = chain.mineBlock([
            Tx.contractCall(
                "charity_platform",
                "donate-nft-to-campaign",
                [types.uint(1), types.uint(1)],
                wallet1.address
            )
        ]);
        assertEquals(block.receipts[0].result, '(ok true)');

        // Verify campaign NFTs
        const campaignNFTs = chain.callReadOnlyFn(
            "charity_platform",
            "get-campaign-nfts",
            [types.uint(1)],
            deployer.address
        );
        assertEquals(campaignNFTs.result.includes('u1'), true);
    },
});

// Milestone Tests
Clarinet.test({
    name: "Ensure that campaign milestones work correctly",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const deployer = accounts.get("deployer")!;
        const wallet1 = accounts.get("wallet_1")!;

        // Create campaign
        let block = chain.mineBlock([
            Tx.contractCall(
                "charity_platform",
                "create-charity-campaign",
                [
                    types.utf8("Milestone Campaign"),
                    types.utf8("Description"),
                    types.uint(10000),
                    types.uint(100)
                ],
                deployer.address
            )
        ]);

        // Add milestone
        block = chain.mineBlock([
            Tx.contractCall(
                "charity_platform",
                "add-campaign-milestone",
                [
                    types.uint(1),
                    types.uint(1),
                    types.utf8("First Milestone"),
                    types.uint(5000),
                    types.utf8("ipfs://reward-uri")
                ],
                deployer.address
            )
        ]);
        assertEquals(block.receipts[0].result, '(ok true)');

        // Make large donation to reach milestone
        block = chain.mineBlock([
            Tx.contractCall(
                "charity_platform",
                "donate-to-campaign",
                [types.uint(1), types.uint(5000)],
                wallet1.address
            )
        ]);

        // Claim milestone reward
        block = chain.mineBlock([
            Tx.contractCall(
                "charity_platform",
                "check-and-claim-milestone-reward",
                [types.uint(1), types.uint(1)],
                wallet1.address
            )
        ]);
        // Should receive new NFT token ID
        assertEquals(block.receipts[0].result.includes('ok u'), true);
    },
});

// Administrative Functions Tests
Clarinet.test({
    name: "Ensure that administrative functions work correctly",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const deployer = accounts.get("deployer")!;
        const wallet1 = accounts.get("wallet_1")!;

        // Test setting charity address
        let block = chain.mineBlock([
            Tx.contractCall(
                "charity_platform",
                "set-charity-address",
                [types.principal(wallet1.address)],
                deployer.address
            )
        ]);
        assertEquals(block.receipts[0].result, '(ok true)');

        // Test setting donation percentage
        block = chain.mineBlock([
            Tx.contractCall(
                "charity_platform",
                "set-donation-percentage",
                [types.uint(30)],
                deployer.address
            )
        ]);
        assertEquals(block.receipts[0].result, '(ok true)');

        // Test pausing contract
        block = chain.mineBlock([
            Tx.contractCall(
                "charity_platform",
                "toggle-pause",
                [],
                deployer.address
            )
        ]);
        assertEquals(block.receipts[0].result, '(ok true)');

        // Test ending campaign
        block = chain.mineBlock([
            Tx.contractCall(
                "charity_platform",
                "end-campaign",
                [types.uint(1)],
                deployer.address
            )
        ]);
        assertEquals(block.receipts[0].result, '(ok true)');
    },
});

// Error Cases Tests
Clarinet.test({
    name: "Ensure that error cases are handled correctly",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const deployer = accounts.get("deployer")!;
        const wallet1 = accounts.get("wallet_1")!;
        const wallet2 = accounts.get("wallet_2")!;

        // Try to transfer non-existent NFT
        let block = chain.mineBlock([
            Tx.contractCall(
                "charity_platform",
                "transfer",
                [types.uint(999), types.principal(wallet2.address)],
                wallet1.address
            )
        ]);
        assertEquals(block.receipts[0].result, '(err u1)');

        // Try to create campaign as non-owner
        block = chain.mineBlock([
            Tx.contractCall(
                "charity_platform",
                "create-charity-campaign",
                [
                    types.utf8("Test Campaign"),
                    types.utf8("Description"),
                    types.uint(10000),
                    types.uint(100)
                ],
                wallet1.address
            )
        ]);
        assertEquals(block.receipts[0].result, '(err u100)');

        // Try to donate to non-existent campaign
        block = chain.mineBlock([
            Tx.contractCall(
                "charity_platform",
                "donate-to-campaign",
                [types.uint(999), types.uint(1000)],
                wallet1.address
            )
        ]);
        assertEquals(block.receipts[0].result, '(err u104)');
    },
});