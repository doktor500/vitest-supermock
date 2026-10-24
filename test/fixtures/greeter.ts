export const greeter = {
  greet: (name: string): string => `Hello, ${name}`,
  settings: { tone: { formal: (): boolean => false } },
};

export const farewell = (name: string): string => `Bye, ${name}`;
