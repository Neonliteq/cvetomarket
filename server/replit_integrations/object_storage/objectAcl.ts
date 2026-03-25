export enum ObjectAccessGroupType {}

export interface ObjectAccessGroup {
  type: ObjectAccessGroupType;
  id: string;
}

export enum ObjectPermission {
  READ = "read",
  WRITE = "write",
}

export interface ObjectAclRule {
  group: ObjectAccessGroup;
  permission: ObjectPermission;
}

export interface ObjectAclPolicy {
  owner: string;
  visibility: "public" | "private";
  aclRules?: Array<ObjectAclRule>;
}

/**
 * ACL enforcement is intentionally disabled in this S3 adapter.
 *
 * All uploaded files are stored in a private S3 bucket and accessed exclusively
 * through the server-side `/objects/*` route (which does its own auth where needed).
 * File names are randomised UUIDs, providing obscurity-by-default. If row-level
 * access control is ever needed, implement it at the route layer in
 * `server/replit_integrations/object_storage/routes.ts`.
 */
export async function canAccessObject(_: {
  userId?: string;
  objectFile: unknown;
  requestedPermission: ObjectPermission;
}): Promise<boolean> {
  return true;
}

export async function getObjectAclPolicy(
  _objectFile: unknown,
): Promise<ObjectAclPolicy | null> {
  return null;
}

export async function setObjectAclPolicy(
  _objectFile: unknown,
  _aclPolicy: ObjectAclPolicy,
): Promise<void> {}
