import type { Permission } from "$lib/code/permissions";

export class Server implements IServer {
    serverId = "";
    name = "";
    description = "";
    status = 0;
    creationDate = new Date();
    serverPermissions = new Array<Permission>();
}

export class ServerPermission implements IServerPermission {
    viewStats = false;
    viewConsole = false;
    useConsole = false;
    useServerActions = false;
}

export interface IServer {
    serverId: string;
    name: string;
    description: string;
    status: number;
    serverPermissions: Permission[];
}

export interface IServerPermission {
    viewStats: boolean;
    viewConsole: boolean;
    useConsole: boolean;
    useServerActions: boolean;
}

export interface Stats {
    cpu: number;
    memory: Memory;
    playersOnline: number;
    playerLimit: number;
    startDateUnix: number;
    startDate: string;
    uptime: string;
}

export interface Memory {
    current: number;
    max: number;
    free: number;
    percentageFree: number;
}

export enum Filter {
    None,
    Minimal,
    Status
}

export enum PanelTheme {
    Light,
    Dark
}

export enum Page {
    About,
    BackupsCreate,
    BackupsOverview,
    Dashboard,
    Donate,
    Servers,
    Settings,
    UsersCreate,
    UsersOverview,
}

export interface PageReference {
    name: string;
    page: Page;
}

export interface PanelUser {
    userId: string;
    username: string;
    enabled: boolean;
    isAdmin: boolean;
    hasAccessToAllServers: boolean;
    customServerPermissions: any;
    createdAt: Date;
    lastModifiedAt: Date;
}

export interface Backup {
    backupId: string;
    name: string;
    destination: string;
    suspend: boolean;
    deleteOldBackups: boolean;
    compression: BackupCompression;
    lastStatus: BackupStatus;
    fileBlacklist: any;
    folderBlacklist: any;
    completedAt: Date;
}


export enum BackupCompression {
    High,
    Low,
    None
}
export enum BackupStatus {
    NeverRun,
    InProgress,
    Completed,
    Failed,
    Canceled
}