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
