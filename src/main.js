import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d';
import { gsap } from 'gsap';
// import * as Spark from '@sparkjsdev/spark'; // Temporarily disabled for dev mode

class CustomLoader {
    constructor(options = {}) {
        this.options = {
            backgroundColor: options.backgroundColor || 'rgba(0, 0, 0, 0.8)',
            primaryColor: options.primaryColor || '#00bcd4',
            text: options.text || 'Loading Gaussian Splats...',
            textColor: options.textColor || '#ffffff',
            size: options.size || '60px',
            ...options
        };
        this.element = null;
        this.progressElement = null;
    }

    show(container = document.body) {
        // Remove any existing loader
        this.hide();

        // Hide any existing Gaussian splats loaders immediately
        this.hideExistingLoaders();

        // Create main loader container
        this.element = document.createElement('div');
        this.element.className = 'custom-gaussian-loader';
        this.element.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: ${this.options.backgroundColor};
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            backdrop-filter: blur(10px);
            transition: opacity 0.3s ease;
        `;

        // Create spinner
        const spinner = document.createElement('div');
        spinner.className = 'custom-spinner';
        spinner.style.cssText = `
            width: ${this.options.size};
            height: ${this.options.size};
            border: 4px solid rgba(255, 255, 255, 0.1);
            border-top: 4px solid ${this.options.primaryColor};
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 20px;
        `;

        // Create text
        const text = document.createElement('div');
        text.className = 'custom-loader-text';
        text.textContent = this.options.text;
        text.style.cssText = `
            color: ${this.options.textColor};
            font-size: 18px;
            font-weight: 500;
            margin-bottom: 15px;
            text-align: center;
        `;

        // Create progress bar container
        const progressContainer = document.createElement('div');
        progressContainer.style.cssText = `
            width: 200px;
            height: 4px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 2px;
            overflow: hidden;
        `;

        // Create progress bar
        this.progressElement = document.createElement('div');
        this.progressElement.style.cssText = `
            height: 100%;
            width: 0%;
            background: linear-gradient(90deg, ${this.options.primaryColor}, #4fc3f7);
            border-radius: 2px;
            transition: width 0.3s ease;
        `;

        // Add CSS animations
        if (!document.getElementById('custom-loader-styles')) {
            const style = document.createElement('style');
            style.id = 'custom-loader-styles';
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .custom-gaussian-loader {
                    pointer-events: auto;
                }
            `;
            document.head.appendChild(style);
        }

        // Assemble the loader
        progressContainer.appendChild(this.progressElement);
        this.element.appendChild(spinner);
        this.element.appendChild(text);
        this.element.appendChild(progressContainer);

        // Add to container
        container.appendChild(this.element);

        return this;
    }

    updateProgress(percentage) {
        if (this.progressElement) {
            this.progressElement.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
        }
        return this;
    }

    updateText(newText) {
        const textElement = this.element?.querySelector('.custom-loader-text');
        if (textElement) {
            textElement.textContent = newText;
        }
        return this;
    }

    hide() {
        if (this.element) {
            this.element.style.opacity = '0';
            setTimeout(() => {
                if (this.element && this.element.parentNode) {
                    this.element.parentNode.removeChild(this.element);
                }
                this.element = null;
                this.progressElement = null;
            }, 300);
        }
        return this;
    }

    hideExistingLoaders() {
        // Hide all existing Gaussian splats loaders
        const existingLoaders = document.querySelectorAll(
            '.progressBarOuterContainer, .spinnerOuterContainer0, .spinnerContainerPrimary0, .spinnerContainerMin0, [class*="progressBar"], [class*="spinner"], [class*="Outer"]'
        );

        existingLoaders.forEach(loader => {
            loader.style.display = 'none';
            loader.style.visibility = 'hidden';
            loader.style.opacity = '0';
            loader.style.pointerEvents = 'none';
            loader.style.zIndex = '-9999';
        });

        // Also hide any problematic overlay divs
        const overlayDivs = document.querySelectorAll('div[style*="position: absolute"][style*="width: 100%"][style*="height: 100%"]');
        overlayDivs.forEach(div => {
            if (div.id !== 'screen' && !div.closest('#screen')) {
                const hasLoaderContent = div.innerHTML.includes('progress') ||
                                       div.innerHTML.includes('spinner') ||
                                       div.innerHTML.includes('loading');
                if (hasLoaderContent || div.querySelector('[class*="progress"], [class*="spinner"], [class*="loading"]')) {
                    div.style.display = 'none';
                    div.style.pointerEvents = 'none';
                    div.style.zIndex = '-9999';
                }
            }
        });
    }

    static createMinimal(text = 'Loading...', color = '#00bcd4') {
        return new CustomLoader({
            text,
            primaryColor: color,
            size: '40px',
            backgroundColor: 'rgba(34, 34, 34, 0.9)'
        });
    }

    static createGlassy(text = 'Processing Gaussian Splats...') {
        return new CustomLoader({
            text,
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            primaryColor: '#64b5f6',
            textColor: '#ffffff'
        });
    }
}

class GaussianSplattingViewer {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.plyLoader = null;
        this.envMap = null;
        this.gaussianViewer = null;
        this.loadedModels = [];
        this.transformControls = null;
        this.selectedModel = null;
        this.loadedPointClouds = [];
        this.modelsVisible = true;
        this.pointCloudsVisible = true;
        this.customLoader = null;
        this.isRecording = false;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.animationTimeline = null;

        this.init();
        this.setupEventListeners();
        this.hideLoading(); // Hide loading immediately
        this.loadDefaultScene();
    }

    init() {
        // Create scene
        this.scene = new THREE.Scene();

        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.001,
            10000
        );
        // Position camera at table height looking horizontally at the table
        this.camera.position.set(-2.14, 0.32, 0.91); // Near table level, slightly back
        this.camera.up.set(0.04, -0.91, -0.41); // Fix upside down orientation
        this.camera.lookAt(-0.971, 1.451, 1.147); // Look at model
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });

        // Set initial size - will be updated when container is found
        this.renderer.setSize(800, 600);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;

        // Setup lighting and environment
        this.setupLighting();

        // Add renderer to DOM - use the screen div for cgi-ads page
        let container = document.getElementById('screen');
        if (!container) {
            // Fallback: create container if screen div doesn't exist
            container = document.createElement('div');
            container.id = 'canvas-container';
            container.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; display: none;';
            document.body.appendChild(container);
            // Use full window size for fallback
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        } else {
            // Remove only placeholder text/content, but keep buttons and UI elements
            // Only clear if there's just text content (placeholder)
            const hasOnlyTextContent = container.children.length === 0 && container.textContent.trim().length > 0;
            if (hasOnlyTextContent) {
                container.innerHTML = '';
            }
            container.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #222222; border-radius: 8px;';
            // Set renderer size to match container
            this.renderer.setSize(container.clientWidth, container.clientHeight);
            this.camera.aspect = container.clientWidth / container.clientHeight;
            this.camera.updateProjectionMatrix();
        }
        // Insert renderer as first child so buttons stay on top
        container.insertBefore(this.renderer.domElement, container.firstChild);

        // Create controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 0.001; // Allow camera to get very close/inside
        this.controls.maxDistance = 100;
        this.controls.maxPolarAngle = Math.PI;
        this.controls.target.set(-0.971, 1.451, 1.147); // Look at model
        this.controls.update();

        // Create Transform Controls
        this.transformControls = new TransformControls(this.camera, this.renderer.domElement);
        this.transformControls.setMode('translate'); // Start with translate mode
        this.scene.add(this.transformControls);

        // Handle Transform Controls events
        this.transformControls.addEventListener('dragging-changed', (event) => {
            this.controls.enabled = !event.value; // Disable orbit controls when transforming
        });

        // Add lights
        this.setupLighting();

        // Initialize PLY loader
        this.plyLoader = new PLYLoader();

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());

        // Start render loop
        this.animate();
    }

    setupLighting() {
        // Load HDR environment map
        const rgbeLoader = new RGBELoader();

        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        pmremGenerator.compileEquirectangularShader();

        rgbeLoader.load('/assets/scenes/green_sanctuary_2k.hdr', (texture) => {
            const envMap = pmremGenerator.fromEquirectangular(texture).texture;
            this.envMap = envMap;
            texture.dispose(); // free memory
            pmremGenerator.dispose();
            this.scene.environment = envMap;
            //this.scene.background = texture;
            this.scene.background = new THREE.Color(0x48617d);
            //console.log('🌅 HDR environment map loaded successfully');
        }, undefined, (error) => {
            console.warn('⚠️  HDR environment map failed to load:', error);
            // Fallback to basic background
            this.scene.background = new THREE.Color(0x48617d); // Sky blue fallback
        });

        // Ambient light (reduced since we have environment lighting)
         const ambientLight = new THREE.AmbientLight(0x404040, 5);
         this.scene.add(ambientLight);

        // Main directional light (sun simulation)
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 2.0);
        this.directionalLight.position.set(-1.01, 1.38, 1.12); // Position above and in front of model
        this.directionalLight.target.position.set(-0.971, 1.451, 1.147); // Point at model
        this.scene.add(this.directionalLight.target); // Add target to scene
        this.directionalLight.castShadow = true;
        this.directionalLight.shadow.mapSize.width = 2048;
        this.directionalLight.shadow.mapSize.height = 2048;
        this.directionalLight.shadow.camera.near = 0.1;
        this.directionalLight.shadow.camera.far = 10;
        this.directionalLight.shadow.camera.left = -3;
        this.directionalLight.shadow.camera.right = 3;
        this.directionalLight.shadow.camera.top = 4;
        this.directionalLight.shadow.camera.bottom = -1;
        this.directionalLight.shadow.bias = -0.0001;
        this.scene.add(this.directionalLight);

        // Additional fill light for better model illumination
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
        fillLight.position.set(-3, 3, 0); // Fill from the side
        this.scene.add(fillLight);
    }

    async loadDefaultScene() {
        try {
            const defaultPlyUrl = '/assets/scenes/garden.ksplat';

            await this.loadPlyFile(defaultPlyUrl);
        } catch (error) {
            console.error('Error loading default PLY scene:', error);
        }
    }

    async loadPlyFile(url) {
        return new Promise(async (resolve, reject) => {
            try {

                const container = document.getElementById('screen') || document.body;
                this.customLoader = CustomLoader.createGlassy('Initializing Gaussian Splats...');
                this.customLoader.show(container);

                // Clear existing Gaussian splats viewer
                if (this.gaussianViewer) {
                    this.gaussianViewer.dispose();
                    this.gaussianViewer = null;
                }

                // Get the container for the viewer
                if (!document.getElementById('screen')) {
                    this.customLoader?.hide();
                    reject(new Error('Screen container not found'));
                    return;
                }

                // Create Gaussian Splats 3D viewer with simple working settings
                this.gaussianViewer = new GaussianSplats3D.Viewer({
                    'threeScene': this.scene,
                    'selfDrivenMode': false,
                    'renderer': this.renderer,
                    'camera': this.camera,
                    'useBuiltInControls': false,
                    'ignoreDevicePixelRatio': false,
                    'gpuAcceleratedSort': false,
                    'enableSIMDInSort': false,
                    'sharedMemoryForWorkers': false,
                    'integerBasedSort': false,
                    'halfPrecisionCovariancesOnGPU': false,
                    'dynamicScene': false,
                    'webXRMode': GaussianSplats3D.WebXRMode.None,
                    'renderMode': GaussianSplats3D.RenderMode.OnChange,
                    'sceneRevealMode': GaussianSplats3D.SceneRevealMode.Instant,
                    'antialiased': false,
                    'focalAdjustment': 1.0,
                    'logLevel': 10,
                    'sphericalHarmonicsDegree': 0,
                    'enableOptionalEffects': false,
                    'inMemoryCompressionLevel': 0,
                    'freeIntermediateSplatData': false
                });

                // Load the PLY file using the official loader method like the demo
                console.log('Starting PLY load with Gaussian Splats 3D (buffer method)...');
                this.customLoader?.updateText('Downloading PLY file...').updateProgress(10);


                this.customLoader?.updateText('Processing splat data...').updateProgress(50);

                await this.gaussianViewer.addSplatScene(url)
                    .then(() => {
                        console.log('Splat scene loaded successfully');

                        this.customLoader?.updateText('Finalizing...').updateProgress(90);

                        const screenContainer = document.getElementById('screen');
                        if (screenContainer && this.renderer.domElement.parentNode !== screenContainer) {
                            // Remove only the renderer canvas if it exists elsewhere, keep other elements
                            const existingCanvas = screenContainer.querySelector('canvas');
                            if (existingCanvas && existingCanvas !== this.renderer.domElement) {
                                existingCanvas.remove();
                            }
                            // Insert renderer as first child so buttons stay on top
                            screenContainer.insertBefore(this.renderer.domElement, screenContainer.firstChild);
                        }

                        this.animate();

                        this.customLoader?.updateProgress(100);
                        setTimeout(() => {
                            this.customLoader?.hide();
                            this.hideLoading();
                            this.moveBlockingDivOffScreen();
                        }, 1000);
                    });

                console.log('Gaussian Splatting scene loaded successfully with official library');
                resolve();

            } catch (error) {
                console.error('Error loading with Gaussian Splats 3D library:', error);
                console.log('Falling back to custom implementation...');
            }
        });
    }

    createDemoPointCloud() {
        // Create a demo point cloud representing what a Gaussian splat might look like
        const vertexCount = 50000;
        const positions = new Float32Array(vertexCount * 3);
        const colors = new Float32Array(vertexCount * 3);

        // Generate random point cloud in a rough room-like shape
        for (let i = 0; i < vertexCount; i++) {
            const i3 = i * 3;

            // Create points in a room-like distribution
            if (Math.random() < 0.3) {
                // Floor points
                positions[i3] = (Math.random() - 0.5) * 6;
                positions[i3 + 1] = -1;
                positions[i3 + 2] = (Math.random() - 0.5) * 6;
                colors[i3] = 0.8; colors[i3 + 1] = 0.7; colors[i3 + 2] = 0.6; // Floor color
            } else if (Math.random() < 0.4) {
                // Wall points
                positions[i3] = Math.random() < 0.5 ? -3 : 3;
                positions[i3 + 1] = Math.random() * 2 - 1;
                positions[i3 + 2] = (Math.random() - 0.5) * 6;
                colors[i3] = 0.9; colors[i3 + 1] = 0.9; colors[i3 + 2] = 0.8; // Wall color
            } else {
                // Object points
                positions[i3] = (Math.random() - 0.5) * 4;
                positions[i3 + 1] = Math.random() * 1.5 - 0.5;
                positions[i3 + 2] = (Math.random() - 0.5) * 4;
                colors[i3] = Math.random();
                colors[i3 + 1] = Math.random();
                colors[i3 + 2] = Math.random();
            }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.02,
            vertexColors: true,
            sizeAttenuation: true
        });

        const points = new THREE.Points(geometry, material);
        points.userData.type = 'demo-splats';
        this.scene.add(points);
        this.loadedPointClouds.push(points);

        console.log('Created demo Gaussian splat point cloud');
    }

    setupEventListeners() {
        // Only set up event listeners if the elements exist (they might not exist in the cgi-ads page)
        const plyInput = document.getElementById('ply-input');
        if (plyInput) {
            plyInput.addEventListener('change', (event) => this.handlePlyUpload(event));
        }

        const glbInput = document.getElementById('glb-input');
        if (glbInput) {
            glbInput.addEventListener('change', (event) => this.handleGlbUpload(event));
        }

        const resetCamera = document.getElementById('reset-camera');
        if (resetCamera) {
            resetCamera.addEventListener('click', () => this.resetCamera());
        }

        const toggleSplats = document.getElementById('toggle-splats');
        if (toggleSplats) {
            toggleSplats.addEventListener('click', () => this.toggleSplats());
        }

        const toggleModels = document.getElementById('toggle-models');
        if (toggleModels) {
            toggleModels.addEventListener('click', () => this.toggleModels());
        }
    }

    async handlePlyUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        console.log('Loading PLY file:', file.name);

        try {
            const url = URL.createObjectURL(file);
            await this.loadPlyFile(url);
            console.log('PLY file loaded successfully');
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error loading PLY file:', error);
        }
    }

    handleGlbUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        console.log('Loading GLB file:', file.name);

        const loader = new GLTFLoader();
        const url = URL.createObjectURL(file);

        loader.load(
            url,
            (gltf) => {
                const model = gltf.scene;

                // Enable shadows for the model
                model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                // Scale and position the model appropriately
                const box = new THREE.Box3().setFromObject(model);
                const size = box.getSize(new THREE.Vector3());
                const maxSize = Math.max(size.x, size.y, size.z);
                const scale = 2 / maxSize; // Scale to fit in a 2-unit cube
                model.scale.setScalar(scale);

                // Center the model
                const center = box.getCenter(new THREE.Vector3());
                model.position.sub(center.multiplyScalar(scale));

                this.scene.add(model);
                this.loadedModels.push(model);

                console.log('GLB model loaded successfully');
                URL.revokeObjectURL(url);
            },
            (progress) => {
                console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%');
            },
            (error) => {
                console.error('Error loading GLB file:', error);
                URL.revokeObjectURL(url);
            }
        );
    }

    resetCamera() {
        this.camera.position.set(0, 2, 5);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
    }

    togglePointClouds() {
        this.pointCloudsVisible = !this.pointCloudsVisible;
        this.loadedPointClouds.forEach(pointCloud => {
            pointCloud.visible = this.pointCloudsVisible;
        });
        console.log('Point clouds visibility:', this.pointCloudsVisible);
    }

    toggleModels() {
        this.modelsVisible = !this.modelsVisible;
        this.loadedModels.forEach(model => {
            model.visible = this.modelsVisible;
        });
        console.log('Models visibility:', this.modelsVisible);
    }

    onWindowResize() {
        const container = document.getElementById('screen') || document.getElementById('canvas-container');
        let width = window.innerWidth;
        let height = window.innerHeight;

        if (container && container.id === 'screen') {
            // Use screen div dimensions for cgi-ads page
            width = container.clientWidth;
            height = container.clientHeight;
        }

        // Update fallback Three.js components if they exist
        if (this.camera) {
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
        }

        if (this.renderer) {
            this.renderer.setSize(width, height);
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (this.gaussianViewer) {
            this.gaussianViewer.update();
            this.gaussianViewer.render();
        } else {
            // Fallback render for regular Three.js scene
            /*if (this.controls) {
                this.controls.update();
            } */
            if (this.renderer && this.scene && this.camera) {
                this.renderer.render(this.scene, this.camera);
            }
        }
    }

    hideLoading() {
        // Hide all possible loading elements immediately
        const loadingElements = [
            'loading',
            'loading-screen',
            'loadingScreen',
            '.loading',
            '.loading-screen'
        ];

        loadingElements.forEach(selector => {
            const elements = selector.startsWith('.') ?
                document.querySelectorAll(selector) :
                [document.getElementById(selector)].filter(Boolean);

            elements.forEach(element => {
                if (element) {
                    element.style.display = 'none';
                    element.style.visibility = 'hidden';
                    element.style.opacity = '0';
                    element.style.pointerEvents = 'none';
                }
            });
        });

        // Also check for any elements with high z-index that might be blocking
        const allElements = document.querySelectorAll('*');
        allElements.forEach(element => {
            const style = window.getComputedStyle(element);
            const zIndex = parseInt(style.zIndex);
            if (zIndex > 1000 && element.id !== 'screen') {
                // Check if it might be a loading overlay
                if (element.classList.contains('loading') ||
                    element.id.includes('loading') ||
                    style.position === 'fixed' && style.backgroundColor.includes('rgba')) {
                    element.style.display = 'none';
                    element.style.pointerEvents = 'none';
                }
            }
        });

        console.log('Loading elements hidden');
    }

    moveBlockingDivOffScreen() {
        // Move the last child div of body off-screen instead of removing it
        const bodyChildren = document.body.children;
        if (bodyChildren.length > 0) {
            const lastDiv = bodyChildren[bodyChildren.length - 1];
            // Check if it's a div that might be blocking interaction
            if (lastDiv.tagName === 'DIV') {
                const style = window.getComputedStyle(lastDiv);
                // If it's positioned absolutely and covers the full screen
                if ( style.position === 'absolute' ) {
                    console.log('Moving blocking div off-screen:', lastDiv);
                    lastDiv.style.top = '-10000px';
                    lastDiv.style.pointerEvents = 'none';
                    lastDiv.style.visibility = 'hidden';
                }
            }
        }

        // Also check for any other divs that might be blocking
        document.querySelectorAll('body > div').forEach(div => {
            const style = window.getComputedStyle(div);

            if (style.position === 'absolute' &&
                style.width === '100%' &&
                style.height === '100%' &&
                style.top === '0px' &&
                div.id !== 'screen' &&
                div.id !== 'cgi-ads-index' &&
                !div.className.includes('custom-gaussian-loader')) {

                // Check if it contains loader content or is empty
                const hasLoaderContent = div.innerHTML.includes('progress') ||
                                       div.innerHTML.includes('spinner') ||
                                       div.innerHTML.includes('loading') ||
                                       div.querySelector('[class*="progress"], [class*="spinner"], [class*="loading"]');

                const isEmpty = div.innerHTML.trim() === '' || div.children.length === 0;

                if (hasLoaderContent || isEmpty) {
                    console.log('Moving potential blocking div off-screen:', div);
                    div.style.top = '-10000px';
                    div.style.pointerEvents = 'none';
                    div.style.visibility = 'hidden';
                }
            }
        });

        console.log('Blocking divs moved off-screen');
    }

    startRecording() {
        if (this.isRecording) {
            console.warn('Recording already in progress');
            return;
        }

        try {
            // Get the canvas stream
            const canvas = this.renderer.domElement;
            const stream = canvas.captureStream(30); // 30 FPS

            // Setup MediaRecorder
            const options = {
                mimeType: 'video/webm;codecs=vp9',
                videoBitsPerSecond: 5000000 // 5 Mbps for good quality
            };

            // Fallback to vp8 if vp9 is not supported
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options.mimeType = 'video/webm;codecs=vp8';
                if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                    options.mimeType = 'video/webm';
                }
            }

            this.mediaRecorder = new MediaRecorder(stream, options);
            this.recordedChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                this.downloadRecording();
            };

            this.mediaRecorder.start();
            this.isRecording = true;
            console.log('🎥 Recording started');
        } catch (error) {
            console.error('Error starting recording:', error);
        }
    }

    stopRecording() {
        if (!this.isRecording || !this.mediaRecorder) {
            console.warn('No recording in progress');
            return;
        }

        this.mediaRecorder.stop();
        this.isRecording = false;
        console.log('🎥 Recording stopped');
    }

    downloadRecording() {
        if (this.recordedChunks.length === 0) {
            console.warn('No recorded data to download');
            return;
        }

        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `gaussian-splat-presentation-${timestamp}.webm`;

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();

        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);

        console.log('✅ Video downloaded:', filename);
        this.recordedChunks = [];
    }

    createPresentationAnimation() {
        // Store initial camera and controls state
        const initialCameraPos = this.camera.position.clone();
        const initialTarget = this.controls.target.clone();

        // Disable controls during animation
        this.controls.enabled = false;

        // Create GSAP timeline
        const timeline = gsap.timeline({
            onComplete: () => {
                this.controls.enabled = true;
                this.stopRecording();
            }
        });

        // Calculate the orbital plane based on camera's current "up" direction
        // This ensures we orbit perpendicular to how the camera sees "up"
        const cameraToTarget = new THREE.Vector3().subVectors(initialTarget, initialCameraPos);
        const distance = cameraToTarget.length();

        // Use camera's up vector to define the rotation axis
        const rotationAxis = this.camera.up.clone().normalize();

        // Calculate the right vector (perpendicular to both up and view direction)
        const viewDirection = cameraToTarget.clone().normalize();
        const rightVector = new THREE.Vector3().crossVectors(viewDirection, rotationAxis).normalize();

        // Recalculate up to ensure orthogonal basis
        const trueUp = new THREE.Vector3().crossVectors(rightVector, viewDirection).normalize();

        // Animation object to track progress
        const animState = {
            orbitAngle: -Math.PI / 4 // Start at -45 degrees
        };

        // Phase 1: Orbit 90 degrees around the up axis (-45deg to +45deg) (5 seconds)
        timeline.to(animState, {
            orbitAngle: Math.PI / 4, // End at +45 degrees (total 90 degree rotation)
            duration: 5,
            ease: 'power1.inOut',
            onUpdate: () => {
                // Rotate the camera-to-target vector around the rotation axis
                const offset = new THREE.Vector3().subVectors(initialCameraPos, initialTarget);
                const rotatedOffset = offset.clone().applyAxisAngle(rotationAxis, animState.orbitAngle);

                this.camera.position.copy(initialTarget).add(rotatedOffset);
                this.camera.lookAt(initialTarget);
                this.camera.updateMatrixWorld();

                if (this.gaussianViewer) {
                    this.gaussianViewer.update();
                    this.gaussianViewer.render();
                }
            }
        });

        // Calculate the final rotated position (+45 degrees)
        const finalOffset = new THREE.Vector3().subVectors(initialCameraPos, initialTarget);
        const finalRotatedOffset = finalOffset.clone().applyAxisAngle(rotationAxis, Math.PI / 4);
        const finalPosition = new THREE.Vector3().copy(initialTarget).add(finalRotatedOffset);

        // Phase 2: Zoom in to close-up (3 seconds)
        // Move 70% closer to target
        const closeUpPosition = new THREE.Vector3().copy(initialTarget).add(finalRotatedOffset.clone().multiplyScalar(0.3));

        timeline.to(this.camera.position, {
            x: closeUpPosition.x,
            y: closeUpPosition.y,
            z: closeUpPosition.z,
            duration: 3,
            ease: 'power2.inOut',
            onUpdate: () => {
                this.camera.lookAt(initialTarget);
                this.camera.updateMatrixWorld();

                if (this.gaussianViewer) {
                    this.gaussianViewer.update();
                    this.gaussianViewer.render();
                }
            }
        });

        // Phase 3: Return to initial position (2 seconds)
        timeline.to(this.camera.position, {
            x: initialCameraPos.x,
            y: initialCameraPos.y,
            z: initialCameraPos.z,
            duration: 2,
            ease: 'power2.inOut',
            onUpdate: () => {
                this.camera.lookAt(initialTarget);
                this.camera.updateMatrixWorld();

                if (this.gaussianViewer) {
                    this.gaussianViewer.update();
                    this.gaussianViewer.render();
                }
            }
        });

        this.animationTimeline = timeline;
        return timeline;
    }

    async startPresentationWithRecording() {
        if (this.isRecording) {
            console.warn('Recording already in progress');
            return;
        }

        // Start recording
        this.startRecording();

        // Small delay to ensure recording has started
        await new Promise(resolve => setTimeout(resolve, 500));

        // Start animation
        this.createPresentationAnimation();
    }

    stopPresentationAndRecording() {
        if (this.animationTimeline) {
            this.animationTimeline.kill();
            this.animationTimeline = null;
        }
        if (this.isRecording) {
            this.stopRecording();
        }
        this.controls.enabled = true;
    }

}

// Initialize and expose global functions
function initializeGaussianSplattingViewer() {
    // Initialize the viewer
    window.gsViewer = new GaussianSplattingViewer();

    // Global functions for external access
    window.GaussianSplattingViewer = GaussianSplattingViewer;
    window.CustomLoader = CustomLoader;

    // Debug function to move blocking overlays off-screen
    window.forceCleanupOverlays = function() {
        console.log('Moving blocking overlays off-screen...');

        // Move problematic full-screen divs off-screen
        document.querySelectorAll('body > div').forEach(div => {
            const style = window.getComputedStyle(div);
            if (style.position === 'absolute' &&
                style.width === '100%' &&
                style.height === '100%' &&
                style.top === '0px' &&
                div.id !== 'screen' &&
                div.id !== 'cgi-ads-index') {

                console.log('Moving blocking div off-screen:', div);
                div.style.top = '-10000px';
                div.style.pointerEvents = 'none';
                div.style.visibility = 'hidden';
            }
        });

        // Hide loader elements
        const loaderSelectors = [
            '.progressBarOuterContainer',
            '.spinnerOuterContainer0',
            '.spinnerContainerPrimary0',
            '.spinnerContainerMin0',
            '[class*="progressBar"]',
            '[class*="spinner"]'
        ];

        loaderSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(element => {
                element.style.display = 'none';
                element.style.visibility = 'hidden';
                element.style.opacity = '0';
                element.style.pointerEvents = 'none';
                element.style.zIndex = '-9999';
            });
        });

        console.log('Blocking overlays moved off-screen');
    };

    window.loadPlyFile = async function(url) {
        if (!window.gsViewer) {
            console.error('3D viewer not initialized');
            return;
        }

        try {
            await window.gsViewer.loadPlyFile(url);
            console.log('PLY file loaded successfully from URL:', url);
        } catch (error) {
            console.error('Error loading PLY file:', error);
        }
    };

    // Camera position debugging functions
    window.getCameraPosition = function() {
        if (!window.gsViewer || !window.gsViewer.camera) {
            console.error('Camera not available');
            return null;
        }
        const pos = window.gsViewer.camera.position;
        const up = window.gsViewer.camera.up;
        const lookAt = window.gsViewer.camera.lookAt;
        const target = window.gsViewer.controls ? window.gsViewer.controls.target : null;

        const result = {
            position: { x: pos.x, y: pos.y, z: pos.z },
            up: { x: up.x, y: up.y, z: up.z },
            target: target ? { x: target.x, y: target.y, z: target.z } : null
        };

        console.log('📷 Camera Position:', result.position);
        console.log('📷 Camera Up Vector:', result.up);
        console.log('📷 Camera Target:', result.target);
        console.log('📷 Copy this for code:', `camera.position.set(${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)});`);
        console.log('📷 Copy this for up:', `camera.up.set(${up.x.toFixed(2)}, ${up.y.toFixed(2)}, ${up.z.toFixed(2)});`);
        if (target) {
            console.log('📷 Copy this for target:', `controls.target.set(${target.x.toFixed(2)}, ${target.y.toFixed(2)}, ${target.z.toFixed(2)});`);
        }
        console.log('📷 LookAt:', lookAt);
        return result;
    };

    window.setCameraPosition = function(x, y, z, targetX = 0, targetY = -1, targetZ = 0) {
        if (!window.gsViewer || !window.gsViewer.camera) {
            console.error('Camera not available');
            return;
        }

        window.gsViewer.camera.position.set(x, y, z);

        if (window.gsViewer.controls) {
            window.gsViewer.controls.target.set(targetX, targetY, targetZ);
            window.gsViewer.controls.update();
        } else {
            window.gsViewer.camera.lookAt(targetX, targetY, targetZ);
        }

        console.log('📷 Camera moved to:', { position: {x, y, z}, target: {x: targetX, y: targetY, z: targetZ} });
    };

    window.logCameraOnMove = function() {
        if (!window.gsViewer || !window.gsViewer.controls) {
            console.error('Controls not available');
            return;
        }

        // Add event listener for camera changes
        window.gsViewer.controls.addEventListener('change', () => {
            const pos = window.gsViewer.camera.position;
            const target = window.gsViewer.controls.target;
            console.log('📷 Live Position:', `(${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)}) → (${target.x.toFixed(2)}, ${target.y.toFixed(2)}, ${target.z.toFixed(2)})`);
        });

        console.log('📷 Real-time camera logging enabled. Move the camera to see updates!');
    };

    // Presentation and recording functions
    window.startPresentation = function() {
        if (!window.gsViewer) {
            console.error('3D viewer not initialized');
            return;
        }
        window.gsViewer.startPresentationWithRecording();
    };

    window.stopPresentation = function() {
        if (!window.gsViewer) {
            console.error('3D viewer not initialized');
            return;
        }
        window.gsViewer.stopPresentationAndRecording();
    };

    console.log('🎥 Presentation & Recording tools loaded!');
    console.log('🎥 Available functions:');
    console.log('   - startPresentation() - Start animated camera orbit with video recording');
    console.log('   - stopPresentation() - Stop animation and recording');
    console.log('   - Video will automatically download when animation completes');

    // Keyboard shortcuts for camera and transform controls
    document.addEventListener('keydown', (event) => {
        if (event.key === 'p' || event.key === 'P') {
            window.getCameraPosition();
        }

        // Transform Controls shortcuts (only when a model is selected)
        if (window.gsViewer && window.gsViewer.selectedModel && window.gsViewer.transformControls) {
            switch (event.key.toLowerCase()) {
                case 't':
                    window.gsViewer.transformControls.setMode('translate');
                    console.log('🔧 Transform mode: TRANSLATE');
                    break;
                case 'r':
                    window.gsViewer.transformControls.setMode('rotate');
                    console.log('🔧 Transform mode: ROTATE');
                    break;
                case 's':
                    window.gsViewer.transformControls.setMode('scale');
                    console.log('🔧 Transform mode: SCALE');
                    break;
                case 'g':
                    window.getModelTransforms();
                    break;
                case 'escape':
                    window.gsViewer.transformControls.detach();
                    window.gsViewer.selectedModel = null;
                    console.log('🔧 Transform controls detached');
                    break;
            }
        }
    });

    // Method to get model transformations
    window.getModelTransforms = function() {
        if (!window.gsViewer || !window.gsViewer.selectedModel) {
            console.error('No model selected');
            return null;
        }

        const model = window.gsViewer.selectedModel;
        const pos = model.position;
        const rot = model.rotation;
        const scale = model.scale;

        const transforms = {
            position: { x: pos.x, y: pos.y, z: pos.z },
            rotation: { x: rot.x, y: rot.y, z: rot.z },
            scale: { x: scale.x, y: scale.y, z: scale.z }
        };

        console.log('🔧 Model Transformations:');
        console.log('   Position:', transforms.position);
        console.log('   Rotation (radians):', transforms.rotation);
        console.log('   Scale:', transforms.scale);

        console.log('🔧 Copy this code to apply transformations:');
        console.log(`   model.position.set(${pos.x.toFixed(3)}, ${pos.y.toFixed(3)}, ${pos.z.toFixed(3)});`);
        console.log(`   model.rotation.set(${rot.x.toFixed(3)}, ${rot.y.toFixed(3)}, ${rot.z.toFixed(3)});`);
        console.log(`   model.scale.set(${scale.x.toFixed(3)}, ${scale.y.toFixed(3)}, ${scale.z.toFixed(3)});`);

        return transforms;
    };

    console.log('🔧 Transform debugging tools loaded!');
    console.log('🔧 Available functions:');
    console.log('   - getModelTransforms() - Get current model transformations');
    console.log('   - Press "T" key for translate mode');
    console.log('   - Press "R" key for rotate mode');
    console.log('   - Press "S" key for scale mode');
    console.log('   - Press "G" key to get model transforms');
    console.log('   - Press "ESC" key to detach transform controls');

    console.log('📷 Camera debugging tools loaded!');
    console.log('📷 Available functions:');
    console.log('   - getCameraPosition() - Get current camera position and target');
    console.log('   - setCameraPosition(x, y, z, targetX, targetY, targetZ) - Set camera position');
    console.log('   - logCameraOnMove() - Enable real-time position logging');
    console.log('   - Press "P" key to quickly get camera position');


    window.loadGlbModel = async function(url) {
        if (!window.gsViewer || !window.gsViewer.scene) {
            console.error('3D viewer not initialized');
            return;
        }

        // Clear previous models before loading new one
        window.gsViewer.loadedModels.forEach(model => {
            window.gsViewer.scene.remove(model);
            // Dispose of geometry and materials to free memory
            model.traverse((child) => {
                if (child.isMesh) {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => mat.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                }
            });
        });
        window.gsViewer.loadedModels = []; // Clear the array

        // Detach transform controls if active
        if (window.gsViewer.transformControls) {
            window.gsViewer.transformControls.detach();
            window.gsViewer.selectedModel = null;
        }

        console.log('🗑️ Previous models cleared');

        const loader = new GLTFLoader();
        loader.load(
            url,
            (gltf) => {
                const model = gltf.scene;

                model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;

                        // Enhance materials for better environment lighting
                        if (child.material) {
                            // If it's an array of materials
                            if (Array.isArray(child.material)) {
                                child.material.forEach(mat => {
                                    mat.envMap = window.gsViewer.envMap;
                                    mat.envMapIntensity = 3;
                                    mat.needsUpdate = true;
                                });
                            } else {
                                child.material.envMap = window.gsViewer.envMap;
                                child.material.envMapIntensity = 1;
                                child.material.needsUpdate = true;
                            }
                        }
                    }
                });

                // Calculate bounding box and scale the model
                const box = new THREE.Box3().setFromObject(model);
                const size = box.getSize(new THREE.Vector3());
                const maxSize = Math.max(size.x, size.y, size.z);
                const scale = 0.5 / maxSize; // Scale to fit in 0.5 units
                model.scale.setScalar(scale);

                // Position the model at the camera target (where camera is looking)
                const targetPosition = window.gsViewer.controls ?
                    window.gsViewer.controls.target.clone() :
                    new THREE.Vector3(-1.05, -1.00, -0.01); // Default target position

                // Center the scaled model at the target position
                const center = box.getCenter(new THREE.Vector3());
                model.position.copy(targetPosition).sub(center.multiplyScalar(scale));
                model.position.set(-0.971, 1.451, 1.147);
                model.rotation.set(0.172, -1.319, 2.850);
                //model.scale.set(0.002, 0.002, 0.002);
                window.gsViewer.scene.add(model);
                window.gsViewer.loadedModels.push(model);

                // Attach TransformControls to the model and select it
                //window.gsViewer.transformControls.attach(model);
                //window.gsViewer.selectedModel = model;

                console.log('GLB model loaded successfully from URL:', url);
                console.log('🎯 Model selected for transformation. Use T/R/S keys to switch modes.');
            },
            (progress) => {
                console.log('Loading GLB progress:', (progress.loaded / progress.total * 100) + '%');
            },
            (error) => {
                console.error('Error loading GLB file:', error);
            }
        );
    };
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGaussianSplattingViewer);
} else {
    initializeGaussianSplattingViewer();
}

// Export for library builds
export default GaussianSplattingViewer;
export { CustomLoader };