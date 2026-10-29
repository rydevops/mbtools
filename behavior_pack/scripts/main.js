import { GameMode, system, world } from "@minecraft/server";
import {
  CONTAINER_BLOCKS,
  RECEIVER_ITEM,
  REMOTE_ITEM,
  SENDER_ITEM,
} from "./constants.js";
import { startFx } from "./fx.js";
import { addNode, loadNodes, nodeAt, removeNode, updateNode } from "./nodes.js";
import { startTransfers } from "./transfer.js";
import { openNodeForm } from "./ui.js";

const MODULE_TYPE = { [SENDER_ITEM]: "sender", [RECEIVER_ITEM]: "receiver" };

function consumeHeldItem(player) {
  if (player.getGameMode() === GameMode.Creative) return;
  const slot = player
    .getComponent("minecraft:inventory")
    .container.getSlot(player.selectedSlotIndex);
  const item = slot.getItem();
  if (!item) return;
  if (item.amount <= 1) slot.setItem(undefined);
  else {
    item.amount -= 1;
    slot.setItem(item);
  }
}

function attachModule(player, block, type) {
  if (nodeAt(block)) {
    player.onScreenDisplay.setActionBar("§cThis chest already has a module");
    return;
  }
  addNode(block, type);
  consumeHeldItem(player);
  player.onScreenDisplay.setActionBar(
    type === "sender"
      ? "§6Sender attached §7- use the remote to set it up and activate it"
      : "§aReceiver attached §7- use the remote to pick its channel",
  );
}

function useRemote(player, node) {
  if (player.isSneaking && node.type === "sender") {
    node.active = !node.active;
    node.timer = 0;
    updateNode(node);
    player.onScreenDisplay.setActionBar(
      node.active ? "§aSender ACTIVE" : "§cSender stopped",
    );
    return;
  }
  openNodeForm(player, node);
}

world.beforeEvents.playerInteractWithBlock.subscribe((ev) => {
  const item = ev.itemStack;
  if (!item || !CONTAINER_BLOCKS.has(ev.block.typeId)) return;
  const { player, block } = ev;

  if (item.typeId in MODULE_TYPE) {
    ev.cancel = true;
    if (ev.isFirstEvent) {
      system.run(() => attachModule(player, block, MODULE_TYPE[item.typeId]));
    }
  } else if (item.typeId === REMOTE_ITEM && nodeAt(block)) {
    ev.cancel = true;
    if (ev.isFirstEvent) {
      system.run(() => {
        const node = nodeAt(block);
        if (node) useRemote(player, node);
      });
    }
  }
});

world.afterEvents.itemUse.subscribe((ev) => {
  if (ev.itemStack.typeId !== REMOTE_ITEM) return;
  ev.source.onScreenDisplay.setActionBar(
    "§bRemote §7- use on a module chest to configure, sneak-use a sender to toggle it",
  );
});

world.afterEvents.playerBreakBlock.subscribe((ev) => {
  const { block } = ev;
  const node = nodeAt(block);
  if (node) removeNode(node, true);
});

world.afterEvents.worldLoad.subscribe(() => {
  loadNodes();
  startTransfers();
  startFx();
});
