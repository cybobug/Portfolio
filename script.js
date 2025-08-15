// ===== GLOBAL STATE & UTILITIES =====
const state = {
    theme: localStorage.getItem('theme') || 'auto',
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    currentSection: 'hero',
    cursor: { x: 0, y: 0 },
    isScrolling: false
};

const utils = {
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    throttle: (func, limit) => {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    },
    
    lerp: (start, end, factor) => start + factor * (end - start),
    
    map: (value, inMin, inMax, outMin, outMax) => {
        return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
    },
    
    clamp: (value, min, max) => Math.min(Math.max(value, min), max)
};

// ===== THEME MANAGEMENT =====
function applyTheme(theme) {
    if (theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
    } else if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
}

function toggleTheme() {
    const themes = ['auto', 'light', 'dark'];
    const currentIndex = themes.indexOf(state.theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    
    state.theme = nextTheme;
    localStorage.setItem('theme', nextTheme);
    applyTheme(nextTheme);
}

// ===== CURSOR EFFECTS =====
function initCursor() {
    if (state.reducedMotion || window.innerWidth < 768) return;
    
    const cursor = document.querySelector('.cursor');
    const cursorFollower = document.querySelector('.cursor-follower');
    
    let mouseX = 0, mouseY = 0;
    let cursorX = 0, cursorY = 0;
    let followerX = 0, followerY = 0;
    
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        state.cursor.x = mouseX;
        state.cursor.y = mouseY;
    });
    
    function animateCursor() {
        cursorX = utils.lerp(cursorX, mouseX, 0.3);
        cursorY = utils.lerp(cursorY, mouseY, 0.3);
        followerX = utils.lerp(followerX, mouseX, 0.1);
        followerY = utils.lerp(followerY, mouseY, 0.1);
        
        cursor.style.transform = `translate3d(${cursorX - 10}px, ${cursorY - 10}px, 0)`;
        cursorFollower.style.transform = `translate3d(${followerX - 20}px, ${followerY - 20}px, 0)`;
        
        requestAnimationFrame(animateCursor);
    }
    
    requestAnimationFrame(animateCursor);
    
    // Magnetic effect for interactive elements
    document.querySelectorAll('button, a, .nav-dot, .project-card').forEach(el => {
        el.addEventListener('mouseenter', () => {
            cursor.style.transform = `translate3d(${cursorX - 10}px, ${cursorY - 10}px, 0) scale(1.5)`;
        });
        
        el.addEventListener('mouseleave', () => {
            cursor.style.transform = `translate3d(${cursorX - 10}px, ${cursorY - 10}px, 0) scale(1)`;
        });
    });
}

// ===== SHADER CANVAS BACKGROUND =====
function initShaderCanvas() {
    if (state.reducedMotion) return;
    
    const canvas = document.getElementById('shader-canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) {
        console.log('WebGL not supported, falling back to CSS gradient');
        return;
    }
    
    // Hide fallback
    document.querySelector('.shader-fallback').style.display = 'none';
    
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
    
    resizeCanvas();
    window.addEventListener('resize', utils.debounce(resizeCanvas, 250));
    
    // Vertex shader
    const vertexShaderSource = `
        attribute vec2 a_position;
        varying vec2 v_uv;
        void main() {
            v_uv = a_position * 0.5 + 0.5;
            gl_Position = vec4(a_position, 0.0, 1.0);
        }
    `;
    
    // Fragment shader with noise
    const fragmentShaderSource = `
        precision mediump float;
        varying vec2 v_uv;
        uniform float u_time;
        uniform vec2 u_resolution;
        uniform vec2 u_mouse;
        
        float noise(vec2 st) {
            return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }
        
        float fbm(vec2 st) {
            float value = 0.0;
            float amplitude = 0.5;
            float frequency = 0.0;
            
            for (int i = 0; i < 4; i++) {
                value += amplitude * noise(st);
                st *= 2.0;
                amplitude *= 0.5;
            }
            return value;
        }
        
        void main() {
            vec2 st = v_uv;
            vec2 mouse = u_mouse / u_resolution;
            
            // Parallax effect based on mouse
            st += (mouse - 0.5) * 0.1;
            
            // Time-based movement
            st += u_time * 0.02;
            
            // Generate noise
            float n = fbm(st * 3.0);
            
            // Color mixing
            vec3 color1 = vec3(0.0, 1.0, 0.533); // Primary green
            vec3 color2 = vec3(0.0, 0.6, 1.0);   // Secondary blue
            vec3 color3 = vec3(0.0, 0.0, 0.0);   // Black
            
            vec3 color = mix(color3, color1, n * 0.3);
            color = mix(color, color2, smoothstep(0.3, 0.7, n) * 0.2);
            
            gl_FragColor = vec4(color, 0.7);
        }
    `;
    
    function createShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        
        return shader;
    }
    
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program link error:', gl.getProgramInfoLog(program));
        return;
    }
    
    // Create quad
    const positions = [-1, -1, 1, -1, -1, 1, 1, 1];
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    
    const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
    const timeUniformLocation = gl.getUniformLocation(program, 'u_time');
    const resolutionUniformLocation = gl.getUniformLocation(program, 'u_resolution');
    const mouseUniformLocation = gl.getUniformLocation(program, 'u_mouse');
    
    let startTime = Date.now();
    let isVisible = true;
    
    // Pause when tab is not visible
    document.addEventListener('visibilitychange', () => {
        isVisible = !document.hidden;
    });
    
    function render() {
        if (!isVisible) {
            requestAnimationFrame(render);
            return;
        }
        
        gl.useProgram(program);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.enableVertexAttribArray(positionAttributeLocation);
        gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
        
        gl.uniform1f(timeUniformLocation, (Date.now() - startTime) * 0.001);
        gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);
        gl.uniform2f(mouseUniformLocation, state.cursor.x, canvas.height - state.cursor.y);
        
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        
        requestAnimationFrame(render);
    }
    
    requestAnimationFrame(render);
}

// ===== NAVIGATION =====
function initNavigation() {
    const navDots = document.querySelectorAll('.nav-dot');
    const sections = document.querySelectorAll('.section');
    
    navDots.forEach(dot => {
        dot.addEventListener('click', () => {
            const target = dot.dataset.target;
            const section = document.getElementById(target);
            if (section) {
                section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
        
        // Keyboard support
        dot.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                dot.click();
            }
        });
    });
    
    // Update active nav dot on scroll
    const updateActiveNav = utils.throttle(() => {
        const scrollY = window.scrollY + window.innerHeight / 2;
        
        for (let i = sections.length - 1; i >= 0; i--) {
            const section = sections[i];
            if (scrollY >= section.offsetTop) {
                state.currentSection = section.id;
                navDots.forEach(dot => {
                    dot.classList.toggle('active', dot.dataset.target === section.id);
                });
                break;
            }
        }
    }, 100);
    
    window.addEventListener('scroll', updateActiveNav);
}

// ===== SCROLL ANIMATIONS =====
function initScrollAnimations() {
    if (state.reducedMotion) {
        document.querySelectorAll('.animate-in').forEach(el => {
            el.classList.add('visible');
        });
        return;
    }
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    });
    
    document.querySelectorAll('.animate-in').forEach(el => {
        observer.observe(el);
    });
}

// ===== STATS COUNTER ANIMATION =====
function animateCounters() {
    if (state.reducedMotion) return;
    
    const counters = document.querySelectorAll('[data-count]');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const counter = entry.target;
                const target = parseInt(counter.dataset.count);
                let current = 0;
                const increment = target / 60; // 60 frames
                
                const updateCounter = () => {
                    current += increment;
                    if (current < target) {
                        counter.textContent = Math.floor(current);
                        requestAnimationFrame(updateCounter);
                    } else {
                        counter.textContent = target;
                    }
                };
                
                updateCounter();
                observer.unobserve(counter);
            }
        });
    }, { threshold: 0.8 });
    
    counters.forEach(counter => observer.observe(counter));
}

// ===== SKILLS RADAR CHART =====
function initSkillsRadar() {
    const canvas = document.getElementById('radar-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 100;
    
    const skills = [
        { name: 'Pentesting', value: 0.9 },
        { name: 'Web Security', value: 0.85 },
        { name: 'Cryptography', value: 0.75 },
        { name: 'Full-Stack', value: 0.8 },
        { name: 'Python', value: 0.85 }
    ];
    
    const colors = {
        grid: 'rgba(255, 255, 255, 0.1)',
        skill: 'rgba(0, 255, 136, 0.3)',
        skillStroke: '#00ff88',
        text: '#a0a0a0'
    };
    
    function drawRadar() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw grid circles
        for (let i = 1; i <= 5; i++) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, (radius / 5) * i, 0, Math.PI * 2);
            ctx.strokeStyle = colors.grid;
            ctx.stroke();
        }
        
        // Draw grid lines
        const angleStep = (Math.PI * 2) / skills.length;
        for (let i = 0; i < skills.length; i++) {
            const angle = angleStep * i - Math.PI / 2;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(x, y);
            ctx.strokeStyle = colors.grid;
            ctx.stroke();
            
            // Draw labels
            const labelX = centerX + Math.cos(angle) * (radius + 20);
            const labelY = centerY + Math.sin(angle) * (radius + 20);
            
            ctx.fillStyle = colors.text;
            ctx.font = '12px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText(skills[i].name, labelX, labelY);
        }
        
        // Draw skill polygon
        ctx.beginPath();
        for (let i = 0; i < skills.length; i++) {
            const angle = angleStep * i - Math.PI / 2;
            const distance = skills[i].value * radius;
            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.fillStyle = colors.skill;
        ctx.fill();
        ctx.strokeStyle = colors.skillStroke;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw skill points
        for (let i = 0; i < skills.length; i++) {
            const angle = angleStep * i - Math.PI / 2;
            const distance = skills[i].value * radius;
            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance;
            
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fillStyle = colors.skillStroke;
            ctx.fill();
        }
    }
    
    // Animate radar chart when in view
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                drawRadar();
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    
    observer.observe(canvas);
}

// ===== PROJECT FILTERING =====
function initProjectFiltering() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const projectCards = document.querySelectorAll('.project-card');
    
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.dataset.filter;
            
            // Update active button
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Filter projects
            projectCards.forEach((card, index) => {
                const categories = card.dataset.category.split(' ');
                const shouldShow = filter === 'all' || categories.includes(filter);
                
                card.style.transform = shouldShow ? 'scale(1)' : 'scale(0.8)';
                card.style.opacity = shouldShow ? '1' : '0.3';
                card.style.pointerEvents = shouldShow ? 'auto' : 'none';
                
                if (!state.reducedMotion) {
                    card.style.transitionDelay = shouldShow ? `${index * 0.1}s` : '0s';
                }
            });
        });
    });
}

// ===== 3D CARD EFFECTS =====
function init3DCards() {
    if (state.reducedMotion) return;
    
    const cards = document.querySelectorAll('.project-card, .timeline-content');
    
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = (y - centerY) / centerY * -10;
            const rotateY = (x - centerX) / centerX * 10;
            
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(20px)`;
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
        });
    });
}

// ===== TIMELINE MODAL =====
function initTimelineModal() {
    const timelineItems = document.querySelectorAll('.timeline-content');
    
    const timelineData = {
        'IBM (Edunet Foundation)': {
            title: 'Cybersecurity Intern at IBM (Edunet Foundation)',
            content: `
                <h4>Key Responsibilities:</h4>
                <ul>
                    <li>Completed IBM-led training in penetration testing & vulnerability assessment</li>
                    <li>Developed Python-based steganography tool with AES encryption</li>
                    <li>Integrated advanced cryptographic methods for data protection</li>
                    <li>Implemented threat-mitigation logic and security protocols</li>
                </ul>
                <h4>Impact:</h4>
                <ul>
                    <li>Improved data confidentiality by approximately 40%</li>
                    <li>Enhanced understanding of enterprise cybersecurity practices</li>
                    <li>Gained hands-on experience with IBM Security tools</li>
                </ul>
            `
        },
        'Techlanz': {
            title: 'Web Security & Development Intern at Techlanz',
            content: `
                <h4>Key Responsibilities:</h4>
                <ul>
                    <li>Implemented comprehensive WordPress security hardening</li>
                    <li>Configured API restrictions and firewall rules</li>
                    <li>Contributed to full-stack development projects</li>
                    <li>Conducted QA testing using Nmap, WPScan, and Burp Suite</li>
                </ul>
                <h4>Impact:</h4>
                <ul>
                    <li>Prevented ~95% of enumeration attacks on WordPress sites</li>
                    <li>Improved application performance by ~30%</li>
                    <li>Strengthened overall security posture for client websites</li>
                </ul>
                <h4>Technologies Used:</h4>
                <p>HTML, CSS, Bootstrap, Node.js, WordPress, Nmap, WPScan, Burp Suite</p>
            `
        }
    };
    
    timelineItems.forEach(item => {
        item.addEventListener('click', () => {
            const company = item.querySelector('.timeline-company').textContent;
            const data = timelineData[company];
            
            if (data) {
                document.getElementById('modal-title').textContent = data.title;
                document.getElementById('modal-body').innerHTML = data.content;
                document.getElementById('timeline-modal').classList.add('active');
            }
        });
        
        // Keyboard support
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                item.click();
            }
        });
    });
}

// ===== MODAL FUNCTIONS =====
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
        });
        
        if (document.getElementById('source-overlay').classList.contains('active')) {
            closeSource();
        }
    }
});

// ===== VULNERABILITY SCANNER DEMO =====
function runVulnScan() {
    const output = document.getElementById('vuln-output');
    const results = document.getElementById('vuln-results');
    
    results.style.display = 'block';
    output.innerHTML = '';
    
    const findings = [
        'Starting vulnerability scan...',
        'Target: example.com',
        '> Checking SSL/TLS configuration...',
        '✓ SSL certificate valid (A+ rating)',
        '> Scanning open ports...',
        '✓ Only necessary ports open (80, 443)',
        '> Testing for common vulnerabilities...',
        '✓ No SQL injection vectors found',
        '✓ XSS protection enabled',
        '✓ CSRF tokens implemented',
        '> Checking security headers...',
        '⚠ Missing HSTS header',
        '⚠ Content Security Policy could be stricter',
        '> Scan complete.',
        '',
        'SUMMARY:',
        '• Critical: 0',
        '• High: 0', 
        '• Medium: 2',
        '• Low: 0',
        '',
        'Overall Security Score: B+'
    ];
    
    let i = 0;
    const typeInterval = setInterval(() => {
        if (i < findings.length) {
            const line = document.createElement('div');
            line.textContent = findings[i];
            
            if (findings[i].startsWith('✓')) {
                line.style.color = '#2ed573';
            } else if (findings[i].startsWith('⚠')) {
                line.style.color = '#ffd93d';
            } else if (findings[i].startsWith('•')) {
                line.style.color = '#0099ff';
            }
            
            output.appendChild(line);
            output.scrollTop = output.scrollHeight;
            i++;
        } else {
            clearInterval(typeInterval);
        }
    }, 200);
}

// ===== AES CIPHER TOOL =====
async function encryptText() {
    const input = document.getElementById('cipher-input').value;
    const password = document.getElementById('cipher-key').value;
    const result = document.getElementById('cipher-result');
    
    if (!input || !password) {
        result.textContent = 'Please enter both text and password';
        return;
    }
    
    try {
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        
        // Create key from password
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            'PBKDF2',
            false,
            ['deriveKey']
        );
        
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const key = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt']
        );
        
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encoded = encoder.encode(input);
        
        const ciphertext = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            encoded
        );
        
        // Combine salt, iv, and ciphertext
        const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
        combined.set(salt);
        combined.set(iv, salt.length);
        combined.set(new Uint8Array(ciphertext), salt.length + iv.length);
        
        result.textContent = btoa(String.fromCharCode(...combined));
    } catch (error) {
        result.textContent = 'Encryption failed: ' + error.message;
    }
}

async function decryptText() {
    const input = document.getElementById('cipher-input').value;
    const password = document.getElementById('cipher-key').value;
    const result = document.getElementById('cipher-result');
    
    if (!input || !password) {
        result.textContent = 'Please enter both encrypted text and password';
        return;
    }
    
    try {
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        
        // Decode base64
        const combined = new Uint8Array(atob(input).split('').map(c => c.charCodeAt(0)));
        
        const salt = combined.slice(0, 16);
        const iv = combined.slice(16, 28);
        const ciphertext = combined.slice(28);
        
        // Recreate key
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            'PBKDF2',
            false,
            ['deriveKey']
        );
        
        const key = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['decrypt']
        );
        
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            ciphertext
        );
        
        result.textContent = decoder.decode(decrypted);
    } catch (error) {
        result.textContent = 'Decryption failed: Invalid password or corrupted data';
    }
}

// Save input to localStorage (but never the password)
document.getElementById('cipher-input').addEventListener('input', (e) => {
    localStorage.setItem('cipher-last-input', e.target.value);
});

// Restore last input
window.addEventListener('DOMContentLoaded', () => {
    const lastInput = localStorage.getItem('cipher-last-input');
    if (lastInput) {
        document.getElementById('cipher-input').value = lastInput;
    }
});

// ===== STEGANOGRAPHY VISUALIZER =====
function handleStegoFile(event) {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        processStegoImage(files[0]);
    }
}

function handleStegoUpload(event) {
    const file = event.target.files[0];
    if (file) {
        processStegoImage(file);
    }
}

function processStegoImage(file) {
    if (!file.type.startsWith('image/')) {
        document.getElementById('stego-analysis').textContent = 'Please upload an image file';
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.getElementById('stego-canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = img.width;
            canvas.height = img.height;
            canvas.style.display = 'block';
            
            ctx.drawImage(img, 0, 0);
            
            // Simulate steganography analysis
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const pixels = imageData.data;
            
            let lsbVariance = 0;
            let pixelCount = 0;
            
            // Analyze LSB variance (simplified simulation)
            for (let i = 0; i < pixels.length; i += 4) {
                if (pixelCount % 100 === 0) { // Sample every 100th pixel
                    const r = pixels[i];
                    const g = pixels[i + 1];
                    const b = pixels[i + 2];
                    
                    lsbVariance += (r & 1) + (g & 1) + (b & 1);
                }
                pixelCount++;
            }
            
            const avgLsbVariance = lsbVariance / (pixelCount / 100);
            const suspicionLevel = avgLsbVariance > 1.5 ? 'HIGH' : avgLsbVariance > 1.2 ? 'MEDIUM' : 'LOW';
            
            // Create noise visualization
            const noiseCanvas = document.createElement('canvas');
            const noiseCtx = noiseCanvas.getContext('2d');
            noiseCanvas.width = canvas.width;
            noiseCanvas.height = canvas.height;
            
            const noiseData = noiseCtx.createImageData(canvas.width, canvas.height);
            
            for (let i = 0; i < pixels.length; i += 4) {
                const lsbSum = (pixels[i] & 1) + (pixels[i + 1] & 1) + (pixels[i + 2] & 1);
                const intensity = lsbSum * 85; // Scale to 0-255
                
                noiseData.data[i] = intensity;     // R
                noiseData.data[i + 1] = intensity; // G
                noiseData.data[i + 2] = intensity; // B
                noiseData.data[i + 3] = 255;       // A
            }
            
            noiseCtx.putImageData(noiseData, 0, 0);
            
            // Overlay noise visualization
            ctx.globalAlpha = 0.7;
            ctx.drawImage(noiseCanvas, 0, 0);
            ctx.globalAlpha = 1.0;
            
            document.getElementById('stego-analysis').innerHTML = `
                <strong>Steganography Analysis (Simulated):</strong><br>
                • Image size: ${canvas.width} × ${canvas.height}<br>
                • LSB variance: ${avgLsbVariance.toFixed(2)}<br>
                • Suspicion level: <span style="color: ${suspicionLevel === 'HIGH' ? '#ff4757' : suspicionLevel === 'MEDIUM' ? '#ffd93d' : '#2ed573'}">${suspicionLevel}</span><br>
                • Potential hidden data: ${suspicionLevel !== 'LOW' ? 'Possible' : 'Unlikely'}<br>
                <small><em>Note: This is a simplified demonstration</em></small>
            `;
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Make drop zone clickable
document.getElementById('stego-drop-zone').addEventListener('click', () => {
    document.getElementById('stego-file').click();
});

// ===== IMPACT DIALS =====
function animateImpactDials() {
    const dial1 = document.getElementById('impact-dial-1');
    const dial2 = document.getElementById('impact-dial-2');
    const value1 = document.getElementById('dial-value-1');
    const value2 = document.getElementById('dial-value-2');
    
    if (!dial1 || !dial2) return;
    
    const ctx1 = dial1.getContext('2d');
    const ctx2 = dial2.getContext('2d');
    
    const centerX = 60;
    const centerY = 60;
    const radius = 50;
    
    let progress1 = 0;
    let progress2 = 0;
    const target1 = 95; // Attack prevention
    const target2 = 30; // Performance gain
    
    function drawDial(ctx, progress, target, color) {
        ctx.clearRect(0, 0, 120, 120);
        
        // Background circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 8;
        ctx.stroke();
        
        // Progress arc
        const angle = (progress / 100) * Math.PI * 2 - Math.PI / 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, -Math.PI / 2, angle);
        ctx.strokeStyle = color;
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.stroke();
        
        // Center dot
        ctx.beginPath();
        ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
    }
    
    function animate() {
        if (progress1 < target1) {
            progress1 += target1 / 60;
            value1.textContent = Math.floor(progress1);
            drawDial(ctx1, progress1, target1, '#00ff88');
        }
        
        if (progress2 < target2) {
            progress2 += target2 / 60;
            value2.textContent = Math.floor(progress2);
            drawDial(ctx2, progress2, target2, '#0099ff');
        }
        
        if (progress1 < target1 || progress2 < target2) {
            requestAnimationFrame(animate);
        }
    }
    
    animate();
}

// ===== EMAIL DECODER =====
function revealEmail() {
    const emailText = document.getElementById('email-text');
    const emailDisplay = document.getElementById('email-display');
    const revealBtn = document.querySelector('.email-reveal');
    
    // Simple XOR decode (just for demo - not real security)
    const encoded = 'hnxvekdhqbjdke#l{ldhm|ft|lkz';
    const key = 15;
    let decoded = '';
    
    for (let i = 0; i < encoded.length; i++) {
        decoded += String.fromCharCode(encoded.charCodeAt(i) ^ key);
    }
    
    emailText.textContent = decoded;
    emailDisplay.style.display = 'flex';
    revealBtn.style.display = 'none';
}

function copyEmail() {
    const emailText = document.getElementById('email-text').textContent;
    navigator.clipboard.writeText(emailText).then(() => {
        const copyBtn = document.querySelector('.copy-btn');
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
            copyBtn.textContent = originalText;
        }, 2000);
    });
}

// ===== CONTACT FORM =====
function handleFormSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    // Check honeypot
    if (formData.get('website')) {
        alert('Bot detected!');
        return;
    }
    
    // Validate required fields
    const name = formData.get('name').trim();
    const email = formData.get('email').trim();
    const message = formData.get('message').trim();
    
    if (!name || !email || !message) {
        alert('Please fill in all required fields');
        return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('Please enter a valid email address');
        return;
    }
    
    // Simulate form submission
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;
    
    setTimeout(() => {
        alert('Thank you for your message! I\'ll get back to you soon.');
        form.reset();
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }, 2000);
}

/* ===== PRINT RESUME =====
function printResume() {
    // Hide non-essential elements
    document.querySelectorAll('.no-print').forEach(el => {
        el.style.display = 'none';
    });
    
    // Add print-specific styles
    document.body.classList.add('print-mode');
    
    // Print
    window.print();
    
    // Restore after print
    setTimeout(() => {
        document.querySelectorAll('.no-print').forEach(el => {
            el.style.display = '';
        });
        document.body.classList.remove('print-mode');
    }, 1000);
}

document.getElementById('print-resume').addEventListener('click', printResume);
*/
// ===== SOURCE CODE VIEWER =====
function showSource() {
    const overlay = document.getElementById('source-overlay');
    const content = document.getElementById('source-content');
    
    // Get the HTML source
    const htmlSource = document.documentElement.outerHTML;
    
    // Basic syntax highlighting
    const highlighted = htmlSource
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/&lt;(\w+)/g, '&lt;<span style="color: #ff6b6b">$1</span>')
        .replace(/=&quot;([^&quot;]*)&quot;/g, '=&quot;<span style="color: #ffd93d">$1</span>&quot;')
        .replace(/&lt;!--.*?--&gt;/gs, '<span style="color: #666; font-style: italic">$&</span>');
    
    content.textContent = highlighted;
    content.innerHTML = content.innerHTML; // Apply the HTML
    overlay.classList.add('active');
}

function closeSource() {
    document.getElementById('source-overlay').classList.remove('active');
}

// ===== JSON-LD VIEWER =====
function showJsonLd() {
    const jsonLdScript = document.querySelector('script[type="application/ld+json"]');
    if (jsonLdScript) {
        const jsonData = JSON.parse(jsonLdScript.textContent);
        alert('JSON-LD Structured Data:\n\n' + JSON.stringify(jsonData, null, 2));
    }
}

// ===== PERFORMANCE OPTIMIZATIONS =====
function initPerformanceOptimizations() {
    // Lazy load images when they come into view
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                imageObserver.unobserve(img);
            }
        });
    });
    
    images.forEach(img => imageObserver.observe(img));
    
    // Defer non-critical animations
    requestIdleCallback(() => {
        initScrollAnimations();
        animateCounters();
        init3DCards();
    });
    
    // Prefetch on hover
    document.addEventListener('mouseover', utils.throttle((e) => {
        const link = e.target.closest('a[href]');
        if (link && link.hostname === window.location.hostname) {
            const prefetchLink = document.createElement('link');
            prefetchLink.rel = 'prefetch';
            prefetchLink.href = link.href;
            document.head.appendChild(prefetchLink);
        }
    }, 1000));
}

// ===== ACCESSIBILITY ENHANCEMENTS =====
function initAccessibility() {
    // Skip to main content link
    const skipLink = document.createElement('a');
    skipLink.href = '#hero';
    skipLink.textContent = 'Skip to main content';
    skipLink.className = 'skip-link';
    skipLink.style.cssText = `
        position: fixed;
        top: -40px;
        left: 6px;
        background: var(--primary);
        color: var(--bg-primary);
        padding: 8px;
        z-index: 10001;
        text-decoration: none;
        border-radius: 4px;
        transition: top 0.3s;
    `;
    
    skipLink.addEventListener('focus', () => {
        skipLink.style.top = '6px';
    });
    
    skipLink.addEventListener('blur', () => {
        skipLink.style.top = '-40px';
    });
    
    document.body.insertBefore(skipLink, document.body.firstChild);
    
    // Announce page changes to screen readers
    let lastSection = '';
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.style.cssText = `
        position: absolute;
        left: -10000px;
        width: 1px;
        height: 1px;
        overflow: hidden;
    `;
    document.body.appendChild(announcer);
    
    window.addEventListener('scroll', utils.throttle(() => {
        if (state.currentSection !== lastSection) {
            announcer.textContent = `Navigated to ${state.currentSection} section`;
            lastSection = state.currentSection;
        }
    }, 500));
    
    // Focus management for modals
    document.addEventListener('keydown', (e) => {
        const activeModal = document.querySelector('.modal.active');
        if (activeModal && e.key === 'Tab') {
            const focusableElements = activeModal.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            
            if (focusableElements.length > 0) {
                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];
                
                if (e.shiftKey && document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                } else if (!e.shiftKey && document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        }
    });
}

// ===== INITIALIZATION =====
function init() {
    // Apply saved theme
    applyTheme(state.theme);
    
    // Initialize all components
    initCursor();
    initNavigation();
    initShaderCanvas();
    initSkillsRadar();
    initProjectFiltering();
    initTimelineModal();
    initPerformanceOptimizations();
    initAccessibility();
    
    // Defer heavy animations if reduced motion is not preferred
    if (!state.reducedMotion) {
        requestIdleCallback(() => {
            animateImpactDials();
        });
    }
    
    console.log('🔒 Portfolio initialized with security-first design');
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Handle visibility changes for performance
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Pause animations when tab is hidden
        document.body.style.animationPlayState = 'paused';
    } else {
        // Resume animations when tab is visible
        document.body.style.animationPlayState = 'running';
    }
});