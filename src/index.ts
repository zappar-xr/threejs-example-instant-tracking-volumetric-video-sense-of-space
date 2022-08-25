/* eslint-disable no-param-reassign */
/// Zappar for ThreeJS Examples
/// Instant Tracking Volumetric Video (Sense of Space plugin)
// In this example, we track a volumetric video using Zappar's instant world tracking
// & Sense of Space's Three.js plugin (https://docs.senseofspace.io/threejs-integration)
// Volumetric Video courtesy of Sense of Space, learn more at: https://www.senseofspace.io

import * as THREE from 'three';
import * as ZapparThree from '@zappar/zappar-threejs';
import { showUI } from '@zappar/splash';
import './index.css';

const logo = new URL('../assets/logo.png', import.meta.url).href;
const hotspotImg = new URL('../assets/hotspot.png', import.meta.url).href;

// The SDK is supported on many different browsers, but there are some that
// don't provide camera access. This function detects if the browser is supported
// For more information on support, check out the readme over at
// https://www.npmjs.com/package/@zappar/zappar-threejs
if (ZapparThree.browserIncompatible()) {
  // The browserIncompatibleUI() function shows a full-page dialog that informs the user
  // they're using an unsupported browser, and provides a button to 'copy' the current page
  // URL so they can 'paste' it into the address bar of a compatible alternative.
  ZapparThree.browserIncompatibleUI();

  // If the browser is not compatible, we can avoid setting up the rest of the page
  // so we throw an exception here.
  throw new Error('Unsupported browser');
}

/*
 * *** COMMON VARIABLES ***
*/
// Loading circle whilst we wait for Sense of Space's plug-in to finish
const loadingCircle = document.getElementById('loading-circle-ui')!;

// Placement button and variable for anchoring content
const placeButton = document.getElementById('tap-to-place')!;
let hasPlaced = false;

// Create a Zappar camera that we'll use instead of a ThreeJS camera
const camera = new ZapparThree.Camera();
camera.backgroundTexture.encoding = THREE.sRGBEncoding;

/*
 * *** SPLASH SCREEN ***
 */
showUI({
  // Hide the screen when user taps on the button.
  onClick: (e) => {
    // Request the necessary permission from the user
    ZapparThree.permissionRequestUI().then((granted: boolean) => {
      if (granted) {
        // Pass 'false' to skip fading out.
        e.destroy();

        camera.start();
        placeButton.style.display = 'block';
      } else ZapparThree.permissionDeniedUI();
    });
  },
  title: 'AR Volumetric Video',
  subtitle: 'Presented by:</br>Zappar & Sense of Space',
  buttonText: 'Tap to Start',
  // background: "",
  logo,
});

// Construct our ThreeJS renderer and scene as usual
const renderer = new THREE.WebGLRenderer({ antialias: true });
document.body.appendChild(renderer.domElement);

// As with a normal ThreeJS scene, resize the canvas if the window resizes
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
renderer.setSize(window.innerWidth, window.innerHeight);
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Set up shadows
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.physicallyCorrectLights = true;

// The Zappar component needs to know our WebGL context, so set it like this:
ZapparThree.glContextSet(renderer.getContext());

// Create a ThreeJS Scene and set its background to be the camera background texture
const scene = new THREE.Scene();
scene.background = camera.backgroundTexture;

/*
 * *** SET UP ZAPPAR TRACKER ***
*/
// Create an InstantWorldTracker and wrap it in an InstantWorldAnchorGroup for us
// to put our ThreeJS content into
const instantTracker = new ZapparThree.InstantWorldTracker();
const instantTrackerGroup = new ZapparThree.InstantWorldAnchorGroup(camera, instantTracker);
// Add our instant tracker group into the ThreeJS scene
scene.add(instantTrackerGroup);

/*
 * *** SET UP LIGHTS ***
*/
// Let's add some lighting, first a directional light above the model pointing down
const directionalLight = new THREE.DirectionalLight('white', 0.8);
directionalLight.target = instantTrackerGroup;
directionalLight.position.set(0, 5, 0);

// Set up ability for this light to produce shadows
directionalLight.castShadow = true;
directionalLight.shadow.bias = 0.001;
directionalLight.shadow.radius = 2;
directionalLight.shadow.mapSize.setScalar(1024);

// And then a little ambient light to brighten the video up a bit
const ambientLight = new THREE.AmbientLight('white', 0.2);

instantTrackerGroup.add(ambientLight, directionalLight);

/*
 * *** SENSE OF SPACE HOLOGRAM ***
*/
// Creates as hologram object and returns it.
let hologramLoaded = false;
// eslint-disable-next-line no-undef
const hologram = createHologram(
  'https://stream.senseofspace.io/demos/mov-01/hologram.sxrweb', // URL of the hologram file (.sxrweb)
  () => {
    const mesh = hologram.getMesh();
    mesh.scale.setScalar(2);
    mesh.rotation.set(0, -1.6, 0);
    mesh.traverse((node: any) => {
      if (node.isMesh) {
        node.castShadow = true;
      }
    });
    instantTrackerGroup.add(mesh);
    hologram.pauseHologram();
  }, // called when hologram is loaded to the point
  // that it can be shown, but not necessarily
  // played yet. Function with no arguments
  () => {}, // This is called as loading progresses. Function
  // with one number parameter, representing the
  // progress of loading.
  () => {
    hologram.mute();
    hologramLoaded = true;
  }, // This is called when the hologram has been loaded
  // enough that it can be played
  1, // sets the loop mode. Supported values:
  //    0 or false = don’t loop
  //    1 or true = ordinary loop
  //    2 = ping-pong or boomerang mode. Only works for short
  //        volumetric videos (300 frames or under).
  undefined, // Set this to the URL of the texture file you
  // wish to use, if you want to override the texture
  // defined in the hologram file. Can be useful if
  // for some reason the texture files cannot be
  // placed in the same directory as the sxrweb file
);

/*
 * *** SET UP PLACEMENT HOTSPOT ***
*/
// Load in a hostpot texture from our ../assets folder
const hotspotTexture = new THREE.TextureLoader().load(hotspotImg);
// Create a mesh for the texture to attach to
const hotspot = new THREE.Mesh(
  new THREE.PlaneBufferGeometry(),
  new THREE.MeshBasicMaterial({
    // Get the hotspot texture and set it as the map
    map: hotspotTexture,
    // Make sure we can see it from all angles
    side: THREE.DoubleSide,
    // Set the transparency so we can see the ring
    transparent: true,
    alphaTest: 0.5,
  }),
);
hotspot.scale.setScalar(2);
// Prevent z-fighting between the hotspot and the shadow plane
hotspot.renderOrder = 1;
// Rotate the hotspot so that it is flat on the floor
hotspot.rotateX(-0.5 * Math.PI);
instantTrackerGroup.add(hotspot);

/*
 * *** SHADOW PLANE ***
 */
const shadowPlane = new THREE.Mesh(
  new THREE.PlaneBufferGeometry(window.innerWidth, window.innerHeight),
  new THREE.ShadowMaterial(
    {
      // Make the plane semi-transparent so some of the ground is visible under the shadow
      opacity: 0.3,
      depthWrite: false,
    },
  ),
);
shadowPlane.receiveShadow = true;
// Rotate the plane to be flat on the ground
shadowPlane.rotateX(-Math.PI / 2);
instantTrackerGroup.add(shadowPlane);

/*
 * *** PLACEMENT UI FUNCTIONALITY ***
*/
// When the experience loads, we'll let the user choose a place in their room for
// the content to appear using setAnchorPoseFromCameraOffset (see below)
// The user can confirm the location by tapping on the button
placeButton.addEventListener('click', () => {
  if (hasPlaced) {
    hasPlaced = false;
    placeButton.innerText = 'Tap to place';
    hologram.pauseHologram();
    hologram.mute();
    hotspot.material.opacity = 1;
    return;
  }
  hasPlaced = true;
  placeButton.innerText = 'Tap to pick up';
  hologram.playHologram();
  hologram.unmute();
  hotspot.material.opacity = 0;
});

/*
 * *** RENDER/ANIMATE LOOP ***
*/
// Use a function to render our scene as usual
function render(): void {
  if (!hasPlaced) {
    // If the user hasn't chosen a place in their room yet, update the instant tracker
    // to be directly in front of the user
    instantTrackerGroup.setAnchorPoseFromCameraOffset(0, -1.5, -6);
  }

  // The Zappar camera must have updateFrame called every frame
  camera.updateFrame(renderer);

  // Hide loading screen once mesh has loaded.
  loadingCircle.style.display = hologramLoaded ? 'none' : 'block';

  // Sense of Space Hologram needs to update to play
  if (hologramLoaded) hologram.updateHologram();

  // Draw the ThreeJS scene in the usual way, but using the Zappar camera
  renderer.render(scene, camera);
}

// Start things off
renderer.setAnimationLoop(render);
