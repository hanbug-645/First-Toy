class Candy {
    constructor(x, y, z, color) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.color = color;
        this.mesh = this.createMesh();
        this.outline = this.createOutline();
        this.mesh.add(this.outline);
        this.outline.visible = false;
    }

    createMesh() {
        const geometry = new THREE.CircleGeometry(40, 32);
        const material = new THREE.MeshBasicMaterial({
            color: this.color,
            side: THREE.DoubleSide
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(this.x, this.y, this.z);
        return mesh;
    }

    createOutline() {
        const geometry = new THREE.RingGeometry(42, 45, 32);
        const material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide
        });
        const outline = new THREE.Mesh(geometry, material);
        return outline;
    }

    setSelected(selected) {
        this.outline.visible = selected;
    }

    animateMove(targetX, targetY, duration = 200) {
        const startX = this.mesh.position.x;
        const startY = this.mesh.position.y;
        const startTime = Date.now();

        return new Promise(resolve => {
            const animate = () => {
                const currentTime = Date.now();
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Easing function for smooth animation
                const easeProgress = 1 - Math.pow(1 - progress, 3);

                this.mesh.position.x = startX + (targetX - startX) * easeProgress;
                this.mesh.position.y = startY + (targetY - startY) * easeProgress;

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    this.mesh.position.x = targetX;
                    this.mesh.position.y = targetY;
                    resolve();
                }
            };
            animate();
        });
    }
}

class CandyCrush3D {
    constructor() {
        this.container = document.getElementById('game-container');
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f0f0);

        this.setupCamera();
        this.setupRenderer();
        this.setupLights();

        this.score = 0;
        this.matches = 0;
        this.maxMatches = 15;
        this.selectedCandy = null;
        this.colors = [
            0xff0000, // Red
            0x00ff00, // Green
            0x0000ff, // Blue
            0xffff00, // Yellow
            0xff00ff, // Purple
            0x00ffff  // Cyan
        ];

        this.initGame();
        this.setupEventListeners();
        this.animate();
    }

    setupCamera() {
        const aspect = window.innerWidth / window.innerHeight;
        const viewSize = 1000;
        const left = -viewSize * aspect / 2;
        const right = viewSize * aspect / 2;
        const top = viewSize / 2;
        const bottom = -viewSize / 2;

        this.camera = new THREE.OrthographicCamera(
            left, right, top, bottom, -1000, 1000
        );
        this.camera.position.z = 1;
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            canvas: document.getElementById('candy-crush-canvas')
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 1);
        this.scene.add(directionalLight);
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize());
        this.renderer.domElement.addEventListener('click', (event) => this.onCanvasClick(event));
        document.getElementById('restart-button').addEventListener('click', () => this.restartGame());
    }

    initGame() {
        this.gridSize = 8;
        this.candies = [];
        this.createGrid();
        this.updateScoreDisplay();
        this.updateMatchesDisplay();
    }

    createGrid() {
        const aspect = window.innerWidth / window.innerHeight;
        const spacing = 100;
        const gridWidth = this.gridSize * spacing;
        const gridHeight = this.gridSize * spacing;
        const startX = -gridWidth / 2 + spacing / 2;
        const startY = -gridHeight / 2 + spacing / 2;

        for (let x = 0; x < this.gridSize; x++) {
            for (let y = 0; y < this.gridSize; y++) {
                const candy = new Candy(
                    startX + x * spacing,
                    startY + y * spacing,
                    0,
                    this.getRandomColor()
                );
                candy.position = { x, y };
                this.candies.push(candy);
                this.scene.add(candy.mesh);
            }
        }
    }

    getRandomColor() {
        return this.colors[Math.floor(Math.random() * this.colors.length)];
    }

    onCanvasClick(event) {
        if (document.getElementById('game-over').style.display === 'block') return;

        const rect = this.renderer.domElement.getBoundingClientRect();
        const mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), this.camera);

        const intersects = raycaster.intersectObjects(this.scene.children);

        if (intersects.length > 0) {
            const candy = this.candies.find(c => c.mesh === intersects[0].object);
            if (candy) {
                if (!this.selectedCandy) {
                    this.selectedCandy = candy;
                    candy.setSelected(true);
                } else if (this.selectedCandy !== candy) {
                    this.swapCandies(this.selectedCandy, candy);
                }
            }
        }
    }

    async swapCandies(candy1, candy2) {
        const pos1 = { ...candy1.position };
        const pos2 = { ...candy2.position };

        // Only allow adjacent swaps
        if (Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y) !== 1) {
            this.selectedCandy.setSelected(false);
            this.selectedCandy = null;
            return;
        }

        // Calculate target positions
        const spacing = 100;
        const gridWidth = this.gridSize * spacing;
        const startX = -gridWidth / 2 + spacing / 2;
        const startY = -gridWidth / 2 + spacing / 2;

        const targetX1 = startX + pos2.x * spacing;
        const targetY1 = startY + pos2.y * spacing;
        const targetX2 = startX + pos1.x * spacing;
        const targetY2 = startY + pos1.y * spacing;

        // Animate the swap
        await Promise.all([
            candy1.animateMove(targetX1, targetY1),
            candy2.animateMove(targetX2, targetY2)
        ]);

        // Update positions
        [candy1.position, candy2.position] = [pos2, pos1];

        // Check for matches
        const matches = this.checkForMatches();
        if (matches.length > 0) {
            this.removeMatches(matches);
            this.matches++;
            this.updateMatchesDisplay();
            this.score += matches.length * 10;
            this.updateScoreDisplay();

            if (this.matches >= this.maxMatches) {
                this.gameOver();
            }

            // Drop candies from above
            await this.dropCandies();
        } else {
            // If no matches, animate swap back
            await Promise.all([
                candy1.animateMove(targetX2, targetY2),
                candy2.animateMove(targetX1, targetY1)
            ]);
            [candy1.position, candy2.position] = [pos1, pos2];
        }

        this.selectedCandy.setSelected(false);
        this.selectedCandy = null;
    }

    checkForMatches() {
        const matches = new Set();
        const visited = new Set();

        // Check horizontal matches
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize - 2; x++) {
                const candy1 = this.candies.find(c => c.position.x === x && c.position.y === y);
                const candy2 = this.candies.find(c => c.position.x === x + 1 && c.position.y === y);
                const candy3 = this.candies.find(c => c.position.x === x + 2 && c.position.y === y);

                if (candy1 && candy2 && candy3 &&
                    candy1.color === candy2.color && candy2.color === candy3.color) {
                    matches.add(candy1);
                    matches.add(candy2);
                    matches.add(candy3);
                }
            }
        }

        // Check vertical matches
        for (let x = 0; x < this.gridSize; x++) {
            for (let y = 0; y < this.gridSize - 2; y++) {
                const candy1 = this.candies.find(c => c.position.x === x && c.position.y === y);
                const candy2 = this.candies.find(c => c.position.x === x && c.position.y === y + 1);
                const candy3 = this.candies.find(c => c.position.x === x && c.position.y === y + 2);

                if (candy1 && candy2 && candy3 &&
                    candy1.color === candy2.color && candy2.color === candy3.color) {
                    matches.add(candy1);
                    matches.add(candy2);
                    matches.add(candy3);
                }
            }
        }

        return Array.from(matches);
    }

    async dropCandies() {
        const spacing = 100;
        const gridWidth = this.gridSize * spacing;
        const startX = -gridWidth / 2 + spacing / 2;
        const startY = -gridWidth / 2 + spacing / 2;

        // Process column by column
        for (let x = 0; x < this.gridSize; x++) {
            // Find gaps and drop existing candies
            for (let y = 0; y < this.gridSize; y++) {
                const candy = this.candies.find(c => c.position.x === x && c.position.y === y);
                if (!candy) {
                    // Find the first candy above this position
                    let dropY = y + 1;
                    while (dropY < this.gridSize) {
                        const dropCandy = this.candies.find(c => c.position.x === x && c.position.y === dropY);
                        if (dropCandy) {
                            // Update position and animate
                            dropCandy.position.y = y;
                            await dropCandy.animateMove(
                                startX + x * spacing,
                                startY + y * spacing,
                                300
                            );
                            break;
                        }
                        dropY++;
                    }
                }
            }

            // Fill remaining gaps with new candies
            for (let y = 0; y < this.gridSize; y++) {
                const candy = this.candies.find(c => c.position.x === x && c.position.y === y);
                if (!candy) {
                    const newCandy = new Candy(
                        startX + x * spacing,
                        startY + y * spacing + gridWidth, // Start above the grid
                        0,
                        this.getRandomColor()
                    );
                    newCandy.position = { x, y };
                    this.candies.push(newCandy);
                    this.scene.add(newCandy.mesh);
                    await newCandy.animateMove(
                        startX + x * spacing,
                        startY + y * spacing,
                        300
                    );
                }
            }
        }

        // Check for new matches after dropping
        const newMatches = this.checkForMatches();
        if (newMatches.length > 0) {
            this.removeMatches(newMatches);
            this.score += newMatches.length * 10;
            this.updateScoreDisplay();
            await this.dropCandies();
        }
    }

    removeMatches(matches) {
        matches.forEach(candy => {
            this.scene.remove(candy.mesh);
            this.candies = this.candies.filter(c => c !== candy);
        });
    }

    gameOver() {
        const gameOverDiv = document.getElementById('game-over');
        document.getElementById('final-score').textContent = this.score;
        gameOverDiv.style.display = 'block';
        this.candies.forEach(candy => {
            candy.mesh.material.color.setHex(0xff0000);
        });
    }

    restartGame() {
        document.getElementById('game-over').style.display = 'none';
        this.scene.clear();
        this.score = 0;
        this.matches = 0;
        this.candies = [];
        this.initGame();
    }

    updateScoreDisplay() {
        document.getElementById('score').textContent = `Score: ${this.score}`;
    }

    updateMatchesDisplay() {
        document.getElementById('matches').textContent = `Matches: ${this.matches}/${this.maxMatches}`;
    }

    onWindowResize() {
        const aspect = window.innerWidth / window.innerHeight;
        const viewSize = 1000;
        
        this.camera.left = -viewSize * aspect / 2;
        this.camera.right = viewSize * aspect / 2;
        this.camera.top = viewSize / 2;
        this.camera.bottom = -viewSize / 2;
        
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize the game when the page loads
window.addEventListener('load', () => {
    new CandyCrush3D();
});
