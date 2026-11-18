import Phaser from 'phaser';
import { content, type Place } from '../content';
import { CameraControl } from '../lib/cameraControl';
import { findRoute, routeLength, type Point } from '../lib/pathfinding';
import { buildRoadGraph, type RoadGraph } from '../lib/roads';
import { loadSave, markVisited } from '../lib/storage';
import { Walkable } from '../lib/walkable';
import { KUKU } from '../sprites/kuku';
import { CAR, FLAG, HEART, SPARKLE } from '../sprites/props';
import { makePixelTexture } from '../sprites/pixel';
import type { Joystick } from '../ui/joystick';
import { MarkerLayer } from '../ui/markers';
import { openMemory } from '../ui/memoryViewer';
import { AVATAR_HEIGHT, Avatar, SPRITE_SCALE } from './Avatar';
import { drawMap } from './drawMap';
import { WORLD_H, WORLD_W, wx, wy } from './world';

export const ZOOM_STEPS = [0.25, 0.5, 1, 1.5, 2, 3, 4];
export const START_ZOOM = 1;

/** Movement tuning (world px / second). */
const WALK_SPEED = 170;
const FREE_SPEED = 230;
/** Walks longer than this (seconds) become a car ride. */
const MAX_WALK_TIME = 3.5;
/** Car rides last between these many seconds, whatever the distance. */
const DRIVE_TIME = { min: 2.5, max: 5 };
const DRIVE_SPEED = 750;
export const ARRIVAL_RADIUS = 50;

interface Trip {
  route: Point[];
  index: number;
  speed: number;
  place: Place;
  driving: boolean;
}

export class MapScene extends Phaser.Scene {
  camControl!: CameraControl;
  graph!: RoadGraph;
  markers!: MarkerLayer;
  avatar!: Avatar;
  joystick?: Joystick;
  /** Called when a long trip starts/ends so the UI can show or hide "Skip". */
  onTripChange?: (canSkip: boolean) => void;

  private walk!: Walkable;
  private trip: Trip | null = null;
  private follow = true;
  private busy = false;
  /** Places the avatar is standing in; they can't trigger again until she leaves. */
  private lockedPlaces = new Set<string>();
  private flag!: Phaser.GameObjects.Image;
  private ring!: Phaser.GameObjects.Ellipse;
  private keys!: Record<'W' | 'A' | 'S' | 'D' | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT', Phaser.Input.Keyboard.Key>;

  constructor() {
    super('Map');
  }

  get dpr(): number {
    return this.registry.get('dpr') ?? 1;
  }

  create() {
    const places = content.places;
    this.joystick = this.registry.get('joystick');
    this.onTripChange = this.registry.get('onTripChange');
    for (const s of [KUKU, CAR, HEART, SPARKLE, FLAG]) makePixelTexture(this, s);

    this.graph = buildRoadGraph(places);
    this.walk = new Walkable(this.graph);
    drawMap(this, places, this.graph);

    this.camControl = new CameraControl(this, {
      dpr: this.dpr,
      world: { width: WORLD_W, height: WORLD_H },
      maxZoom: 4,
      steps: ZOOM_STEPS,
    });
    this.camControl.onUserMove = () => (this.follow = false);

    // Destination marker: pulsing ring + little flag
    this.ring = this.add.ellipse(0, 0, 60, 26).setStrokeStyle(4, 0xe5566f, 1).setVisible(false).setDepth(5);
    this.flag = this.add.image(0, 0, 'flag').setOrigin(0.1, 1).setScale(SPRITE_SCALE).setVisible(false).setDepth(6);
    this.tweens.add({ targets: this.ring, scale: { from: 0.7, to: 1.15 }, alpha: { from: 1, to: 0.3 }, duration: 700, yoyo: true, repeat: -1 });

    // Avatar starts at Kuku's Home, just beside the dot (inside its radius, so it doesn't trigger)
    const home = places.find((p) => p.id === 'kuku-home') ?? places[0];
    const start = this.findStandingSpot(wx(home.position.x) - 44, wy(home.position.y) + 8);
    this.avatar = new Avatar(this, start.x, start.y);
    for (const p of places) if (this.distTo(p) < ARRIVAL_RADIUS) this.lockedPlaces.add(p.id);

    this.camControl.setZoomAt(START_ZOOM, this.scale.width / 2, this.scale.height / 2);
    this.camControl.centerOn(start.x, start.y);

    this.markers = new MarkerLayer(document.getElementById('markers')!, places, (place) => {
      if (performance.now() - this.camControl.lastGestureEnd < 250) return;
      this.travelTo(place);
    });
    for (const id of loadSave().visited) this.markers.setVisited(id, true);

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT', false) as MapScene['keys'];

    // Position DOM markers after the camera has rendered this frame.
    this.game.events.on(Phaser.Core.Events.POST_RENDER, this.syncOverlay, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(Phaser.Core.Events.POST_RENDER, this.syncOverlay, this);
    });
  }

  // ---------------------------------------------------------------- travel

  /** Tap-to-travel: walk (or drive, for long trips) along the roads to a place. */
  travelTo(place: Place) {
    if (this.busy) return;
    this.follow = true;
    // Already standing there? Just open the memory again.
    if (this.distTo(place) < ARRIVAL_RADIUS) {
      this.stopTrip();
      void this.arrive(place);
      return;
    }
    const route = findRoute(this.graph, this.walk, { x: this.avatar.x, y: this.avatar.y }, `place:${place.id}`);
    if (!route) return;
    const len = routeLength(route);
    const driving = len / WALK_SPEED > MAX_WALK_TIME;
    const speed = driving ? len / Phaser.Math.Clamp(len / DRIVE_SPEED, DRIVE_TIME.min, DRIVE_TIME.max) : WALK_SPEED;
    this.trip = { route, index: 1, speed, place, driving };
    this.avatar.setDriving(driving);
    this.onTripChange?.(driving);
    this.markers.setSelected(place.id);
    const px = wx(place.position.x);
    const py = wy(place.position.y);
    this.ring.setPosition(px, py).setVisible(true);
    this.flag.setPosition(px + 18, py - 4).setVisible(true);
  }

  /** Jump straight to the end of the current trip. */
  skipTrip() {
    if (!this.trip || this.busy) return;
    const end = this.trip.route[this.trip.route.length - 1];
    this.avatar.setPosition(end.x, end.y);
    this.trip.index = this.trip.route.length;
    this.snapCameraToAvatar();
  }

  recenter() {
    this.follow = true;
    this.camControl.zoomTo(Math.max(this.camControl.zoom, START_ZOOM));
    this.snapCameraToAvatar();
  }

  private stopTrip() {
    this.trip = null;
    this.avatar.setDriving(false);
    this.onTripChange?.(false);
    this.markers.setSelected(null);
    this.ring.setVisible(false);
    this.flag.setVisible(false);
  }

  // ---------------------------------------------------------------- per frame

  update(_time: number, delta: number) {
    const dt = Math.min(delta, 50) / 1000;
    let moving = false;

    if (!this.busy) {
      const input = this.readInput();
      if (input.magnitude > 0) {
        if (this.trip) this.stopTrip();
        this.follow = true;
        moving = this.freeMove(input.x, input.y, FREE_SPEED * input.magnitude * dt);
      } else if (this.trip) {
        moving = this.followRoute(dt);
      }
      this.checkArrivals();
    }

    this.avatar.setMoving(moving);
    if (this.follow) this.camControl.followTowards(this.avatar.x, this.avatar.y - AVATAR_HEIGHT / 2, delta);
  }

  /** Joystick + WASD / arrows, combined into one -1..1 vector. */
  private readInput() {
    const k = this.keys;
    let kx = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
    let ky = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
    if (kx || ky) {
      const l = Math.hypot(kx, ky);
      kx /= l;
      ky /= l;
      return { x: kx, y: ky, magnitude: 1 };
    }
    const j = this.joystick?.value;
    return j && j.magnitude > 0 ? j : { x: 0, y: 0, magnitude: 0 };
  }

  /** Free roam with wall sliding: water (except bridges) and world edges block. */
  private freeMove(dx: number, dy: number, dist: number): boolean {
    const a = this.avatar;
    const nx = a.x + dx * dist;
    const ny = a.y + dy * dist;
    a.faceVector(dx, dy);
    if (this.walk.at(nx, ny)) a.setPosition(nx, ny);
    else if (Math.abs(dx) > 0.05 && this.walk.at(nx, a.y)) a.setPosition(nx, a.y);
    else if (Math.abs(dy) > 0.05 && this.walk.at(a.x, ny)) a.setPosition(a.x, ny);
    else return false;
    return true;
  }

  private followRoute(dt: number): boolean {
    const trip = this.trip!;
    let remaining = trip.speed * dt;
    while (remaining > 0 && trip.index < trip.route.length) {
      const target = trip.route[trip.index];
      const dx = target.x - this.avatar.x;
      const dy = target.y - this.avatar.y;
      const d = Math.hypot(dx, dy);
      if (d <= remaining) {
        this.avatar.setPosition(target.x, target.y);
        remaining -= d;
        trip.index++;
      } else {
        this.avatar.setPosition(this.avatar.x + (dx / d) * remaining, this.avatar.y + (dy / d) * remaining);
        this.avatar.faceVector(dx, dy);
        remaining = 0;
      }
    }
    return true;
  }

  private checkArrivals() {
    for (const place of content.places) {
      const inside = this.distTo(place) < ARRIVAL_RADIUS;
      if (!inside) {
        this.lockedPlaces.delete(place.id);
        continue;
      }
      if (this.lockedPlaces.has(place.id)) continue;
      // While auto-travelling, only the destination counts (passing by others is fine).
      if (this.trip && this.trip.place.id !== place.id) continue;
      void this.arrive(place);
      return;
    }
    // Trip finished without entering the radius (shouldn't happen, but never get stuck)
    if (this.trip && this.trip.index >= this.trip.route.length) this.stopTrip();
  }

  private async arrive(place: Place) {
    this.busy = true;
    this.lockedPlaces.add(place.id);
    this.stopTrip();
    this.avatar.setMoving(false);
    this.avatar.faceVector(0, 1);
    if (markVisited(place.id)) this.markers.setVisited(place.id, true);
    this.sparkle(this.avatar.x, this.avatar.y - AVATAR_HEIGHT / 2);
    await this.avatar.celebrate();
    await openMemory(place);
    this.busy = false;
  }

  // ---------------------------------------------------------------- helpers

  private sparkle(x: number, y: number) {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const s = this.add.image(x, y, 'sparkle').setScale(SPRITE_SCALE).setDepth(21);
      this.tweens.add({
        targets: s,
        x: x + Math.cos(a) * 34,
        y: y + Math.sin(a) * 26,
        alpha: 0,
        duration: 550,
        ease: 'Sine.easeOut',
        onComplete: () => s.destroy(),
      });
    }
  }

  private distTo(place: Place) {
    return Math.hypot(this.avatar.x - wx(place.position.x), this.avatar.y - wy(place.position.y));
  }

  /** Nearest walkable point to (x, y), searching outward in rings. */
  private findStandingSpot(x: number, y: number): Point {
    if (this.walk.at(x, y)) return { x, y };
    for (let r = 8; r < 400; r += 8) {
      for (let a = 0; a < 16; a++) {
        const px = x + Math.cos((a / 16) * Math.PI * 2) * r;
        const py = y + Math.sin((a / 16) * Math.PI * 2) * r;
        if (this.walk.at(px, py)) return { x: px, y: py };
      }
    }
    return { x, y };
  }

  private snapCameraToAvatar() {
    this.camControl.centerOn(this.avatar.x, this.avatar.y - AVATAR_HEIGHT / 2);
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
