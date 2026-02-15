import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const roundToTwo = (num: number | string | "") => {
  if (num === '' || num === "") return num;
  return Math.round((Number(num) + Number.EPSILON) * 100) / 100
}