/**
 * moddable added
 */
declare function trace(...args: any[]): void; 
interface StringConstructor {
  /**
   * moddable added
   */
    fromArrayBuffer(buf: ArrayBuffer): string;
}

interface ArrayBufferConstructor {
  /**
   * moddable added
   */
    fromString(str: String): ArrayBuffer;
}


interface ObjectConstructor {
  /**
   * Moddable added
   */
    freeze<T>(a: T[], deep: boolean): readonly T[];
    freeze<T extends Function>(f: T, deep: boolean): T;
    freeze<T>(o: T, deep: boolean): Readonly<T>;
}

declare module "cli" {
  class CLI {
    line(str: string): void;
    static install(
      callback: (this: CLI, command: string, params: string[]) => void
    ): void;
    [key: string]: any
  }
  export {CLI as default};
}


declare module "mqtt" {
  class MQTT {
    constructor(arg: any);
    publish(topic: string, payload: string): void;
    subscribe(topic: string): void;
    unsubscribe(topic: string): void;
    onReady: any;
    onClose: any;
    onMessage: any;
  }
  export {MQTT as default};
}

declare module "x509" {
  class X509 {
    static decodeTBS(buf: Uint8Array);
    static decode(buf: Uint8Array);
  }
  export {X509 as default}
}


declare module "ber" {
  class Ber {
    constructor(buf: Uint8Array);
    next(): Uint8Array;
    getTag(): number;
    getLength(): number;
    getObjectIdentifier(): Uint8Array;
  }
  export {Ber as default}
}

declare module "securesocket" {
  var SecureSocket: any;
  export {SecureSocket as default}
}

declare module "mod/config" {
  var Config: Record<string, any>;
  export {Config as default};
}

declare module "modules" {
  class Modules {
    static has(name: string): boolean;
    static host: string[];
    static archive: string[];
    static importNow(name:string):any;
  }
  export {Modules as default}
}

declare module "esp32" {
  export function restart():void;
  export function getBuildString():string;
  export function getMAC(staOrAP:string):string;
  export function tzset():void;
  export function setenv(name: string, value: string, override: number):void;
}

declare module "esp32/ota" {
  class OTA {
    constructor();
    write(data: ArrayBuffer):void;
    cancel():void;
    complete():void;
  }
  export {OTA as default}
}

declare module "Resource" {
  class HostBuffer {
    byteLength: number
  }

  class Resource extends HostBuffer {
    constructor(path: string);
    slice(begin: number, end?: number, copy?: boolean): ArrayBuffer;
    static exists(path: string): boolean;
  }
}
