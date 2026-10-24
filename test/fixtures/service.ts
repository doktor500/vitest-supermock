import { farewell, greeter } from "./greeter";

export const welcome = (name: string): string => greeter.greet(name).toUpperCase();

export const leave = (name: string): string => farewell(name).toUpperCase();

export const isFormal = (): boolean => greeter.settings.tone.formal();
