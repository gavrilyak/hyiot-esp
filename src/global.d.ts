/**
 * moddable added
 */
declare function trace(...args: string[]): void; 
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
