/**
 * Generate PNG icons from SVG for PWA
 * Run: node scripts/generate-icons.js
 */

const fs = require('fs')
const path = require('path')

// Simple SVG to PNG conversion using canvas
const { createCanvas } = require('canvas')

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]
const svgPath = path.join(__dirname, '../public/shield.svg')
const outputDir = path.join(__dirname, '../public')

const svgContent = fs.readFileSync(svgPath, 'utf8')

async function generateIcons() {
  console.log('Generating PWA icons...')
  
  for (const size of sizes) {
    const canvas = createCanvas(size, size)
    const ctx = canvas.getContext('2d')
    
    // Draw background
    const gradient = ctx.createLinearGradient(0, 0, size, size)
    gradient.addColorStop(0, '#6366f1')
    gradient.addColorStop(1, '#8b5cf6')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size, size)
    
    // Draw shield shape
    ctx.beginPath()
    const centerX = size / 2
    const centerY = size / 2
    const scale = size / 100
    
    // Shield path (simplified)
    ctx.moveTo(centerX, 5 * scale)
    ctx.lineTo(size - 15 * scale, 20 * scale)
    ctx.lineTo(size - 15 * scale, 45 * scale)
    ctx.quadraticCurveTo(size - 15 * scale, 70 * scale, centerX, size - 5 * scale)
    ctx.quadraticCurveTo(15 * scale, 70 * scale, 15 * scale, 45 * scale)
    ctx.lineTo(15 * scale, 20 * scale)
    ctx.closePath()
    
    ctx.fillStyle = 'white'
    ctx.fill()
    
    // Draw checkmark
    ctx.beginPath()
    ctx.lineWidth = 5 * scale
    ctx.strokeStyle = '#6366f1'
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.moveTo(35 * scale, 50 * scale)
    ctx.lineTo(45 * scale, 60 * scale)
    ctx.lineTo(65 * scale, 40 * scale)
    ctx.stroke()
    
    // Save PNG
    const buffer = canvas.toBuffer('image/png')
    const outputPath = path.join(outputDir, `icon-${size}.png`)
    fs.writeFileSync(outputPath, buffer)
    console.log(`✓ Generated icon-${size}.png`)
  }
  
  console.log('\nAll icons generated successfully!')
}

generateIcons().catch(console.error)
