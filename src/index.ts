import express from 'express';
import { renderApp } from './lib/server/render';
import React from 'react';
import { App } from './App';

const app = express();

app.get('*', async (req, res) => {
    try {
        const html = await renderApp(<App />);
        res.send(html);
    } catch (error) {
        console.error('Rendering error:', error);
        res.status(500).send('Server error');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
