import Phaser from 'phaser';
import { content } from '../content';
import { CameraControl } from '../lib/cameraControl';
import { buildRoadGraph, type RoadGraph } from '../lib/roads';
import { MarkerLayer } from '../ui/markers';
import { toast } from '../ui/toast';
import { drawMap } from './drawMap';
import { WORLD_H, WORLD_W, wx, wy } from './world';

export const ZOOM_STEPS = [0.25, 0.5, 1, 1.5, 2, 3, 4];
export const START_ZOOM = 1;

export class MapScene extends Phaser.Scene {
  camControl!: CameraControl;
  graph!: RoadGraph;
  markers!: MarkerLayer;

  constructor() {
    super('Map');
  }

  get dpr(): number {
    return this.registry.get('dpr') ?? 1;
  }

  create() {
    const places = content.places;
    this.graph = buildRoadGraph(places);
    drawMap(this, places, this.graph);

    this.camControl = new CameraControl(this, {
      dpr: this.dpr,
      world: { width: WORLD_W, height: WORLD_H },
      maxZoom: 4,
      steps: ZOOM_STEPS,
    });

    const home = places.find((p) => p.id === 'kuku-home') ?? places[0];
    this.camControl.setZoomAt(START_ZOOM, this.scale.width / 2, this.scale.height / 2);
    this.camControl.centerOn(wx(home.position.x), wy(home.position.y));

    this.markers = new MarkerLayer(document.getElementById('markers')!, places, (place) => {
      if (performance.now() - this.camControl.lastGestureEnd < 250) return;
      toast(`${place.name} — walking there arrives in Phase 2`);
    });

    // Position DOM markers after the camera has rendered this frame.
    this.game.events.on(Phaser.Core.Events.POST_RENDER, this.syncOverlay, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(Phaser.Core.Events.POST_RENDER, this.syncOverlay, this);
    });
  }

  /** Apply a new canvas size (device px) after the browser window changes. */
  onResize(width: number, height: number) {
    const cam = this.cameras.main;
    const center = { x: cam.midPoint.x, y: cam.midPoint.y };
    const zoom = this.camControl.zoom;
    cam.setSize(width, height);
    this.camControl.setZoomAt(zoom, width / 2, height / 2);
    this.camControl.centerOn(center.x, center.y);
  }

  private syncOverlay() {
    const cam = this.cameras.main;
    this.markers.update(cam.worldView.x, cam.worldView.y, cam.zoom / this.dpr, this.camControl.zoom);
  }
}
