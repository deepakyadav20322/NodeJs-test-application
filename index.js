const express = require('express');
const bodyParser = require('body-parser');
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware to parse JSON bodies
app.use(cors());
app.use(bodyParser.json());

// GET endpoint
app.get('/test', (req, res) => {
    res.json({ message: 'GET request successful!!!!!' });
});

// POST endpoint
app.post('/test', (req, res) => {
    res.json({ receivedData: req.body });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
