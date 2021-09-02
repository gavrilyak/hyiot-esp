import bus from "bus";
import hostConfig from "mc/config";
import pref from "preference";
import Modules from "modules";
import { measure } from "profiler";
import PubSub from "pubsub";
import initialConfig from "config";

let modConfig = {
  mods: {},
};
if (Modules.has("mod/config")) {
  let modConfigLoaded = Modules.importNow("mod/config");
  modConfig = modConfigLoaded;
}

bus.on("start", (event) => {
  const { name, ...opts } = typeof event === "string" ? { name: event } : event;
  loadAndInstantiate(name, { ...initialConfig[name], ...opts });
  bus.emit(`${name}/start`);
});
bus.on("stop", (name) => unloadMod(name));

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
  //measure("bus");
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

function unloadMod(name) {
  const modInstance = mods[name];
  if (!modInstance) return;

  try {
    modInstance?.stop();
  } catch (e) {
    trace("mod ", name, " failed to stop:", e, "\n");
  }

  for (const [handlerName, f] of Object.entries(modInstance)) {
    if (typeof f !== "function") continue;
    bus.off(`${name}/${handlerName}`, f);
  }
  delete mods[name];
  measure(`unloaded ${name}`);
  trace("unloaded mod", name, "\n");
}

export function loadAndInstantiate(name, initialSettings) {
  unloadMod(name);
  const loadedModule = loadMod(name, initialSettings);
  if (!loadedModule) return null;
  const { module, settings } = loadedModule;
  //measure(`Loaded ${name}`);
  const instance = instantiateMod(module, settings);
  mods[name] = instance;
  //measure(`Instantiated ${name}`);
  return instance;
}
