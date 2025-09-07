// Advanced 3D Particle Sphere with Shader Effects
document.addEventListener('DOMContentLoaded', function() {
    // Check if Three.js is loaded
    if (typeof THREE === 'undefined') {
        console.warn('Three.js not loaded, advanced 3D effect disabled');
        return;
    }
    
    // Create container for the 3D effect
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.top = '50%';
    container.style.right = '10%';
    container.style.transform = 'translateY(-50%)';
    container.style.zIndex = '0';
    container.style.width = '500px';
    container.style.height = '500px';
    container.style.pointerEvents = 'none'; // So it doesn't interfere with UI
    document.querySelector('#home .hero-content').appendChild(container);
    
    // Create scene
    const scene = new THREE.Scene();
    
    // Create camera
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.z = 50;
    
    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(500, 500);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    
    // Create particle geometry
    const particleCount = 8000;
    const particles = new THREE.BufferGeometry();
    const posArray = new Float32Array(particleCount * 3);
    const colorArray = new Float32Array(particleCount * 3);
    
    // Create sphere of particles
    for (let i = 0; i < particleCount; i++) {
        // Position particles in a sphere
        const radius = 15 + Math.random() * 5;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);
        
        posArray[i * 3] = x;
        posArray[i * 3 + 1] = y;
        posArray[i * 3 + 2] = z;
        
        // Color particles with gradient from yellow to orange
        const color = new THREE.Color();
        color.setHSL(0.1 - Math.random() * 0.05, 0.9, 0.5 + Math.random() * 0.3);
        colorArray[i * 3] = color.r;
        colorArray[i * 3 + 1] = color.g;
        colorArray[i * 3 + 2] = color.b;
    }
    
    particles.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
    
    // Create shader material for particles
    const particleMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            mouse: { value: new THREE.Vector2(0, 0) },
            sphereRadius: { value: 15 }
        },
        vertexShader: `
            uniform float time;
            uniform vec2 mouse;
            uniform float sphereRadius;
            attribute vec3 color;
            varying vec3 vColor;
            
            void main() {
                vColor = color;
                
                // Mouse interaction - particles move away from cursor
                vec3 pos = position;
                vec3 mousePos = vec3(mouse.x * 50.0, mouse.y * 50.0, 0.0);
                float distanceToMouse = distance(pos, mousePos);
                
                if (distanceToMouse < 20.0) {
                    vec3 direction = normalize(pos - mousePos);
                    pos += direction * (20.0 - distanceToMouse) * 0.3;
                }
                
                // Pulsing animation
                float pulse = sin(time * 2.0 + position.x * 0.1) * 0.5 + 0.5;
                pos *= 1.0 + pulse * 0.1;
                
                // Send to GPU
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = 2.0 + sin(time + position.x) * 1.0;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            
            void main() {
                // Create circular points
                vec2 coord = gl_PointCoord - vec2(0.5);
                if (length(coord) > 0.5) discard;
                
                // Add glow effect
                float intensity = 1.0 - length(coord) * 2.0;
                vec3 color = vColor * intensity;
                
                // Add bright center
                color += vec3(1.0, 0.8, 0.2) * (1.0 - length(coord) * 1.5);
                
                gl_FragColor = vec4(color, 1.0);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    
    const particleSystem = new THREE.Points(particles, particleMaterial);
    scene.add(particleSystem);
    
    // Add central core glow
    const coreGeometry = new THREE.SphereGeometry(8, 32, 32);
    const coreMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 }
        },
        vertexShader: `
            uniform float time;
            varying vec3 vNormal;
            
            void main() {
                vNormal = normalize(normalMatrix * normal);
                vec3 pos = position;
                // Pulsing effect
                pos *= 1.0 + sin(time * 3.0) * 0.05;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            varying vec3 vNormal;
            
            void main() {
                float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 4.0);
                vec3 color = mix(vec3(1.0, 0.6, 0.0), vec3(1.0, 1.0, 0.2), intensity);
                gl_FragColor = vec4(color, intensity * 0.8);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending
    });
    
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    scene.add(core);
    
    // Mouse position tracking
    let mouseX = 0;
    let mouseY = 0;
    
    document.addEventListener('mousemove', (event) => {
        // Only track mouse movement in the hero section
        const heroSection = document.getElementById('home');
        if (!heroSection) return;
        
        const rect = heroSection.getBoundingClientRect();
        if (event.clientX >= rect.left && event.clientX <= rect.right &&
            event.clientY >= rect.top && event.clientY <= rect.bottom) {
            // Normalize mouse position to -1 to 1 range
            mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        }
    });
    
    // Animation loop
    let time = 0;
    function animate() {
        requestAnimationFrame(animate);
        
        time += 0.01;
        
        // Update shader uniforms
        particleMaterial.uniforms.time.value = time;
        particleMaterial.uniforms.mouse.value.set(mouseX, mouseY);
        coreMaterial.uniforms.time.value = time;
        
        // Rotate particle system slowly
        particleSystem.rotation.y += 0.001;
        particleSystem.rotation.x += 0.0005;
        
        renderer.render(scene, camera);
    }
    
    // Handle window resize
    function onWindowResize() {
        // Keep fixed size for the effect
        renderer.setSize(500, 500);
        camera.aspect = 1;
        camera.updateProjectionMatrix();
    }
    
    window.addEventListener('resize', onWindowResize);
    
    // Start animation
    animate();
});