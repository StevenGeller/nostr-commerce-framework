const express = require('express');
const store = require('./store');

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

// Basic store endpoints
app.get('/', (req, res) => {
    res.json({
        name: store.name,
        description: store.description,
        currency: store.currency
    });
});

app.post('/invoice', async (req, res) => {
    try {
        const { amount } = req.body;
        const invoice = await store.createInvoice(amount);
        res.json(invoice);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Store server running on port ${port}`);
});