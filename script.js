/**
 * Interactive Water Simulation
 *
 * This script creates a realistic water effect using WebGL shaders.
 * Features:
 * - Flowing water with fractal noise patterns
 * - Mouse-interactive ripples with physics-based decay
 * - Smooth color gradients and reflections
 * - Performance-optimized rendering
 */

class WaterSimulation {
  constructor() {
    this.canvas = document.getElementById("waterCanvas");
    this.gl = null;
    this.program = null;
    this.uniforms = {};
    this.startTime = Date.now();
    this.mouse = { x: 0, y: 0 };
    this.mouseInfluence = 0;
    this.targetInfluence = 0;

    this.init();
  }

  /**
   * Initialize WebGL context and setup
   */
  init() {
    // Setup canvas size
    this.resizeCanvas();
    window.addEventListener("resize", () => this.resizeCanvas());

    // Get WebGL context
    this.gl = this.canvas.getContext("webgl", {
      alpha: false,
      antialias: true,
      powerPreference: "high-performance",
    });

    if (!this.gl) {
      console.error("WebGL not supported");
      this.showFallback();
      return;
    }

    // Setup shaders and program
    this.setupShaders();

    // Start animation loop
    this.animate();
  }

  /**
   * Resize canvas to match window size
   */
  resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2); // Limit DPR for performance
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;

    if (this.gl) {
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  /**
   * Compile shader from source
   */
  compileShader(source, type) {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error(
        "Shader compilation error:",
        this.gl.getShaderInfoLog(shader),
      );
      this.gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  /**
   * Setup WebGL shaders and program
   */
  setupShaders() {
    // Get shader sources from script tags
    const vertexSource = document.getElementById("vertexShader").textContent;
    const fragmentSource =
      document.getElementById("fragmentShader").textContent;

    // Compile shaders
    const vertexShader = this.compileShader(
      vertexSource,
      this.gl.VERTEX_SHADER,
    );
    const fragmentShader = this.compileShader(
      fragmentSource,
      this.gl.FRAGMENT_SHADER,
    );

    if (!vertexShader || !fragmentShader) {
      this.showFallback();
      return;
    }

    // Create and link program
    this.program = this.gl.createProgram();
    this.gl.attachShader(this.program, vertexShader);
    this.gl.attachShader(this.program, fragmentShader);
    this.gl.linkProgram(this.program);

    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
      console.error(
        "Program linking error:",
        this.gl.getProgramInfoLog(this.program),
      );
      this.showFallback();
      return;
    }

    this.gl.useProgram(this.program);

    // Setup geometry (full-screen quad)
    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);

    const buffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);

    const positionLocation = this.gl.getAttribLocation(
      this.program,
      "a_position",
    );
    this.gl.enableVertexAttribArray(positionLocation);
    this.gl.vertexAttribPointer(
      positionLocation,
      2,
      this.gl.FLOAT,
      false,
      0,
      0,
    );

    // Get uniform locations
    this.uniforms = {
      time: this.gl.getUniformLocation(this.program, "u_time"),
      resolution: this.gl.getUniformLocation(this.program, "u_resolution"),
      mouse: this.gl.getUniformLocation(this.program, "u_mouse"),
      mouseInfluence: this.gl.getUniformLocation(
        this.program,
        "u_mouseInfluence",
      ),
    };
  }

  /**
   * Setup mouse/touch event listeners
   */
  setupMouseEvents() {
    const updateMouse = (x, y) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.mouse.x = x * dpr;
      this.mouse.y = (window.innerHeight - y) * dpr; // Flip Y coordinate
      this.targetInfluence = 1.0;
    };

    // Mouse events
    this.canvas.addEventListener("mousemove", (e) => {
      updateMouse(e.clientX, e.clientY);
    });

    this.canvas.addEventListener("mouseenter", () => {
      this.targetInfluence = 1.0;
    });

    this.canvas.addEventListener("mouseleave", () => {
      this.targetInfluence = 0.0;
    });

    // Touch events for mobile
    this.canvas.addEventListener(
      "touchmove",
      (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        updateMouse(touch.clientX, touch.clientY);
      },
      { passive: false },
    );

    this.canvas.addEventListener("touchstart", (e) => {
      const touch = e.touches[0];
      updateMouse(touch.clientX, touch.clientY);
    });

    this.canvas.addEventListener("touchend", () => {
      this.targetInfluence = 0.0;
    });
  }

  /**
   * Main animation loop
   */
  animate() {
    if (!this.gl || !this.program) return;

    // Calculate time
    const currentTime = (Date.now() - this.startTime) / 1000;

    // Smooth mouse influence transition
    this.mouseInfluence += (this.targetInfluence - this.mouseInfluence) * 0.1;

    // Update uniforms
    this.gl.uniform1f(this.uniforms.time, currentTime);
    this.gl.uniform2f(
      this.uniforms.resolution,
      this.canvas.width,
      this.canvas.height,
    );
    this.gl.uniform2f(this.uniforms.mouse, this.mouse.x, this.mouse.y);
    this.gl.uniform1f(this.uniforms.mouseInfluence, this.mouseInfluence);

    // Clear and draw
    this.gl.clearColor(0.0, 0.1, 0.2, 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

    // Continue animation
    requestAnimationFrame(() => this.animate());
  }

  /**
   * Show fallback for browsers without WebGL support
   */
  showFallback() {
    this.canvas.style.background =
      "linear-gradient(135deg, #0a2540 0%, #1a4d6d 50%, #2a6f8f 100%)";
    console.warn("WebGL not available, showing fallback gradient");
  }
}

/**
 * Initialize when DOM is ready
 */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    new WaterSimulation();
  });
} else {
  new WaterSimulation();
}

/**
 * Performance monitoring (optional, for debugging)
 */
if (window.location.search.includes("debug")) {
  let frameCount = 0;
  let lastTime = Date.now();

  setInterval(() => {
    const currentTime = Date.now();
    const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
    console.log(`FPS: ${fps}`);
    frameCount = 0;
    lastTime = currentTime;
  }, 1000);

  const originalAnimate = WaterSimulation.prototype.animate;
  WaterSimulation.prototype.animate = function () {
    frameCount++;
    originalAnimate.call(this);
  };
}
