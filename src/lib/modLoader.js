import bus from "bus";
import hostConfig from "mc/config";
import pref from "preference";
import modConfig from "mod/config";
import Modules from "modules";
import { measure } from "profiler";

import PubSub from "pubsub";
function makePrefixedBus1(prefix) {
  return {
    on(topic, handler) {
      bus.on(`${prefix}/${topic}`, handler);
    },
    off(topic, handler) {
      bus.off(`${prefix}/${topic}`, handler);
    },
    emit(topic, ...payload) {
      bus.emit(`${prefix}/${topic}`, ...payload);
    },
  };
}
function makePrefixedBus(prefix) {
  return new PubSub(prefix);
}
function getModPrefs(name) {
  const keys = pref.keys(name);
  let result = {};
  for (const key of keys) {
    result[key] = pref.get(name, key);
  }
  return result;
}

export function loadMod(name, settings = {}) {
  const MOD_PREFIX = "mod-";
  const moduleName = settings.mod ?? MOD_PREFIX + name;
  const module = Modules.importNow(moduleName);
  const modOpts = modConfig.mods[name] || {};
  const modPrefs = getModPrefs(name);
  const hostOpts = "mods" in hostConfig ? hostConfig.mods[name] : {};
  const allPrefs = { name, ...settings, ...hostOpts, ...modOpts, ...modPrefs };
  return { module, settings: allPrefs };
}

export function instantiateMod(Mod, settings = {}) {
  const { name } = settings;
  if (typeof Mod != "function") {
    trace(`${name} not a module, skipping...\n`);
    return;
  }

  let bus = makePrefixedBus1(name);
  measure("bus");
  const modInstance = new Mod({ ...settings, bus });
  if (typeof modInstance == "object" && modInstance) {
    for (const [handlerName, f] of Object.entries(modInstance)) {
      if (typeof f !== "function") continue;
      bus.on(handlerName, f);
    }
  }
  return modInstance;
}

export function loadAndInstantiate(name, initialSettings) {
  const { module, settings } = loadMod(name, initialSettings);
  measure(`Loaded ${name}`);
  const result = instantiateMod(module, settings);
  measure(`Instantiated ${name}`);
  return result;
}

export function unloadMod(name) {
  bus.on(`${name}_stopped`, () => {
    trace(`${name} stopped`);
  });
  bus.emit(`${name}/stop`, name);
}