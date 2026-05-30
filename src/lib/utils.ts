import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getNormalizedRole(role: string | null | undefined): string {
  if (!role) return "STAFF";
  const upper = role.toUpperCase().trim();
  if (upper === "PEDIATRE" || upper === "PÉDIATRE" || upper === "PEDIATRICIAN") {
    return "DOCTOR";
  }
  if (upper === "SUPADMIN" || upper === "SUP_ADMIN") {
    return "SUP_ADMIN";
  }
  return upper;
}

export type UserRole = 'ADMIN' | 'DOCTOR' | 'NURSE' | 'CASHIER' | 'RECEPTIONIST' | 'PHARMACIST' | 'HR' | 'SYSTEM_ADMIN' | 'PHARMACIE' | 'INVENTAIRE' | 'SUP_ADMIN' | 'PEDIATRE' | 'REGISTER' | 'Pediatre' | 'Register' | 'SupAdmin';
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
