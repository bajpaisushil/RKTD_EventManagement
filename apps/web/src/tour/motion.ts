import { createContext, useContext } from "react";

export const MotionContext = createContext(true);

export function useMotion(): boolean {
  return useContext(MotionContext);
}
