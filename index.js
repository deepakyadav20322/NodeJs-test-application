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

import express from 'express';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';

const app = express();
const s3 = new S3Client({ region: 'your-region' });

const BUCKET_NAME = 'your-bucket';

app.get('/processed/:transformations/:filename', async (req, res) => {
    const { transformations, filename } = req.params;

    try {
        // Construct S3 key
        const s3Key = `processed/${transformations}/${filename}`;

        // Try to fetch from S3 (Cache Layer)
        try {
            const getObjectParams = { Bucket: BUCKET_NAME, Key: s3Key };
            const { Body, ContentType } = await s3.send(new GetObjectCommand(getObjectParams));
            
            // Set CloudFront caching headers
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // 1-year cache
            res.setHeader('Content-Type', ContentType);
            return Body.pipe(res);
        } catch (error) {
            console.log('Image not found in cache, processing:', filename);
        }

        // Extract transformation parameters
        const { w, h, q, f } = parseTransformations(transformations);

        // Fetch Original Image from S3
        const originalKey = `original/${filename}`;
        const originalImage = await s3.send(new GetObjectCommand({ Bucket: BUCKET_NAME, Key: originalKey }));

        // Process Image with Sharp
        let image = sharp(await originalImage.Body.buffer());
        if (w || h) image = image.resize(w, h);
        if (q) image = image.jpeg({ quality: q });
        if (f) image = image.toFormat(f);

        const buffer = await image.toBuffer();

        // Store Processed Image in S3
        await s3.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: s3Key,
            Body: buffer,
            ContentType: `image/${f || 'jpeg'}`,
            CacheControl: 'public, max-age=31536000, immutable'
        }));

        // Respond with Processed Image
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.setHeader('Content-Type', `image/${f || 'jpeg'}`);
        res.send(buffer);
    } catch (error) {
        console.error('Error processing image:', error);
        res.status(500).send('Internal Server Error');
    }
});

function parseTransformations(transformations) {
    const params = { w: null, h: null, q: null, f: null };
    transformations.split(',').forEach(param => {
        const [key, value] = param.split('_');
        if (key === 'w' || key === 'h' || key === 'q') params[key] = parseInt(value, 10);
        if (key === 'f') params[key] = value;
    });
    return params;
}

app.listen(4000, () => console.log('Image processing server running on port 4000'));


// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
