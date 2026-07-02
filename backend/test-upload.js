// Simple test script to check image upload
const fs = require('fs');
const FormData = require('form-data');
const http = require('http');

const testImage = {
    originalname: 'test.jpg',
    mimetype: 'image/jpeg',
    buffer: Buffer.from('fake image data')
};

const form = new FormData();
form.append('image', testImage.buffer, {
    filename: 'test.jpg',
    contentType: 'image/jpeg'
});

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/images/upload/test123',
    method: 'POST',
    headers: form.getHeaders()
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Response:', data);
    });
});

req.on('error', (error) => {
    console.error('Error:', error.message);
});

form.pipe(req);