import type { SupportedRuntimeRole } from "@/lib/roles";

export interface User {
  id?: string;
  name?: string;
  email: string;
  roles: SupportedRuntimeRole[];
  institutionIds?: string[];
  primaryInstitutionId?: string;
  googleToken?: {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type: string;
    scope: string;
    id_token?: string;
  };
}

export async function getUsers(): Promise<User[]> {
  const response = await fetch("/api/users").catch(() => null);
  if (response?.ok) {
    const data = await response.json();
    return data.users;
  }
  
  return [];
}

export async function saveUser(user: User): Promise<boolean> {
  const response = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user)
  }).catch(() => null);
  
  return !!response?.ok;
}

export async function getConductors(): Promise<User[]> {
  const users = await getUsers();
  return users.filter((u) => u.roles.includes("conductor"));
}

export async function getObservers(): Promise<User[]> {
  const users = await getUsers();
  return users.filter((u) => u.roles.includes("observer"));
}

export async function deleteUser(email: string): Promise<boolean> {
  const response = await fetch(`/api/users?email=\${encodeURIComponent(email)}`, {
    method: "DELETE"
  }).catch(() => null);
  
  return !!response?.ok;
}
