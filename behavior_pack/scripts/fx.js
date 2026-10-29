import { system, world } from "@minecraft/server";
import {
  AURA_MAX_NODES,
  AURA_PERIOD_TICKS,
  AURA_RANGE,
  PARTICLE,
  REMOTE_ITEM,
} from "./constants.js";
import { allNodes } from "./nodes.js";

const MAX_PACKETS = 256;
/** @type {{dim: any, from: any, to: any, t: number, dur: number}[]} */
const packets = [];

const center = (n) => ({ x: n.x + 0.5, y: n.y + 0.5, z: n.z + 0.5 });

/** Queue a particle that travels from the sender to the receiver. */
export function addTransferPacket(sender, receiver) {
  if (packets.length >= MAX_PACKETS) return;
  const from = center(sender);
  const to = center(receiver);
  const dist = Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z);
  const dur = Math.max(4, Math.min(24, Math.round(dist * 1.2)));
  packets.push({ dim: world.getDimension(sender.dim), from, to, t: 0, dur });
}

function stepPackets() {
  for (let i = packets.length - 1; i >= 0; i--) {
    const p = packets[i];
    p.t++;
    const f = p.t / p.dur;
    try {
      p.dim.spawnParticle(PARTICLE.transfer, {
        x: p.from.x + (p.to.x - p.from.x) * f,
        y: p.from.y + (p.to.y - p.from.y) * f,
        z: p.from.z + (p.to.z - p.from.z) * f,
      });
    } catch {
      p.t = p.dur; // unloaded chunk
    }
    if (p.t >= p.dur) packets.splice(i, 1);
  }
}

// Offsets of a block's 8 corners and 6 face centres.
const AURA_POINTS = [];
for (const x of [-0.02, 1.02])
  for (const y of [-0.02, 1.02])
    for (const z of [-0.02, 1.02]) AURA_POINTS.push([x, y, z]);
AURA_POINTS.push(
  [0.5, -0.02, 0.5],
  [0.5, 1.02, 0.5],
  [-0.02, 0.5, 0.5],
  [1.02, 0.5, 0.5],
  [0.5, 0.5, -0.02],
  [0.5, 0.5, 1.02],
);

function holdsRemote(player) {
  try {
    const inv = player.getComponent("minecraft:inventory")?.container;
    return inv?.getItem(player.selectedSlotIndex)?.typeId === REMOTE_ITEM;
  } catch {
    return false;
  }
}

function drawAura(player) {
  const loc = player.location;
  const dimId = player.dimension.id;
  const near = [];
  for (const n of allNodes()) {
    if (n.dim !== dimId) continue;
    const d = Math.hypot(n.x + 0.5 - loc.x, n.y + 0.5 - loc.y, n.z + 0.5 - loc.z);
    if (d <= AURA_RANGE) near.push([d, n]);
  }
  near.sort((a, b) => a[0] - b[0]);
  for (const [, n] of near.slice(0, AURA_MAX_NODES)) {
    const id =
      n.type === "receiver"
        ? PARTICLE.receiver
        : n.active
          ? PARTICLE.senderOn
          : PARTICLE.senderOff;
    for (const [dx, dy, dz] of AURA_POINTS) {
      try {
        player.spawnParticle(id, { x: n.x + dx, y: n.y + dy, z: n.z + dz });
      } catch {
        break;
      }
    }
  }
}

export function startFx() {
  system.runInterval(stepPackets, 1);
  system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
      if (holdsRemote(player)) drawAura(player);
    }
  }, AURA_PERIOD_TICKS);
}
