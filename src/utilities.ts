import SimpleEventEmitter, { Listener } from "./TypedEventEmitter";

// tslint:disable:no-empty
export function noop(): void {}

function partialEquals<T>(obj: T, needle: Partial<T>): boolean {
  // tslint:disable:forin
  for (const key in needle) {
    const value: any = needle[key];
    if (value === undefined) {
      continue;
    }
    if (obj[key] === undefined) {
      return false;
    } else if (typeof value === "object" && typeof obj[key] === "object") {
      if (!partialEquals(obj[key], value)) {
        return false;
      }
    } else if (obj[key] !== value) {
      return false;
    }
  }
  return true;
}

export function awaitEvent<T, K extends keyof T>(
  emitter: SimpleEventEmitter<T>,
  eventname: K,
  timeout: number = 0,
  needle: null | Partial<T[K]> = null
): Promise<T[K]> {
  return new Promise((resolve, reject) => {
    let timer: number | NodeJS.Timer;
    const listener: Listener<T[K]> = (arg: T[K]) => {
      if (needle && !partialEquals(arg, needle)) {
        return;
      }
      emitter.off(eventname, listener);
      if (timer) {
        clearTimeout(timer as number);
      }
      resolve(arg);
    };

    emitter.on(eventname, listener);

    if (timeout > 0) {
      timer = setTimeout(() => {
        emitter.off(eventname, listener);
        reject(new Error(`timed out awaiting event ${eventname}`));
      }, timeout);
    }
  });
}

export function sleep(time: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(() => resolve(), time);
  });
}

export function contains(token: string, str: string): boolean  {
  return str.indexOf(token) !== -1;
};

export function find(
  token: string,
  str: string,
  start: number,
  reverse: boolean = false,
  fallback?: number
): number {
  for (; start < str.length; start++) {
    if (reverse) {
      if (token !== str[start]) {
        return start;
      }
    } else {
      if (token === str[start]) {
        return start;
      }
    }
  }
  if (fallback !== undefined) {
    return fallback;
  }
  throw new Error(`"${token}" not found in string "${str}"`);
}

export function nextNonspace(str: string, start: number, fallback?: number): number {
  return find(" ", str, start, true, fallback);
};

export function nextSpace(str: string, start: number, fallback?: number): number {
  return find(" ", str, start, false, fallback);
}