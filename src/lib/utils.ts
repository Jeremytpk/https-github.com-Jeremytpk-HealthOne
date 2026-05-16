import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type UserRole = 'ADMIN' | 'DOCTOR' | 'NURSE' | 'CASHIER' | 'RECEPTIONIST' | 'PHARMACIST' | 'HR' | 'SYSTEM_ADMIN';
export type UserStatus = 'ACTIVE' | 'ON_VACATION' | 'OFF' | 'TERMINATED';

export interface UserProfile {
  id: string;
  hospitalId: string;
  email: string;
  role: UserRole;
  name: string;
  status: UserStatus;
  createdAt: any;
}

export interface Hospital {
  id: string;
  name: string;
  address: string;
  contactEmail: string;
  createdAt: any;
}
