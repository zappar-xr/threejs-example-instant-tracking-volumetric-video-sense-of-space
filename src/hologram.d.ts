import * as THREE from 'three';
/* eslint-disable camelcase */
/* eslint-disable no-unused-vars */
type SxrHologram = {
    playHologram: (userInteraction?: boolean) => void;
    pauseHologram: () => void;
    getMesh: () => THREE.Mesh;
    updateHologram: () => void;
    setQuality: (quality: number) => void;
    setHologramTime: (time: number) => void;
    getVideoElement: () => HTMLVideoElement;
    disposeData: () => void;
    mute: () => void;
    unmute: () => void;
}

declare global {
  function createHologram(
    hologram_url: string,
    hologram_created_callback: () => void,
    progress_callback: (progress: number) => void,
    playable_callback: () => void,
    loop_mode: number,
    texture_url_override: string | undefined,
  ) : SxrHologram;
}
