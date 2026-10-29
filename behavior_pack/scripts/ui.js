import { ItemStack, system } from "@minecraft/server";
import { FormCancelationReason, ModalFormData } from "@minecraft/server-ui";
import {
  CHANNEL_COUNT,
  MAX_AMOUNT,
  MAX_INTERVAL,
  NODE_ITEM,
} from "./constants.js";
import { removeNode, updateNode } from "./nodes.js";

const CHANNELS = Array.from({ length: CHANNEL_COUNT }, (_, i) => `Channel ${i + 1}`);

function giveItem(player, typeId) {
  const left = player.getComponent("minecraft:inventory").container.addItem(
    new ItemStack(typeId, 1),
  );
  if (left) player.dimension.spawnItem(left, player.location);
}

async function showForm(form, player, tries = 10) {
  for (let i = 0; i < tries; i++) {
    const res = await form.show(player);
    if (res.cancelationReason !== FormCancelationReason.UserBusy) return res;
    await new Promise((r) => system.runTimeout(() => r(undefined), 5)); // wait for chat to close
  }
  return undefined;
}

/** Open the settings form for a sender or receiver. */
export async function openNodeForm(player, node) {
  const sender = node.type === "sender";
  const form = new ModalFormData().title(
    sender ? "Logistics Sender" : "Logistics Receiver",
  );
  form.dropdown("Channel", CHANNELS, { defaultValueIndex: node.channel - 1 });
  if (sender) {
    form.toggle("Active", { defaultValue: node.active });
    form.slider("Items per transfer", 1, MAX_AMOUNT, {
      defaultValue: node.amount,
      valueStep: 1,
    });
    form.slider("Ticks between transfers", 1, MAX_INTERVAL, {
      defaultValue: node.interval,
      valueStep: 1,
    });
  }
  form.toggle("Remove module (returns item)", { defaultValue: false });
  form.submitButton("Save");

  const res = await showForm(form, player);
  if (!res || res.canceled || !res.formValues) return;

  const v = res.formValues;
  const remove = v[v.length - 1];
  if (remove) {
    removeNode(node, false);
    giveItem(player, NODE_ITEM[node.type]);
    player.onScreenDisplay.setActionBar("§eModule removed");
    return;
  }
  node.channel = Number(v[0]) + 1;
  if (sender) {
    node.active = Boolean(v[1]);
    node.amount = Number(v[2]);
    node.interval = Number(v[3]);
    node.timer = 0;
  }
  updateNode(node);
  player.onScreenDisplay.setActionBar(
    sender
      ? `§aSender saved §7- channel ${node.channel}, ${node.amount}/${node.interval}t, ${node.active ? "ON" : "OFF"}`
      : `§aReceiver saved §7- channel ${node.channel}`,
  );
}
