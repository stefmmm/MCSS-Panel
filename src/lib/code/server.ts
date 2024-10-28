import type { Permission } from "./permissions";

export class Server implements IServer {
    serverId = "";
    name = "";
    description = "";
    type = "";
    status = 0;
    creationDate = new Date();
    serverPermissions = new Array<Permission>();
}

export interface IServer {
    serverId: string;
    name: string;
    description: string;
    type: string;
    status: number;
    serverPermissions: Permission[];
}

export enum ServerAction {
    Stop = 0,
    Start = 1,
    Kill = 2,
    Restart = 3
}

export interface IServerSettings {
    name: string;
    description: string;
    isSetToAutoStart: boolean;
    forceSaveOnStop: boolean;
    javaAllocatedMemory: number;
    keepOnline: KeepOnline;
}


export enum KeepOnline {
    None,
    Elevated,
    Aggressive
}

/* API */

