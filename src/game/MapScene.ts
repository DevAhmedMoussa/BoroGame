import Phaser from 'phaser';
import { COCKPIT_RIDES, avatarStyle } from '../config';
import { content, type Place } from '../content';
import { preloadPlace } from '../content/media';
import { CameraControl } from '../lib/cameraControl';
import { findRoute, routeLength, type Point } from '../lib/pathfinding';
import { buildRoadGraph, type RoadGraph } from '../lib/roads';
import { normalizeOutfit } from '../lib/outfit';
import { loadSave, markVisited, updateSave } from '../lib/storage';
import { Walkable } from '../lib/walkable';
import type { Avatar3D } from '../three/Avatar3D';
import { KUKU } from '../sprites/kuku';
import { CAR, FLAG, HEART, SPARKLE } from '../sprites/props';
import { makePixelTexture } from '../sprites/pixel';
import type { Joystick } from '../ui/joystick';
import { MarkerLayer } from '../ui/markers';
import { openMemory } from '../ui/memoryViewer';
import { toast } from '../ui/toast';
import { AVATAR_HEIGHT, Avatar, SPRITE_SCALE } from './Avatar';
import { drawGround } from './ground';
import { Owl } from './owl';
import type { Pet } from './pet';
import { MapLife, bakeMap, planScenery, registerTextures } from './scenery';
import { Zuzu } from './zuzu';
import { OWL_OFFSET, WORLD_H, WORLD_W, ZUZU_OFFSET, isWater, wx, wy } from './world';

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
  /** Destination place; trips without one (e.g. walking over to Zuzu) just end at the last point. */
  place?: Place;
  /** Shown on the car ride when there's no place (e.g. the pet's name). */
  label?: string;
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

  private avatar3d?: Avatar3D;
  private walk!: Walkable;
  private life!: MapLife;
  /** Zuzu and the owl by Kuku's home. */
  private pets: Pet[] = [];
  private nearPet: Pet | null = null;
  /** True while the 3D cockpit drive is playing. */
  private riding = false;
  /** Called with the pet's button text when Kuku is close enough to one (null when not). */
  onPetChange?: (action: string | null) => void;
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
    this.onPetChange = this.registry.get('onPetChange');
    for (const s of [KUKU, CAR, HEART, SPARKLE, FLAG]) makePixelTexture(this, s);

    this.graph = buildRoadGraph(places);
    this.walk = new Walkable(this.graph);
    // Pixel-art map: ground + scenery + emblems baked into one texture, plus the moving bits
    registerTextures(this);
    const plan = planScenery(places, this.graph);
    this.walk.block(plan.country.ponds);
    bakeMap(this, drawGround(this, places, this.graph), plan, places);
    this.life = new MapLife(this, this.graph, places, plan);

    this.camControl = new CameraControl(this, {
      dpr: this.dpr,
      world: { width: WORLD_W, height: WORLD_H },
      maxZoom: 4,
      steps: ZOOM_STEPS,
    });
    this.camControl.onUserMove = () => (this.follow = false);

    // Destination marker: pulsing ring + little flag
    this.ring = this.add.ellipse(0, 0, 60, 26).setStrokeStyle(4, 0xe5566f, 1).setVisible(false).setDepth(7000);
    this.flag = this.add.image(0, 0, 'flag').setOrigin(0.1, 1).setScale(SPRITE_SCALE).setVisible(false).setDepth(7001);
    this.tweens.add({ targets: this.ring, scale: { from: 0.7, to: 1.15 }, alpha: { from: 1, to: 0.3 }, duration: 700, yoyo: true, repeat: -1 });

    // Avatar starts at Kuku's Home, just beside the dot (inside its radius, so it doesn't trigger)
    const home = places.find((p) => p.id === 'kuku-home') ?? places[0];
    const start = this.findStandingSpot(wx(home.position.x) - 44, wy(home.position.y) + 8);
    this.avatar = new Avatar(this, start.x, start.y);
    for (const p of places) if (this.distTo(p) < ARRIVAL_RADIUS) this.lockedPlaces.add(p.id);
    if (avatarStyle() === '3d') void this.load3DAvatar();

    this.camControl.setZoomAt(START_ZOOM, this.scale.width / 2, this.scale.height / 2);
    this.camControl.centerOn(start.x, start.y);

    this.markers = new MarkerLayer(document.getElementById('markers')!, places, (place) => {
      if (performance.now() - this.camControl.lastGestureEnd < 250) return;
      this.travelTo(place);
    });
    for (const id of loadSave().visited) this.markers.setVisited(id, true);

    // Zuzu the dog and the owl on her perch, right by Kuku's home
    const homePlace = places.find((p) => p.id === 'kuku-home');
    if (homePlace) {
      const hx = wx(homePlace.position.x);
      const hy = wy(homePlace.position.y);
      this.pets = [new Zuzu(this, hx + ZUZU_OFFSET.dx, hy + ZUZU_OFFSET.dy), new Owl(this, hx + OWL_OFFSET.dx, hy + OWL_OFFSET.dy)];
      for (const pet of this.pets) {
        this.markers.addTag(
          pet.name,
          pet.tag.x,
          pet.tag.y,
          () => {
            if (performance.now() - this.camControl.lastGestureEnd < 250) return;
            this.walkToPet(pet);
          },
          pet.tag.above,
        );
      }
    }

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
    preloadPlace(place.id); // first photos download during the walk
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
    if (driving) void this.startRide(this.trip, place);
    this.markers.setSelected(place.id);
    const px = wx(place.position.x);
    const py = wy(place.position.y);
    this.ring.setPosition(px, py).setVisible(true);
    this.flag.setPosition(px + 18, py - 4).setVisible(true);
  }

  /** Walk over to a pet (via the road to Kuku's home, then up to it). */
  walkToPet(pet: Pet) {
    if (this.busy) return;
    this.follow = true;
    const spot = pet.standSpot;
    if (Math.hypot(this.avatar.x - spot.x, this.avatar.y - spot.y) < 30) return;
    let route: Point[] | null = null;
    if (this.walk.segment(this.avatar.x, this.avatar.y, spot.x, spot.y) && Math.hypot(this.avatar.x - spot.x, this.avatar.y - spot.y) < 260) {
      route = [{ x: this.avatar.x, y: this.avatar.y }, spot];
    } else {
      route = findRoute(this.graph, this.walk, { x: this.avatar.x, y: this.avatar.y }, 'place:kuku-home');
      if (route) route.push(spot);
    }
    if (!route) return;
    const len = routeLength(route);
    const driving = len / WALK_SPEED > MAX_WALK_TIME;
    const speed = driving ? len / Phaser.Math.Clamp(len / DRIVE_SPEED, DRIVE_TIME.min, DRIVE_TIME.max) : WALK_SPEED;
    this.trip = { route, index: 1, speed, driving, label: pet.name };
    this.avatar.setDriving(driving);
    this.onTripChange?.(driving);
    this.markers.setSelected(null);
    if (driving) void this.startRide(this.trip);
  }

  /** Open the wardrobe (3D avatar only); the chosen outfit is saved and worn on the map. */
  async openWardrobe() {
    if (this.busy) return;
    if (!this.avatar3d) {
      toast('The wardrobe needs the 3D Kuku, which this device can’t show');
      return;
    }
    this.busy = true;
    this.stopTrip();
    this.releaseControls();
    this.avatar.setMoving(false);
    try {
      const { openWardrobe } = await import('../ui/wardrobe');
      const outfit = await openWardrobe(normalizeOutfit(loadSave().outfit));
      updateSave((d) => (d.outfit = outfit));
      this.avatar3d?.setOutfit(outfit);
    } finally {
      this.releaseControls();
      this.busy = false;
    }
  }

  /** Pet whoever is closest (Zuzu hops and wags, the owl flaps and hoots). */
  petNearby() {
    const pet = this.nearPet;
    if (!pet) return;
    // Turn towards it, but three-quarters to the camera so Kuku's face still shows
    const dx = pet.x - this.avatar.x;
    this.avatar.faceVector(dx, Math.abs(dx) * 0.8);
    pet.pet();
  }

  /** Long trip in the car: play the 3D cockpit drive, then arrive. */
  private async startRide(trip: Trip, place?: Place) {
    if (!COCKPIT_RIDES || !this.avatar3d || this.riding) return;
    this.riding = true;
    this.onTripChange?.(false); // the ride has its own Skip
    this.releaseControls();
    const crossesNile = trip.route.some((p, i) => {
      if (i === 0) return false;
      const q = trip.route[i - 1];
      return isWater((p.x + q.x) / 2 / WORLD_W, (p.y + q.y) / 2 / WORLD_H);
    });
    const duration = Phaser.Math.Clamp(routeLength(trip.route) / 450, 5, 8);
    try {
      const { playRide, rideTheme } = await import('../three/cockpit');
      await playRide({
        name: place?.name ?? trip.label ?? "Kuku's Home",
        emblem: place ? place.emblem : 'kuku-home',
        theme: rideTheme(place?.id),
        crossesNile,
        duration,
      });
    } catch (err) {
      console.warn('Cockpit ride unavailable, driving on the map instead.', err);
    } finally {
      this.riding = false;
      this.releaseControls();
    }
    // Arrive: jump to the end of the route (the arrival check takes it from there)
    if (this.trip === trip) {
      this.follow = true;
      this.skipTrip();
    }
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

  update(time: number, delta: number) {
    this.life.update(time, delta, this.cameras.main.worldView, this.avatar);
    let nearest: Pet | null = null;
    let best = Infinity;
    for (const pet of this.pets) {
      pet.update(time);
      const d = pet.distance(this.avatar.x, this.avatar.y);
      if (!this.busy && d < best) {
        best = d;
        nearest = pet;
      }
    }
    if (nearest !== this.nearPet) {
      this.nearPet = nearest;
      this.onPetChange?.(nearest?.action ?? null);
    }
    const dt = Math.min(delta, 50) / 1000;
    let moving = false;

    if (!this.busy && !this.riding) {
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
      const dist = this.distTo(place);
      if (dist < ARRIVAL_RADIUS * 4) preloadPlace(place.id); // walking up with the joystick
      const inside = dist < ARRIVAL_RADIUS;
      if (!inside) {
        this.lockedPlaces.delete(place.id);
        continue;
      }
      if (this.lockedPlaces.has(place.id)) continue;
      // While auto-travelling, only the destination counts (passing by others is fine).
      if (this.trip && this.trip.place?.id !== place.id) continue;
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
    this.releaseControls();
    this.avatar.setMoving(false);
    this.avatar.faceVector(0, 1);
    if (markVisited(place.id)) this.markers.setVisited(place.id, true);
    this.sparkle(this.avatar.x, this.avatar.y - AVATAR_HEIGHT / 2);
    await this.avatar.celebrate();
    await openMemory(place);
    // Beach day: suggest the sun hat once she's at Sahel
    if (place.id === 'sahel' && this.avatar3d && normalizeOutfit(loadSave().outfit).accessory !== 'sunhat') {
      toast('Beach day! Try the sun hat in the wardrobe', 3800);
    }
    // Whatever was held when the window opened must not keep her walking after it closes.
    this.releaseControls();
    this.busy = false;
  }

  /** Let go of the joystick and any held keys. */
  private releaseControls() {
    this.joystick?.reset();
    this.input.keyboard?.resetKeys();
  }

  // ---------------------------------------------------------------- helpers

  private sparkle(x: number, y: number) {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const s = this.add.image(x, y, 'sparkle').setScale(SPRITE_SCALE).setDepth(9001);
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
    const scale = cam.zoom / this.dpr;
    this.markers.update(cam.worldView.x, cam.worldView.y, scale, this.camControl.zoom);
    if (this.avatar3d) {
      const a = this.avatar;
      this.avatar3d.update({
        sx: (a.x - cam.worldView.x) * scale,
        sy: (a.y - cam.worldView.y) * scale,
        zoom: scale,
        heading: a.heading,
        moving: a.isMoving,
        driving: a.isDriving,
        hop: a.hopHeight,
        dt: this.game.loop.delta / 1000,
      });
    }
  }

  /** Load the 3D Kuku after the map is up; keep the pixel sprite if 3D can't run here. */
  private async load3DAvatar() {
    try {
      const { Avatar3D } = await import('../three/Avatar3D');
      const layer = document.getElementById('avatar3d')!;
      const a3d = new Avatar3D(layer, this.dpr);
      a3d.canvas.addEventListener('webglcontextlost', () => {
        a3d.canvas.remove();
        this.avatar3d = undefined;
        this.avatar.setUse3D(false);
      });
      this.avatar3d = a3d;
      this.avatar.setUse3D(true);
    } catch (err) {
      console.warn('3D avatar unavailable, using the pixel sprite instead.', err);
    }
  }
}
