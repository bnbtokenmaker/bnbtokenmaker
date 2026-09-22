export const SITE_URL = "https://bnbtokenmaker.com";

export const PUBLIC_ROUTES = [
  "/",
  "/create",
  "/features",
  "/how-it-works",
  "/docs",
  "/faq",
  "/blog",
  "/contact",
  "/terms",
  "/privacy",
  "/disclaimer",
  "/bep20-token-generator",
  "/create-bep20-token",
  "/bnb-token-generator",
  "/create-token-on-bnb-chain",
  "/bep20-token-cost",
  "/bep20-vs-erc20",
  "/create-meme-coin-bnb-chain",
  "/bep20-tokenomics",
  "/bep20-token-security-checklist",
  "/verify-bep20-token",
  "/add-bep20-token-to-wallet",
  "/meme-coin-tokenomics",
  "/blog/how-to-create-a-bep20-token",
] as const;

export function publicUrl(route: string): string {
  return SITE_URL + route;
}

export type LlmsItem = {
  label: string;
  path: string;
  desc?: string;
};

export type LlmsSection = {
  heading: string;
  items: ReadonlyArray<LlmsItem>;
};

export const LLMS_SECTIONS: ReadonlyArray<LlmsSection> = [
  {
    heading: "Product",
    items: [
      { label: "Homepage", path: "/", desc: "Independent tool for creating BEP-20 tokens on BNB Smart Chain." },
      {
        label: "Create Token",
        path: "/create",
        desc: "Configure and generate a BEP-20 token contract, then deploy from your wallet.",
      },
      {
        label: "Features",
        path: "/features",
        desc: "Optional smart-contract controls — mint, burn, pause, max wallet, ownership.",
      },
      {
        label: "How It Works",
        path: "/how-it-works",
        desc: "Step-by-step flow from token configuration to a deployed contract.",
      },
    ],
  },
  {
    heading: "Documentation",
    items: [
      {
        label: "Documentation",
        path: "/docs",
        desc: "Token standard, deployment, network and wallet topics.",
      },
      {
        label: "FAQ",
        path: "/faq",
        desc: "Common questions about creating tokens on BNB Smart Chain.",
      },
    ],
  },
  {
    heading: "Core Guides",
    items: [
      {
        label: "BEP-20 Token Generator",
        path: "/bep20-token-generator",
        desc: "Generate a standards-compliant BEP-20 token contract.",
      },
      {
        label: "Create a BEP-20 Token",
        path: "/create-bep20-token",
        desc: "Full walkthrough for creating a BEP-20 token.",
      },
      {
        label: "BNB Token Generator",
        path: "/bnb-token-generator",
        desc: "What a BNB token generator does and how BNB relates to BEP-20.",
      },
      {
        label: "Create Token on BNB Chain",
        path: "/create-token-on-bnb-chain",
        desc: "Deploy a token on BNB Smart Chain, including the testnet flow.",
      },
      {
        label: "BEP-20 Token Cost",
        path: "/bep20-token-cost",
        desc: "Platform fee versus network gas when creating a BEP-20 token.",
      },
      {
        label: "BEP-20 vs ERC-20",
        path: "/bep20-vs-erc20",
        desc: "How the BNB Smart Chain token standard relates to Ethereum's ERC-20.",
      },
      {
        label: "Create a Meme Coin on BNB Chain",
        path: "/create-meme-coin-bnb-chain",
        desc: "Example meme-coin configuration on BNB Smart Chain.",
      },
    ],
  },
  {
    heading: "Technical / Educational Resources",
    items: [
      {
        label: "BEP-20 Tokenomics",
        path: "/bep20-tokenomics",
        desc: "Supply, burn and wallet-limit design for BEP-20 tokens.",
      },
      {
        label: "BEP-20 Token Security Checklist",
        path: "/bep20-token-security-checklist",
        desc: "Security considerations when launching a BEP-20 token.",
      },
      {
        label: "Verify a BEP-20 Token on BscScan",
        path: "/verify-bep20-token",
        desc: "Verify a deployed BEP-20 token's source code on BscScan.",
      },
      {
        label: "Add a BEP-20 Token to a Wallet",
        path: "/add-bep20-token-to-wallet",
        desc: "Import a custom BEP-20 token into MetaMask or Trust Wallet.",
      },
      {
        label: "Meme Coin Tokenomics",
        path: "/meme-coin-tokenomics",
        desc: "Token economics levers specific to meme coins.",
      },
    ],
  },
  {
    heading: "Blog",
    items: [
      {
        label: "Blog",
        path: "/blog",
        desc: "Guides and articles about BEP-20 tokens on BNB Smart Chain.",
      },
      {
        label: "Guide: Creating a BEP-20 Token",
        path: "/blog/how-to-create-a-bep20-token",
        desc: "The main comprehensive guide to creating a BEP-20 token.",
      },
    ],
  },
  {
    heading: "Company & Policies",
    items: [
      {
        label: "Contact",
        path: "/contact",
        desc: "Platform questions, technical support and security enquiries.",
      },
      {
        label: "Terms of Service",
        path: "/terms",
        desc: "Terms governing access to and use of BNB Token Maker.",
      },
      {
        label: "Privacy Policy",
        path: "/privacy",
        desc: "How information is handled when you use BNB Token Maker.",
      },
      {
        label: "Disclaimer",
        path: "/disclaimer",
        desc: "Disclaimers about token deployment and blockchain transactions.",
      },
    ],
  },
];