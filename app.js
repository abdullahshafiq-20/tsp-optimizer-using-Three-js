import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// Initialize Scene, Camera, Renderer
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a1a);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Initialize variables for raycasting and selection
const selectedCities = [];
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Initialize arrays for nodes and edges
const nodeMeshes = [];
const edges = [];
let nodeRadius = 1;

// Materials
const edgeMaterialDotted = new THREE.LineDashedMaterial({
  color: 0x444444,
  dashSize: 1,
  gapSize: 0.5,
  opacity: 0.5,
  transparent: true
});

const edgeMaterialSolid = new THREE.LineBasicMaterial({
  color: 0x00ff88,
  linewidth: 2,
  opacity: 0.8,
  transparent: true
});

// Initialize CSS2D Renderer for labels
const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0px';
labelRenderer.domElement.style.left = '0px';
labelRenderer.domElement.style.pointerEvents = 'none';
document.body.appendChild(labelRenderer.domElement);

// Setup camera and controls
camera.position.set(0, 0, 120);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 20;
controls.maxDistance = 400;

// Update the CSS styles for labels
const style = document.createElement('style');
style.textContent = `
  .label {
    background-color: white;
    padding: 6px 10px;
    border-radius: 6px;
    color: black;
    font-size: 14px;
    font-weight: 600;
    white-space: nowrap;
    pointer-events: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(0, 0, 0, 0.1);
    user-select: none;
    text-align: center;
  }
`;
document.head.appendChild(style);

// Add lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const pointLight = new THREE.PointLight(0xffffff, 1);
pointLight.position.set(50, 50, 50);
scene.add(pointLight);

// Grid helper
const gridHelper = new THREE.GridHelper(100, 20, 0x444444, 0x222222);
gridHelper.rotation.x = Math.PI / 2;
scene.add(gridHelper);

// Create a container for all cities and edges
const graphContainer = new THREE.Group();
scene.add(graphContainer);

// Update the COLORS constant to change selected color back to red
const COLORS = {
  default: 0x4488ff,    // Blue for unselected cities
  hover: 0x88aaff,      // Light blue for hover
  selected: 0xff4444,   // Light red for selected cities
  warning: 0xff8800,    // Warning color (orange)
  glow: {
    default: 0x4488ff,  // Blue glow
    selected: 0xff4444,  // Red glow
    warning: 0xff8800   // Warning glow color
  }
};

// Add these dataset definitions
const DATASETS = {
  easy: [
    { name: 'City 1', position: new THREE.Vector3(-20, 10, 0) },
    { name: 'City 2', position: new THREE.Vector3(10, 20, 0) },
    { name: 'City 3', position: new THREE.Vector3(20, -5, 0) },
    { name: 'City 4', position: new THREE.Vector3(-15, -15, 0) },
    { name: 'City 5', position: new THREE.Vector3(25, 10, 0) },
    { name: 'City 6', position: new THREE.Vector3(-10, -10, 0) },
    { name: 'City 7', position: new THREE.Vector3(15, -20, 0) },
    { name: 'City 8', position: new THREE.Vector3(-25, -5, 0) },
    { name: 'City 9', position: new THREE.Vector3(5, 15, 0) },
    { name: 'City 10', position: new THREE.Vector3(-5, 25, 0) },
    { name: 'City 11', position: new THREE.Vector3(10, -25, 0) },
    { name: 'City 12', position: new THREE.Vector3(0, -15, 0) },
    { name: 'City 13', position: new THREE.Vector3(-10, 20, 0) },
    { name: 'City 14', position: new THREE.Vector3(15, 25, 0) },
    { name: 'City 15', position: new THREE.Vector3(-20, -25, 0) }
  ],
  medium: [], // Will be populated with 20 cities
  complex: [] // Will be populated with 30 cities
};

// Add this function to generate random city positions
function generateRandomCities(count, spread) {
  // Limit maximum cities to 30
  const actualCount = Math.min(count, 30);
  
  const cities = [];
  const usedPositions = new Set();
  const minDistance = spread * 0.15; // Increased minimum distance between cities
  
  while (cities.length < actualCount) {
    const x = (Math.random() - 0.5) * spread;
    const y = (Math.random() - 0.5) * spread;
    
    // Round to nearest 10 for better spacing
    const roundedX = Math.round(x / 10) * 10;
    const roundedY = Math.round(y / 10) * 10;
    
    const posKey = `${roundedX},${roundedY}`;
    
    // Check if position is already used or too close to existing cities
    let isTooClose = false;
    for (const city of cities) {
      const dx = roundedX - city.position.x;
      const dy = roundedY - city.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < minDistance) {
        isTooClose = true;
        break;
      }
    }
    
    if (!usedPositions.has(posKey) && !isTooClose) {
      usedPositions.add(posKey);
      cities.push({
        name: `City ${cities.length + 1}`,
        position: new THREE.Vector3(roundedX, roundedY, 0)
      });
    }
  }
  return cities;
}

// Initialize with medium and complex datasets with larger spreads
DATASETS.medium = generateRandomCities(20, 200); // Increased spread from 100 to 200
DATASETS.complex = generateRandomCities(30, 300); // Increased spread from 140 to 300

// Add function to clear existing graph
function clearGraph() {
  // Remove all edges
  edges.forEach(edge => {
    graphContainer.remove(edge.edge);
  });
  edges.length = 0;

  // Remove all nodes and their labels
  nodeMeshes.forEach(mesh => {
    // Remove all children (including labels and glow effects)
    while(mesh.children.length > 0) {
      mesh.remove(mesh.children[0]);
    }
    graphContainer.remove(mesh);
  });
  nodeMeshes.length = 0;

  // Clear selections
  selectedCities.length = 0;
  updateSelectedCount();
}

// Add this line near the top of your file after initializing arrays
let currentCities = null; // Will store the current dataset

// Update the createGraph function
function createGraph(cities) {
  clearGraph();
  currentCities = cities;
  
  // Adjust node size based on dataset size
  nodeRadius = cities.length > 15 ? 2 : 1;
  
  // Calculate the spread of the current dataset
  let maxSpread = 0;
  cities.forEach(city => {
    maxSpread = Math.max(maxSpread, 
      Math.abs(city.position.x), 
      Math.abs(city.position.y)
    );
  });
  
  // Update grid size based on the spread
  updateGrid(maxSpread * 2);
  
  // Create nodes
  cities.forEach((city, index) => {
    const nodeGeometry = new THREE.SphereGeometry(nodeRadius, 32, 32);
    const nodeMaterial = new THREE.MeshPhongMaterial({ 
      color: COLORS.default,
      specular: 0x444444,
      shininess: 30,
      transparent: true
    });
    const nodeMesh = new THREE.Mesh(nodeGeometry, nodeMaterial);
    nodeMesh.position.copy(city.position);
    nodeMesh.userData = { index, name: city.name };
    
    // Enhanced glow effect with adjusted size
    const glowGeometry = new THREE.SphereGeometry(nodeRadius * 1.2, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: COLORS.glow.default,
      transparent: true,
      opacity: 0.2,
      side: THREE.BackSide
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    nodeMesh.add(glowMesh);

    // Create label with adjusted position
    const labelDiv = document.createElement('div');
    labelDiv.className = 'label';
    labelDiv.textContent = city.name;
    const label = new CSS2DObject(labelDiv);
    label.position.set(0, nodeRadius * 2.5, 0); // Adjust label position based on new radius
    nodeMesh.add(label);

    graphContainer.add(nodeMesh);
    nodeMeshes.push(nodeMesh);
  });

  // Create edges with curved lines for better visibility
  cities.forEach((cityA, i) => {
    cities.forEach((cityB, j) => {
      if (i < j) {
        const points = [];
        const segmentCount = 50;
        const midPoint = new THREE.Vector3().addVectors(cityA.position, cityB.position).multiplyScalar(0.5);
        
        // Add slight curve to edges
        const distance = cityA.position.distanceTo(cityB.position);
        midPoint.z += distance * 0.1; // Add curve based on distance
        
        for (let k = 0; k <= segmentCount; k++) {
          const t = k / segmentCount;
          const point = new THREE.Vector3();
          
          // Quadratic bezier curve
          point.x = Math.pow(1-t, 2) * cityA.position.x + 
                    2 * (1-t) * t * midPoint.x + 
                    t * t * cityB.position.x;
          point.y = Math.pow(1-t, 2) * cityA.position.y + 
                    2 * (1-t) * t * midPoint.y + 
                    t * t * cityB.position.y;
          point.z = Math.pow(1-t, 2) * cityA.position.z + 
                    2 * (1-t) * t * midPoint.z + 
                    t * t * cityB.position.z;
          
          points.push(point);
        }
        
        const edgeGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const edge = new THREE.Line(edgeGeometry, edgeMaterialDotted);
        edge.computeLineDistances();
        graphContainer.add(edge);
        edges.push({ edge, start: i, end: j, active: false });
      }
    });
  });
}

// Update the event listener for dataset selection
document.getElementById('dataset-select').addEventListener('change', (event) => {
  const selectedDataset = event.target.value;
  const cities = DATASETS[selectedDataset];
  createGraph(cities);
  updateCameraForDataset(cities);
});

// Initial setup
createGraph(DATASETS.easy);
updateCameraForDataset(DATASETS.easy);

// Add after the scene initialization
let isDragging = false;
let previousMousePosition = {
  x: 0,
  y: 0
};

// Event handler functions
function onMouseMove(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(nodeMeshes, true);

  // Reset all nodes to default state except selected ones
  nodeMeshes.forEach(mesh => {
    if (!selectedCities.includes(mesh.userData.index)) {
      mesh.material.color.setHex(COLORS.default);
      const glowMesh = mesh.children.find(child => child instanceof THREE.Mesh);
      if (glowMesh) {
        glowMesh.material.color.setHex(COLORS.glow.default);
        glowMesh.material.opacity = 0.2;
      }
    }
  });

  // Handle hover effect
  if (intersects.length > 0) {
    let hoveredMesh = intersects[0].object;
    while (hoveredMesh.parent && !(hoveredMesh.userData && hoveredMesh.userData.hasOwnProperty('index'))) {
      hoveredMesh = hoveredMesh.parent;
    }

    if (hoveredMesh && !selectedCities.includes(hoveredMesh.userData.index)) {
      hoveredMesh.material.color.setHex(COLORS.hover);
      const glowMesh = hoveredMesh.children.find(child => child instanceof THREE.Mesh);
      if (glowMesh) {
        glowMesh.material.opacity = 0.4;
      }
    }
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
}

function onClick(event) {
  if (event.button !== 0) return; // Only process left clicks
  
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(nodeMeshes, true);

  if (intersects.length > 0) {
    // Find the parent mesh (the city sphere)
    let clickedMesh = intersects[0].object;
    while (clickedMesh.parent && !(clickedMesh.userData && clickedMesh.userData.hasOwnProperty('index'))) {
      clickedMesh = clickedMesh.parent;
    }

    if (clickedMesh && clickedMesh.userData) {
      const city = clickedMesh.userData;
      const cityIndex = selectedCities.indexOf(city.index);

      if (cityIndex === -1) {
        selectedCities.push(city.index);
        clickedMesh.material.color.setHex(COLORS.selected);
        const glowMesh = clickedMesh.children.find(child => child instanceof THREE.Mesh);
        if (glowMesh) {
          glowMesh.material.color.setHex(COLORS.glow.selected);
          glowMesh.material.opacity = 0.6;
        }
      } else {
        selectedCities.splice(cityIndex, 1);
        clickedMesh.material.color.setHex(COLORS.default);
        const glowMesh = clickedMesh.children.find(child => child instanceof THREE.Mesh);
        if (glowMesh) {
          glowMesh.material.color.setHex(COLORS.glow.default);
          glowMesh.material.opacity = 0.2;
        }
      }
      
      updateSelectedCount();
    }
  }

  // Reset all edges if less than 2 cities are selected
  if (selectedCities.length < 2) {
    edges.forEach((edge) => {
      edge.edge.material = edgeMaterialDotted;
      edge.active = false;
    });
    // Clear the path display
    document.getElementById('debug').innerText = '';
    document.getElementById('distance').innerText = '0.00';
  } else {
    computeTSP();
  }
}

function updateSelectedCount() {
  document.getElementById('selected-count').innerText = selectedCities.length;
}

// Add new mouse event handlers for dragging
function onMouseDown(event) {
  if (event.button === 2) { // Right mouse button
    isDragging = true;
    previousMousePosition = {
      x: event.clientX,
      y: event.clientY
    };
    controls.enabled = false; // Disable OrbitControls while dragging
  }
}

function onMouseUp(event) {
  if (event.button === 2) { // Right mouse button
    isDragging = false;
    controls.enabled = true; // Re-enable OrbitControls
  }
}

function onMouseDrag(event) {
  if (isDragging) {
    const deltaMove = {
      x: event.clientX - previousMousePosition.x,
      y: event.clientY - previousMousePosition.y
    };

    // Scale the movement
    const movementSpeed = 0.1;
    graphContainer.position.x += deltaMove.x * movementSpeed;
    graphContainer.position.y -= deltaMove.y * movementSpeed;

    previousMousePosition = {
      x: event.clientX,
      y: event.clientY
    };
  }
}

// Prevent context menu from appearing on right click
function onContextMenu(event) {
  event.preventDefault();
}

// Add the new event listeners
window.addEventListener('mousemove', onMouseMove);
window.addEventListener('resize', onWindowResize);
window.addEventListener('click', onClick);
window.addEventListener('mousedown', onMouseDown);
window.addEventListener('mouseup', onMouseUp);
window.addEventListener('mousemove', onMouseDrag);
window.addEventListener('contextmenu', onContextMenu);

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  
  // Enhanced pulsing effect
  const time = Date.now() * 0.001;
  
  nodeMeshes.forEach(mesh => {
    const isSelected = selectedCities.includes(mesh.userData.index);
    const glowMesh = mesh.children.find(child => child instanceof THREE.Mesh);
    
    if (glowMesh) {
      const baseScale = 1.2;
      const pulseIntensity = isSelected ? 0.2 : 0.1;
      const pulseSpeed = isSelected ? 3 : 2;
      
      const pulse = Math.sin(time * pulseSpeed) * pulseIntensity + baseScale;
      glowMesh.scale.setScalar(pulse);
      
      const baseOpacity = isSelected ? 0.6 : 0.2;
      const opacityPulse = Math.sin(time * pulseSpeed) * 0.1;
      glowMesh.material.opacity = baseOpacity + opacityPulse;
    }
    
    if (isSelected) {
      mesh.rotation.y = time * 0.5;
    }
  });

  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}

// Add this function to show warning animation
function showNoPathWarning(selectedNodes) {
  let warningCount = 0;
  const warningDuration = 3; // Duration in seconds
  const flashesPerSecond = 2;
  
  const warningInterval = setInterval(() => {
    selectedNodes.forEach(nodeIndex => {
      const nodeMesh = nodeMeshes[nodeIndex];
      const glowMesh = nodeMesh.children.find(child => child instanceof THREE.Mesh);
      
      // Toggle between warning and selected colors
      const isWarningPhase = Math.floor(warningCount * flashesPerSecond) % 2 === 0;
      
      if (isWarningPhase) {
        nodeMesh.material.color.setHex(COLORS.warning);
        if (glowMesh) {
          glowMesh.material.color.setHex(COLORS.glow.warning);
          glowMesh.material.opacity = 0.8;
        }
      } else {
        nodeMesh.material.color.setHex(COLORS.selected);
        if (glowMesh) {
          glowMesh.material.color.setHex(COLORS.glow.selected);
          glowMesh.material.opacity = 0.6;
        }
      }
    });
    
    warningCount += 1/60; // Assuming 60fps
    if (warningCount >= warningDuration) {
      clearInterval(warningInterval);
      // Reset to normal selected state
      selectedNodes.forEach(nodeIndex => {
        const nodeMesh = nodeMeshes[nodeIndex];
        const glowMesh = nodeMesh.children.find(child => child instanceof THREE.Mesh);
        nodeMesh.material.color.setHex(COLORS.selected);
        if (glowMesh) {
          glowMesh.material.color.setHex(COLORS.glow.selected);
          glowMesh.material.opacity = 0.6;
        }
      });
    }
  }, 1000/60); // 60fps
}

// Update the computeTSP function to add validation
function computeTSP() {
  if (!currentCities || selectedCities.length < 2) {
    return;
  }

  const n = selectedCities.length;
  
  // Validate selected cities
  for (const cityIndex of selectedCities) {
    if (cityIndex >= currentCities.length) {
      console.error('Invalid city index:', cityIndex);
      showNoPathWarning(selectedCities);
      document.getElementById('debug').innerHTML = `
        <span style="color: #ff8800; font-weight: 500;">
          ⚠️ Error: Invalid city selection
        </span>
      `;
      document.getElementById('distance').innerText = '---';
      return;
    }
  }

  // Reset edges
  edges.forEach((edge) => {
    edge.edge.material = edgeMaterialDotted;
    edge.active = false;
  });

  // Distance Matrix
  const distanceMatrix = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;

      const cityA = currentCities[selectedCities[i]];
      const cityB = currentCities[selectedCities[j]];
      const distance = cityA.position.distanceTo(cityB.position);
      distanceMatrix[i][j] = distance;
    }
  }

  // Solve TSP using Nearest Neighbor Algorithm
  const tspPath = solveTSP(distanceMatrix);

  if (!tspPath || tspPath.length < selectedCities.length) {
    // No valid path found
    showNoPathWarning(selectedCities);
    
    // Update UI to show error
    document.getElementById('debug').innerHTML = `
      <span style="color: #ff8800; font-weight: 500;">
        ⚠️ No valid path found between selected cities
      </span>
    `;
    document.getElementById('distance').innerText = '---';
    return;
  }

  // Highlight TSP Path
  tspPath.forEach((from, index) => {
    const to = tspPath[(index + 1) % tspPath.length]; // Next city (cycle back to start)
    const startIndex = selectedCities[from];
    const endIndex = selectedCities[to];

    const edge = edges.find(
      (e) => (e.start === startIndex && e.end === endIndex) || (e.start === endIndex && e.end === startIndex)
    );

    if (edge) {
      edge.edge.material = edgeMaterialSolid;
      edge.active = true;
    }
  });

  // Update UI with path and distance
  const debugInfo = tspPath.map((index) => currentCities[selectedCities[index]].name).join(' → ');
  document.getElementById('debug').innerText = debugInfo;
  const totalDistance = tspPath.reduce((acc, from, i) => {
    const to = tspPath[(i + 1) % tspPath.length]; // Next city (cycle back to start)
    return acc + distanceMatrix[from][to];
  }, 0);
  document.getElementById('distance').innerText = totalDistance.toFixed(2);
}

// Update the solveTSP function to handle impossible paths
function solveTSP(distanceMatrix) {
  const n = distanceMatrix.length;
  const visited = Array(n).fill(false);
  const path = [];
  let currentCity = 0;
  let attempts = 0;
  const maxAttempts = n * 2; // Prevent infinite loops

  visited[currentCity] = true;
  path.push(currentCity);

  while (path.length < n && attempts < maxAttempts) {
    let nearestNeighbor = null;
    let minDistance = Infinity;

    for (let i = 0; i < n; i++) {
      if (!visited[i] && distanceMatrix[currentCity][i] < minDistance) {
        nearestNeighbor = i;
        minDistance = distanceMatrix[currentCity][i];
      }
    }

    if (nearestNeighbor !== null) {
      visited[nearestNeighbor] = true;
      path.push(nearestNeighbor);
      currentCity = nearestNeighbor;
    }

    attempts++;
  }

  // Return null if no valid path was found
  if (path.length < n) {
    return null;
  }

  return path;
}

// Start animation
animate();

// Add cleanup function (if needed in your application)
function cleanup() {
  window.removeEventListener('mousedown', onMouseDown);
  window.removeEventListener('mouseup', onMouseUp);
  window.removeEventListener('mousemove', onMouseDrag);
  window.removeEventListener('contextmenu', onContextMenu);
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('resize', onWindowResize);
  window.removeEventListener('click', onClick);
}

// Update the label scaling function for better visibility
function updateLabelScale() {
  const distance = camera.position.distanceTo(new THREE.Vector3(0, 0, 0));
  const scale = Math.max(0.8, Math.min(1.2, 100 / distance));
  document.documentElement.style.setProperty('--scale', scale);
}

// Update the camera settings
function updateCameraForDataset(cities) {
  let maxDistance = 0;
  cities.forEach(city => {
    const distance = city.position.length();
    maxDistance = Math.max(maxDistance, distance);
  });
  
  // Adjust camera position based on dataset size
  const cameraZ = Math.max(100, maxDistance * 2.2); // Increased minimum distance and multiplier
  camera.position.set(0, 0, cameraZ);
  
  // Update controls limits
  controls.minDistance = cameraZ * 0.4;
  controls.maxDistance = cameraZ * 2.5;
}

// Add back the updateGrid function
function updateGrid(spread) {
  // Remove existing grid
  const existingGrid = scene.children.find(child => child instanceof THREE.GridHelper);
  if (existingGrid) {
    scene.remove(existingGrid);
  }

  // Calculate grid size based on spread (make it slightly larger than the spread)
  const gridSize = Math.ceil(spread * 1.2 / 10) * 10; // Round to nearest 10
  const divisions = Math.ceil(gridSize / 5); // One division every 5 units

  const gridHelper = new THREE.GridHelper(gridSize, divisions, 0x444444, 0x222222);
  gridHelper.rotation.x = Math.PI / 2;
  scene.add(gridHelper);
}
