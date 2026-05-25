const fs = require('fs');
const { createCanvas } = require('canvas');

function createIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Background
  ctx.fillStyle = '#007bff';
  ctx.fillRect(0, 0, size, size);
  
  // Circle border
  ctx.strokeStyle = 'white';
  ctx.lineWidth = size / 24;
  ctx.beginPath();
  ctx.arc(size/2, size/2, size * 0.4, 0, 2 * Math.PI);
  ctx.stroke();
  
  // Text
  ctx.fillStyle = 'white';
  ctx.font = `bold ${size * 0.4}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('O', size/2, size/2);
  
  // Save as PNG
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(`icon-${size}.png`, buffer);
  console.log(`Created icon-${size}.png`);
}

createIcon(192);
createIcon(512);
console.log('Icons created successfully!');
