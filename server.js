const express = require('express');
const cors = require('cors');
const path = require('path');
const { csv2json, parseCSV } = require('./help/csv2json');

const app = express();
const port = 3000;

// Enable CORS for all origins
app.use(cors());

// Disable CSP by adding appropriate headers
app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval'");
    next();
});

// Serve static files from the current directory
app.use(express.static(path.join(__dirname)));

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
app.get('products', async () => {
    const prod = await parseCSV(`http://localhost:${port}/res/prod.csv`);
    

});
