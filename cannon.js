/**
 * Cannon Game System
 * 
 * Features:
 * - Animated cannon at the bottom of the screen
 * - Left-click fires bullets in straight lines
 * - Right-click fires homing rockets that track the mouse
 * - Particle effects and smooth animations
 * - Real-time stats tracking
 */

console.log('📜 cannon.js loaded successfully');

class CannonGame {
    constructor() {
        this.canvas = document.getElementById('cannonCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Game state
        this.mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        this.cannon = {
            x: 0,
            y: 0,
            width: 60,
            height: 80,
            angle: 0,
            barrelLength: 50
        };
        
        // Projectiles & Enemies
        this.bullets = [];
        this.rockets = [];
        this.particles = [];
        this.enemies = []; // Falling objects
        
        // Stats
        this.bulletsFired = 0;
        this.rocketsFired = 0;
        this.score = 0;
        
        // Timing
        this.bulletCooldown = 0;
        this.rocketCooldown = 0;
        this.enemySpawnRate = 60; // Frames between spawns
        this.enemySpawnTimer = 0;
        
        this.init();
    }
    
    init() {
        console.log('🎮 Cannon Game Initializing...');
        
        // Initialize Audio Context (must be resumed on user interaction)
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        // IMPORTANT: Size canvas FIRST before adding event listeners
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Add event listeners to BOTH window and canvas for debugging
        const handleClick = (e) => {
            // Resume audio context on first user interaction
            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }

            if (e.button === 0) { // Left mouse button
                e.preventDefault();
                this.fireBullet();
            } else if (e.button === 2) { // Right mouse button
                e.preventDefault();
                this.fireRocket();
            }
        };
        
        // Mouse tracking on window (more reliable)
        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });
        
        // Attach click handlers to WINDOW instead of canvas
        window.addEventListener('mousedown', handleClick);
        
        // Prevent context menu
        window.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            return false;
        });
        
        console.log('✅ Event listeners attached to WINDOW');
        
        // Start game loop
        this.animate();
    }
    
    /**
     * Generate synthetic sound effects
     */
    playSound(type) {
        if (!this.audioCtx) return;

        const osc = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();
        
        osc.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);
        
        if (type === 'bullet') {
            // "Pew" sound
            osc.type = 'square';
            osc.frequency.setValueAtTime(800, this.audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, this.audioCtx.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.05, this.audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.1);
            osc.start();
            osc.stop(this.audioCtx.currentTime + 0.1);
        } else if (type === 'rocket') {
            // "Whoosh" sound
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, this.audioCtx.currentTime);
            osc.frequency.linearRampToValueAtTime(50, this.audioCtx.currentTime + 0.3);
            gainNode.gain.setValueAtTime(0.05, this.audioCtx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.3);
            osc.start();
            osc.stop(this.audioCtx.currentTime + 0.3);
        } else if (type === 'explosion') {
            // Noise-like explosion
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(100, this.audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(10, this.audioCtx.currentTime + 0.2);
            gainNode.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.2);
            osc.start();
            osc.stop(this.audioCtx.currentTime + 0.2);
        }
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Position cannon at bottom center
        this.cannon.x = this.canvas.width / 2;
        this.cannon.y = this.canvas.height - 40;
    }
    
    /**
     * Fire a bullet projectile
     */
    fireBullet() {
        if (this.bulletCooldown > 0) return;
        
        // Play sound
        this.playSound('bullet');
        
        // Calculate angle to mouse
        const dx = this.mouse.x - this.cannon.x;
        const dy = this.mouse.y - this.cannon.y;
        const angle = Math.atan2(dy, dx);
        
        // Create bullet
        const speed = 15;
        const bullet = {
            x: this.cannon.x + Math.cos(angle) * this.cannon.barrelLength,
            y: this.cannon.y + Math.sin(angle) * this.cannon.barrelLength,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: 4,
            life: 1.0,
            trail: []
        };
        
        this.bullets.push(bullet);
        this.bulletsFired++;
        this.bulletCooldown = 8; // Frames
        
        // Create muzzle flash particles
        this.createMuzzleFlash(bullet.x, bullet.y, angle);
        
        // Update UI
        this.updateStats();
    }
    
    /**
     * Fire a homing rocket
     */
    fireRocket() {
        if (this.rocketCooldown > 0) return;
        
        // Play sound
        this.playSound('rocket');
        
        // Calculate angle to mouse
        const dx = this.mouse.x - this.cannon.x;
        const dy = this.mouse.y - this.cannon.y;
        const angle = Math.atan2(dy, dx);
        
        // Create rocket
        const speed = 8;
        const rocket = {
            x: this.cannon.x + Math.cos(angle) * this.cannon.barrelLength,
            y: this.cannon.y + Math.sin(angle) * this.cannon.barrelLength,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            angle: angle,
            radius: 6,
            life: 1.0,
            trail: [],
            thrustParticles: 0
        };
        
        this.rockets.push(rocket);
        this.rocketsFired++;
        this.rocketCooldown = 30; // Frames
        
        // Create launch particles
        this.createMuzzleFlash(rocket.x, rocket.y, angle, true);
        
        // Update UI
        this.updateStats();
    }
    
    /**
     * Create muzzle flash particle effect
     */
    createMuzzleFlash(x, y, angle, isRocket = false) {
        const particleCount = isRocket ? 20 : 10;
        // Cyan for bullets, Pink/Purple for rockets
        const color = isRocket ? { r: 255, g: 0, b: 255 } : { r: 0, g: 255, b: 255 }; 
        
        for (let i = 0; i < particleCount; i++) {
            const spreadAngle = angle + (Math.random() - 0.5) * Math.PI / 3;
            const speed = Math.random() * 5 + 2;
            
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(spreadAngle) * speed,
                vy: Math.sin(spreadAngle) * speed,
                radius: Math.random() * 3 + 1,
                life: 1.0,
                decay: 0.02 + Math.random() * 0.02,
                color: color
            });
        }
    }

    /**
     * Spawn an enemy falling object
     */
    spawnEnemy() {
        // Random horizontal position, distinct shapes
        const x = Math.random() * this.canvas.width;
        const size = Math.random() * 30 + 20; // Size between 20 and 50
        const speed = Math.random() * 2 + 1;
        
        this.enemies.push({
            x: x,
            y: -50, // Start above screen
            vy: speed,
            radius: size, // Use radius for simple collision
            rotation: 0,
            rotationSpeed: (Math.random() - 0.5) * 0.1,
            color: `hsl(${Math.random() * 60 + 0}, 80%, 60%)` // Red/Orange hues
        });
    }

    /**
     * Create explosion particles
     */
    createExplosion(x, y, color) {
        const particleCount = 15;
        this.playSound('explosion');
        
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 6 + 2;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: Math.random() * 4 + 2,
                life: 1.0,
                decay: 0.03 + Math.random() * 0.03,
                color: { r: 255, g: 200, b: 50 } // Gold/Fire colors
            });
        }
    }
    
    /**
     * Update all game objects
     */
    update() {
        // Spawn enemies
        this.enemySpawnTimer++;
        if (this.enemySpawnTimer > this.enemySpawnRate) {
            this.spawnEnemy();
            this.enemySpawnTimer = 0;
            // Gradually increase difficulty
            if (this.enemySpawnRate > 20) this.enemySpawnRate -= 0.5;
        }

        // Update cooldowns
        if (this.bulletCooldown > 0) this.bulletCooldown--;
        if (this.rocketCooldown > 0) this.rocketCooldown--;
        
        // Update cannon angle
        const dx = this.mouse.x - this.cannon.x;
        const dy = this.mouse.y - this.cannon.y;
        this.cannon.angle = Math.atan2(dy, dx);
        
        // Update enemies
        this.enemies = this.enemies.filter(enemy => {
            enemy.y += enemy.vy;
            enemy.rotation += enemy.rotationSpeed;
            return enemy.y < this.canvas.height + 100; // Remove if falls off screen
        });

        // Update bullets & check collisions
        this.bullets = this.bullets.filter(bullet => {
            // Store trail
            bullet.trail.push({ x: bullet.x, y: bullet.y });
            if (bullet.trail.length > 10) bullet.trail.shift();
            
            // Update position
            bullet.x += bullet.vx;
            bullet.y += bullet.vy;
            
            // Fade out
            bullet.life -= 0.005;
            
            // Check collision with enemies (simple circle collision)
            let crashed = false;
            for (let i = this.enemies.length - 1; i >= 0; i--) {
                const enemy = this.enemies[i];
                const dx = bullet.x - enemy.x;
                const dy = bullet.y - enemy.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                if (dist < enemy.radius + bullet.radius) {
                    // Hit!
                    this.createExplosion(enemy.x, enemy.y);
                    this.enemies.splice(i, 1); // Remove enemy
                    crashed = true;
                    this.score += 10;
                    this.updateStats();
                    break; 
                }
            }
            if (crashed) return false;

            // Remove if off-screen or faded
            return bullet.life > 0 && 
                   bullet.x > -50 && bullet.x < this.canvas.width + 50 &&
                   bullet.y > -50 && bullet.y < this.canvas.height + 50;
        });
        
        // Update rockets with homing behavior
        this.rockets = this.rockets.filter(rocket => {
            // Store trail
            rocket.trail.push({ x: rocket.x, y: rocket.y });
            if (rocket.trail.length > 15) rocket.trail.shift();
            
            // Homing behavior - track mouse
            let targetParams = { x: this.mouse.x, y: this.mouse.y };
            // Optional: home in on nearest enemy? For now, keep mouse tracking as requested

            const dx = targetParams.x - rocket.x;
            const dy = targetParams.y - rocket.y;
            const targetAngle = Math.atan2(dy, dx);
            
            // Smoothly rotate towards target
            let angleDiff = targetAngle - rocket.angle;
            // Normalize angle difference to [-PI, PI]
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            
            rocket.angle += angleDiff * 0.05; // Turning speed
            
            // Update velocity based on angle
            const speed = Math.sqrt(rocket.vx * rocket.vx + rocket.vy * rocket.vy);
            rocket.vx = Math.cos(rocket.angle) * speed;
            rocket.vy = Math.sin(rocket.angle) * speed;
            
            // Update position
            rocket.x += rocket.vx;
            rocket.y += rocket.vy;
            
            // Create thrust particles
            rocket.thrustParticles++;
            if (rocket.thrustParticles % 2 === 0) {
                const exhaustAngle = rocket.angle + Math.PI + (Math.random() - 0.5) * 0.3;
                this.particles.push({
                    x: rocket.x - Math.cos(rocket.angle) * 10,
                    y: rocket.y - Math.sin(rocket.angle) * 10,
                    vx: Math.cos(exhaustAngle) * 3,
                    vy: Math.sin(exhaustAngle) * 3,
                    radius: Math.random() * 2 + 1,
                    life: 1.0,
                    decay: 0.05,
                    color: { r: 255, g: 0, b: 255 } // Magenta exhaust
                });
            }
            
            // Fade out
            rocket.life -= 0.003;
            
             // Check collision with enemies
             let crashed = false;
             for (let i = this.enemies.length - 1; i >= 0; i--) {
                 const enemy = this.enemies[i];
                 const dx = rocket.x - enemy.x;
                 const dy = rocket.y - enemy.y;
                 const dist = Math.sqrt(dx*dx + dy*dy);
                 
                 if (dist < enemy.radius + rocket.radius) {
                     // Hit!
                     this.createExplosion(enemy.x, enemy.y);
                     this.enemies.splice(i, 1); // Remove enemy
                     crashed = true;
                     this.score += 25; // More points for rocket usage
                     this.updateStats();
                     break; 
                 }
             }
             if (crashed) return false;

            // Remove if off-screen or faded
            return rocket.life > 0 && 
                   rocket.x > -100 && rocket.x < this.canvas.width + 100 &&
                   rocket.y > -100 && rocket.y < this.canvas.height + 100;
        });
        
        // Update particles
        this.particles = this.particles.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vx *= 0.98; // Drag
            particle.vy *= 0.98;
            particle.life -= particle.decay;
            
            return particle.life > 0;
        });
    }
    
    /**
     * Render all game objects
     */
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw enemies (falling rocks)
        this.enemies.forEach(enemy => {
            this.ctx.save();
            this.ctx.translate(enemy.x, enemy.y);
            this.ctx.rotate(enemy.rotation);
            this.ctx.fillStyle = enemy.color;
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 2;
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = enemy.color;
            
            // Draw a rough asteroid shape
            this.ctx.beginPath();
            const segments = 6;
            for(let i=0; i<segments; i++) {
                const theta = (i / segments) * Math.PI * 2;
                const r = enemy.radius * (0.8 + Math.random() * 0.4); // This purely random wobble might flicker, better to pre-generate shape, but for simplicity:
                // Actually, let's just draw a square/circle for stability in this loop
                // Or better, just a box for now.
            }
            // Simple Polygon
            this.ctx.fillRect(-enemy.radius/2, -enemy.radius/2, enemy.radius, enemy.radius);
            this.ctx.strokeRect(-enemy.radius/2, -enemy.radius/2, enemy.radius, enemy.radius);
            
            this.ctx.restore();
        });

        // Draw particles
        this.particles.forEach(particle => {
            this.ctx.save();
            this.ctx.globalAlpha = particle.life;
            this.ctx.fillStyle = `rgb(${particle.color.r}, ${particle.color.g}, ${particle.color.b})`;
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, 0.8)`;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });
        
        // Draw bullet trails and bullets
        this.bullets.forEach(bullet => {
            // Trail
            if (bullet.trail.length > 1) {
                this.ctx.save();
                this.ctx.strokeStyle = `rgba(0, 255, 255, ${bullet.life * 0.5})`; // Cyan trail
                this.ctx.lineWidth = 2;
                this.ctx.lineCap = 'round';
                this.ctx.shadowBlur = 10;
                this.ctx.shadowColor = 'rgba(0, 255, 255, 0.5)';
                this.ctx.beginPath();
                this.ctx.moveTo(bullet.trail[0].x, bullet.trail[0].y);
                for (let i = 1; i < bullet.trail.length; i++) {
                    this.ctx.lineTo(bullet.trail[i].x, bullet.trail[i].y);
                }
                this.ctx.stroke();
                this.ctx.restore();
            }
            
            // Bullet
            this.ctx.save();
            this.ctx.globalAlpha = bullet.life;
            this.ctx.fillStyle = '#00ffff'; // Neon Cyan
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = 'rgba(0, 255, 255, 0.8)';
            this.ctx.beginPath();
            this.ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });
        
        // Draw rocket trails and rockets
        this.rockets.forEach(rocket => {
            // Trail
            if (rocket.trail.length > 1) {
                this.ctx.save();
                const gradient = this.ctx.createLinearGradient(
                    rocket.trail[0].x, rocket.trail[0].y,
                    rocket.x, rocket.y
                );
                gradient.addColorStop(0, `rgba(255, 0, 255, 0)`);
                gradient.addColorStop(1, `rgba(255, 0, 255, ${rocket.life * 0.6})`); // Magenta trail
                this.ctx.strokeStyle = gradient;
                this.ctx.lineWidth = 4;
                this.ctx.lineCap = 'round';
                this.ctx.shadowBlur = 15;
                this.ctx.shadowColor = 'rgba(255, 0, 255, 0.6)';
                this.ctx.beginPath();
                this.ctx.moveTo(rocket.trail[0].x, rocket.trail[0].y);
                for (let i = 1; i < rocket.trail.length; i++) {
                    this.ctx.lineTo(rocket.trail[i].x, rocket.trail[i].y);
                }
                this.ctx.stroke();
                this.ctx.restore();
            }
            
            // Rocket body
            this.ctx.save();
            this.ctx.globalAlpha = rocket.life;
            this.ctx.translate(rocket.x, rocket.y);
            this.ctx.rotate(rocket.angle);
            
            // Rocket shape
            this.ctx.fillStyle = '#ff00ff'; // Hot pink
            this.ctx.shadowBlur = 20;
            this.ctx.shadowColor = 'rgba(255, 0, 255, 0.8)';
            this.ctx.beginPath();
            this.ctx.moveTo(12, 0);
            this.ctx.lineTo(-8, -4);
            this.ctx.lineTo(-8, 4);
            this.ctx.closePath();
            this.ctx.fill();
            
            // Rocket tip
            this.ctx.fillStyle = '#00ffff'; // Cyan tip
            this.ctx.beginPath();
            this.ctx.arc(12, 0, 3, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.restore();
        });
        
        // Draw cannon
        this.drawCannon();
    }
    
    /**
     * Draw the cannon
     */
    drawCannon() {
        this.ctx.save();
        this.ctx.translate(this.cannon.x, this.cannon.y);
        this.ctx.rotate(this.cannon.angle);
        
        // Barrel
        this.ctx.fillStyle = '#546e7a';
        this.ctx.strokeStyle = '#37474f';
        this.ctx.lineWidth = 2;
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(0, -8, this.cannon.barrelLength, 16);
        this.ctx.strokeRect(0, -8, this.cannon.barrelLength, 16);
        
        // Barrel tip highlight
        this.ctx.fillStyle = '#78909c';
        this.ctx.fillRect(this.cannon.barrelLength - 5, -6, 5, 12);
        
        this.ctx.restore();
        
        // Base
        this.ctx.save();
        this.ctx.fillStyle = '#455a64';
        this.ctx.strokeStyle = '#263238';
        this.ctx.lineWidth = 3;
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        this.ctx.beginPath();
        this.ctx.arc(this.cannon.x, this.cannon.y, 25, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
        
        // Base highlight
        this.ctx.fillStyle = '#607d8b';
        this.ctx.beginPath();
        this.ctx.arc(this.cannon.x - 5, this.cannon.y - 5, 8, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
    }
    
    /**
     * Update stats display
     */
    updateStats() {
        document.getElementById('scoreDisplay').textContent = `Score: ${this.score}`;
        document.getElementById('bulletCount').textContent = `Bullets: ${this.bulletsFired}`;
        document.getElementById('rocketCount').textContent = `Rockets: ${this.rocketsFired}`;
    }
    
    /**
     * Main game loop
     */
    animate() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.animate());
    }
}

// Initialize game when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new CannonGame();
    });
} else {
    new CannonGame();
}
