const express = require('express');
const axios = require('axios');
const { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } = require('@solana/web3.js');

const app = express();
const port = 3000;

// Middleware to parse JSON requests
app.use(express.json());

// Define OpenStreetMap API URL
const OSM_URL = 'https://nominatim.openstreetmap.org/search';

// Solana connection (using Devnet for testing)
const connection = new Connection('https://api.devnet.solana.com');

// In-memory storage for businesses with sample data in Calabar
const businesses = [
    {
        id: 1,
        name: "Henry Store",
        location: "123 Calabar Road, Calabar, Cross River, Nigeria",
        contact: "12345678",
        products: ["Clothing", "Electronics"],
        services: ["Delivery", "Customer Support"]
    },
    {
        id: 2,
        name: "Tech Hub",
        location: "456 Technology Avenue, Calabar, Cross River, Nigeria",
        contact: "87654321",
        products: ["Laptops", "Smartphones"],
        services: ["Repair", "Setup Assistance"]
    },
    {
        id: 3,
        name: "Grocery Mart",
        location: "789 Market Street, Calabar, Cross River, Nigeria",
        contact: "23456789",
        products: ["Groceries", "Household Items"],
        services: ["Home Delivery"]
    },
    {
        id: 4,
        name: "Book Nook",
        location: "101 Book Street, Calabar, Cross River, Nigeria",
        contact: "34567890",
        products: ["Books", "Stationery"],
        services: ["Book Rentals", "Reading Events"]
    },
    {
        id: 5,
        name: "Fitness Center",
        location: "202 Fitness Drive, Calabar, Cross River, Nigeria",
        contact: "45678901",
        products: ["Gym Equipment", "Supplements"],
        services: ["Personal Training", "Group Classes"]
    }
];

// Wallet information (replace this with your Solflare public key)
const SENDER_PUBLIC_KEY = '5ZCKaDMLvcFoeS1f4sfoXHK7sDagW3T3BMmuS9CBF5P8';
const SENDER_PRIVATE_KEY = 'REPLACE_WITH_YOUR_SOLFLARE_WALLET_PRIVATE_KEY'; // Optional if you sign with a wallet manually

// Route to retrieve location information from OpenStreetMap
app.get('/locations', async (req, res) => {
    const { query } = req.query;

    if (!query) {
        return res.status(400).json({ error: 'Query parameter is required' });
    }

    try {
        const response = await axios.get(OSM_URL, {
            params: {
                q: query,
                format: 'json',
                addressdetails: 1,
                limit: 5
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error('Error retrieving location data:', error);
        res.status(500).json({ error: 'Failed to retrieve location data' });
    }
});

// Route to add a new business
app.post('/businesses', (req, res) => {
    const { name, location, contact, products, services } = req.body;

    if (!name || !location || !contact) {
        return res.status(400).json({ error: 'Name, location, and contact are required' });
    }

    const business = {
        id: businesses.length + 1,
        name,
        location,
        contact,
        products: products || [],
        services: services || []
    };

    businesses.push(business);
    res.status(201).json({ message: 'Business added successfully', business });
});

// Route to retrieve all businesses
app.get('/businesses', (req, res) => {
    res.json(businesses);
});

// Route to retrieve a specific business by ID
app.get('/businesses/:id', (req, res) => {
    const { id } = req.params;
    const business = businesses.find(b => b.id == id);

    if (business) {
        res.json(business);
    } else {
        res.status(404).json({ error: 'Business not found' });
    }
});

// Route to update a business by ID
app.put('/businesses/:id', (req, res) => {
    const { id } = req.params;
    const { name, location, contact, products, services } = req.body;

    const business = businesses.find(b => b.id == id);

    if (business) {
        business.name = name || business.name;
        business.location = location || business.location;
        business.contact = contact || business.contact;
        business.products = products || business.products;
        business.services = services || business.services;

        res.json({ message: 'Business updated successfully', business });
    } else {
        res.status(404).json({ error: 'Business not found' });
    }
});

// Route to retrieve Solana account information
app.get('/solana/account/:publicKey', async (req, res) => {
    const { publicKey } = req.params;

    try {
        const accountInfo = await connection.getAccountInfo(new PublicKey(publicKey));

        if (accountInfo) {
            res.json({
                publicKey: publicKey,
                lamports: accountInfo.lamports,
                owner: accountInfo.owner.toString(),
            });
        } else {
            res.status(404).json({ error: 'Account not found' });
        }
    } catch (error) {
        console.error('Error retrieving Solana account:', error);
        res.status(500).json({ error: 'Failed to retrieve Solana account' });
    }
});

// Route to send SOL from your Solflare wallet to another account
app.post('/solana/send', async (req, res) => {
    const { recipientPublicKey, amount } = req.body;

    if (!recipientPublicKey || !amount) {
        return res.status(400).json({ error: 'Recipient public key and amount are required' });
    }

    try {
        // Create a transaction
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: new PublicKey(SENDER_PUBLIC_KEY),
                toPubkey: new PublicKey(recipientPublicKey),
                lamports: amount * LAMPORTS_PER_SOL, // Amount in SOL
            })
        );

        // Send the transaction (sign it with your wallet)
        const signature = await connection.sendTransaction(transaction, [SENDER_PRIVATE_KEY], {
            skipPreflight: false,
            preflightCommitment: 'singleGossip'
        });

        // Confirm the transaction
        await connection.confirmTransaction(signature);

        res.json({ message: 'Transaction sent successfully', signature });
    } catch (error) {
        console.error('Error sending transaction:', error);
        res.status(500).json({ error: 'Failed to send SOL' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`BuyHere API running at http://localhost:${port}`);
});
