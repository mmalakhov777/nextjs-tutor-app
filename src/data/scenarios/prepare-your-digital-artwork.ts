import { ScenarioData } from '@/types/scenarios';
import { MegaphoneIcon } from 'lucide-react';

export const prepareYourDigitalArtwork: ScenarioData = {
  id: 'prepare-your-digital-artwork',
  title: 'How to turn artwork into nft',
  description: 'A step-by-step guide to creating, minting, and protecting your NFT art, from digital preparation to marketplace success and advanced utilities.',
  icon: MegaphoneIcon,
  color: '#7A5CFA',
  steps: [
    {
      title: 'Prepare Your Digital Artwork',
      description: 'Get your artwork ready in the appropriate digital format and resolution for NFT minting.',
      actions: [
        {
          label: 'Choose the right file format',
          prompt: 'What file formats are best for minting my artwork as an NFT?'
        },
        {
          label: "Optimize file size and resolution",
          prompt: "How do I optimize my artwork's file size and resolution for NFT platforms?"
        },
        {
          label: 'Convert physical art to digital',
          prompt: 'How can I digitize my physical artwork for NFT creation?'
        }
      ]
    },
    {
      title: 'Select a Blockchain Platform',
      description: 'Choose the blockchain where your NFT will be minted, considering fees, speed, and community.',
      actions: [
        {
          label: 'Compare blockchain options',
          prompt: 'What are the pros and cons of Ethereum, Solana, and Tezos for NFTs?'
        },
        {
          label: 'Understand blockchain fees',
          prompt: 'How do transaction fees differ between NFT blockchains?'
        },
        {
          label: 'Pick the best blockchain for my needs',
          prompt: 'Which blockchain should I use for my NFT art project?'
        }
      ]
    },
    {
      title: 'Set Up a Crypto Wallet',
      description: 'Create and secure a crypto wallet compatible with your chosen blockchain and NFT marketplace.',
      actions: [
        {
          label: 'Create a crypto wallet',
          prompt: 'How do I set up a crypto wallet for NFTs?'
        },
        {
          label: 'Secure my wallet',
          prompt: 'What are the best practices for keeping my crypto wallet safe?'
        },
        {
          label: 'Choose a wallet for my blockchain',
          prompt: 'Which crypto wallet should I use for Ethereum/Solana/Tezos NFTs?'
        }
      ]
    },
    {
      title: 'Choose an NFT Marketplace',
      description: 'Select a marketplace that fits your art style, audience, and blockchain.',
      actions: [
        {
          label: 'Compare NFT marketplaces',
          prompt: 'What are the differences between OpenSea, Rarible, SuperRare, and other NFT marketplaces?'
        },
        {
          label: 'Find a marketplace for my art',
          prompt: 'Which NFT marketplace is best for my type of artwork?'
        },
        {
          label: 'Understand marketplace fees',
          prompt: 'What fees should I expect when selling NFTs on different platforms?'
        }
      ]
    },
    {
      title: 'Mint Your NFT',
      description: 'Upload your artwork, add metadata, set royalties, and mint your NFT on the chosen platform.',
      actions: [
        {
          label: 'Step-by-step minting guide',
          prompt: 'Can you walk me through the process of minting my first NFT?'
        },
        {
          label: 'Set up royalties',
          prompt: 'How do I set up royalties for my NFT sales?'
        },
        {
          label: 'Add metadata to my NFT',
          prompt: 'What metadata should I include when minting my NFT?'
        }
      ]
    },
    {
      title: 'Navigate Legal and Copyright Issues',
      description: 'Understand copyright, intellectual property, and licensing for NFT art.',
      actions: [
        {
          label: 'Understand NFT copyright',
          prompt: 'What copyright rights do I keep or transfer when I sell an NFT?'
        },
        {
          label: 'Create a license for my NFT',
          prompt: 'How do I write a license or terms for my NFT buyers?'
        },
        {
          label: 'Avoid copyright infringement',
          prompt: 'How can I make sure I'm not infringing on someone else's copyright when minting NFTs?'
        }
      ]
    },
    {
      title: 'Store and Showcase Your NFT Art',
      description: 'Ensure your NFT files are securely stored and learn how to display your digital art.',
      actions: [
        {
          label: 'Store NFT files securely',
          prompt: 'What are the best ways to store my NFT artwork files for long-term access?'
        },
        {
          label: 'Use decentralized storage',
          prompt: 'How do I use IPFS or other decentralized storage for my NFT art?'
        },
        {
          label: 'Showcase my NFTs',
          prompt: 'What are the best ways to display my NFT art online or in physical spaces?'
        }
      ]
    },
    {
      title: 'Protect Yourself and Your NFTs',
      description: 'Adopt security best practices to avoid scams, hacks, and loss of assets.',
      actions: [
        {
          label: 'Avoid NFT scams',
          prompt: 'What are common NFT scams and how can I protect myself?'
        },
        {
          label: 'Use hardware wallets',
          prompt: 'How do hardware wallets help secure my NFTs and crypto assets?'
        },
        {
          label: 'Check smart contract safety',
          prompt: 'How can I verify that an NFT smart contract is safe before interacting with it?'
        }
      ]
    },
    {
      title: 'Explore Advanced NFT Utilities',
      description: 'Leverage NFTs for community building, exclusive content, and new engagement models.',
      actions: [
        {
          label: 'Offer exclusive content',
          prompt: 'How can I use NFTs to give collectors access to exclusive content or experiences?'
        },
        {
          label: 'Build a community with NFTs',
          prompt: 'What are ways to use NFTs to build and engage a community around my art?'
        },
        {
          label: 'Use NFTs for real-world assets',
          prompt: 'How can NFTs represent ownership or access to real-world items or events?'
        }
      ]
    },
    {
      title: 'Stay Informed and Adapt',
      description: 'Keep up with legal, technical, and market changes in the NFT space.',
      actions: [
        {
          label: 'Monitor NFT regulations',
          prompt: 'How can I stay updated on legal and regulatory changes affecting NFTs?'
        },
        {
          label: 'Follow NFT security news',
          prompt: 'Where can I find the latest information on NFT security threats and best practices?'
        },
        {
          label: 'Adapt to NFT market trends',
          prompt: 'What are the current trends in the NFT art market and how can I adapt my strategy?'
        }
      ]
    }
  ]
}
