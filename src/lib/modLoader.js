import bus from "bus";
import hostConfig from "mc/config";
import pref from "preference";
import Modules from "modules";
import { measure } from "profiler";

let modConfig = {
  mods: {},
};
try {
  let modConfigLoaded = Modules.importNow("mod/config");
  modConfig = modConfigLoaded;
} catch (e) {
  //silence for release build
}

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
  const allPrefs = { name, ...settings, ...hostOpts, ...modPrefs, ...modOpts };
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

let mods = {};

export function loadAndInstantiate(name, initialSettings) {
  if (name in mods) return mods[name];
  const loadedModule = loadMod(name, initialSettings);
  if (!loadedModule) return null;
  const { module, settings } = loadedModule;
  measure(`Loaded ${name}`);
  const result = instantiateMod(module, settings);
  mods[name] = result;
  measure(`Instantiated ${name}`);
  return result;
}

export function unloadMod(name) {
  bus.on(`${name}_stopped`, () => {
    trace(`${name} stopped`);
  });
  bus.emit(`${name}/stop`, name);
}
