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
export type UserStatus = 'ACTIVE' | 'ON_VACATION' | 'OFF' | 'TERMINATED' | 'PENDING_APPROVAL';

export function generateUsernameFromName(fullName: string): string {
  if (!fullName) return "";
  
  const clean = (str: string) => {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");
  };

  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  let firstName = "";
  let lastName = "";
  
  if (parts.length >= 2) {
    firstName = clean(parts[0]);
    lastName = clean(parts[parts.length - 1]);
  } else if (parts.length === 1) {
    const word = clean(parts[0]);
    if (word.length >= 4) {
      firstName = word.substring(0, Math.floor(word.length / 2));
      lastName = word.substring(Math.floor(word.length / 2));
    } else {
      firstName = word;
      lastName = "staff";
    }
  } else {
    firstName = "staff";
    lastName = "user";
  }

  if (!firstName) firstName = "stf";
  if (!lastName) lastName = "usr";

  const fnLen = Math.floor(Math.random() * 2) + 2; // 2 or 3
  const lnLen = Math.floor(Math.random() * 2) + 2; // 2 or 3
  const fnPart = firstName.substring(0, fnLen).padEnd(fnLen, 'x');
  const lnPart = lastName.substring(0, lnLen).padEnd(lnLen, 'z');
  
  const numLen = Math.floor(Math.random() * 2) + 2; // 2 or 3 numbers
  
  let digits = "";
  for (let i = 0; i < numLen; i++) {
    digits += Math.floor(Math.random() * 10).toString();
  }
  
  let result = `${fnPart}${lnPart}${digits}`;
  while (result.length < 8) {
    result += Math.floor(Math.random() * 10).toString();
  }
  return result.toLowerCase().substring(0, 10);
}

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
