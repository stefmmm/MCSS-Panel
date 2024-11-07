import axiosClient from '$lib/code/axiosClient';
import {
    isLoadingServers,
    isOffline,
    selectedServerId,
    servers,
} from '$lib/code/global';
import { log } from '$lib/code/logger';
import {
    hasPermission,
    Permission,
    ServerAccessDetails,
} from '$lib/code/permissions';
import { settings } from '$lib/code/storage';
import { get } from 'svelte/store';
import { type ISchedulerTask, type ISchedulerDetails, translateRawSchedulerResponse, type INewSchedulerTask, type IEditSchedulerTask, type IUpdateSchedulerTaskRequest, type ICreateSchedulerTaskRequest } from './scheduler';
import { WebhookTrigger, convertWebhookHeaderArrayToObject, type ICreateWebhookRequest, type IEditWebhook, type INewWebhook, type IRawGetWebhookListResponse, type IRawGetWebhookResponse, type IUpdateWebhookRequest, type IWebhook } from './webhook';
import type { Backup, BackupHistory, IBackupDetails, IBackupStats, ICreateBackupRequest, IEditBackup, INewBackup } from './backup';
import type { IApiKey, ICreateApiKeyRequest, IGetApiKeyListResponse, INewApiKey } from './apiKey';
import type { IServerSettings, ServerAction } from './server';
import type { IEditPanelSettings, IEditPanelSettingsRequest, IPanelSettings } from './panel';
import { calculateUptime, type Memory, type Stats } from './statistics';
import type { ICreateUserRequest, IDeleteUserAccount, IDeleteUserAccountRequest, IEditPanelUser, IEditUserAccount, IGetPanelUserSettingsResponse, IGetUserDetailsResponse, IGetUsersListResponse, INewPanelUser, IPanelUser, IUpdateUserAccountRequest, IUpdateUserRequest, IUserAvatarRequest } from './user';
import type { McssSettingsSection } from './mcss';
import { SSE } from 'sse.js';
import { baseUrl } from './routing';
import { auth } from './auth';

export enum Filter {
    None,
    Minimal,
    Status
}

/*
*  API Requests
*/

export function getMcssSettings(section: McssSettingsSection, report: (settings: any) => void, completed: (wasSuccess: boolean) => void): void {
    log("API Request: getMcssSettings");
    axiosClient().get(`/api/v3/mcss/settings/${section}`)
        .then((response) => {
            if (response?.status !== 200) {
                return Promise.reject(response);
            }

            log(response?.status);
            log(response?.data);
            return response?.data ?? [];
        })
        .then((settings) => {
            report(settings);
            completed(true);
        })

        .catch((error) => {
            console.error(`Failed to get mcss settings Error: ${error}`)
            completed(false);
        })
}

export function updateMcssSettings(settings: any, report: (wasSuccess: boolean) => void) {
    log("API Request: editServer");
    axiosClient().patch(`/api/v3/mcss/settings`, JSON.stringify(settings))
        .then((response) => {
            if (response?.status !== 200) {
                return Promise.reject(response);
            }

            log(response?.status);
            log(response?.data);
            report(true);
        })

        .catch((error) => {
            console.error(`Failed to save mcss settings Error: ${error}`)
            report(false);
        })
}

export function getServers(filter: Filter = Filter.None): void {
    isLoadingServers.set(true);

    // no logging here on purpose, too many requests
    axiosClient().get(`/api/v3/servers?filter=${filter}`)
        .then((response) => {
            if (response?.status !== 200) {
                return Promise.reject(response);
            }
            return response.data;
        })
        .then((serverDetails) => {
            servers.set(serverDetails);

            // incase there is no selectedServer
            // in an ideal world this code belongs in  +page.svelte
            // or even better in a caching layer
            if (!get(selectedServerId)) {
                let firstServerId = get(servers)[0]?.serverId ?? null;
                if (firstServerId != null) {
                    selectedServerId.set(firstServerId);
                }
            }
        })
        .catch((error) => {
            isOffline.set(true)
            console.error(`Failed to fetch servers with filter: ${filter} Error: ${error}`)
        })

    isLoadingServers.set(false);
}

export function getServer(serverId: string, report: (wasSuccess: boolean, server: IServerSettings) => void) {
    log("API Request: getServer");
    axiosClient().get(`/api/v3/servers/${serverId}`)
        .then((response) => {
            if (response?.status !== 200) {
                return Promise.reject(response);
            }

            log(response?.status);
            log(response?.data);
            return response?.data ?? [];
        })
        .then((serverDetails) => {
            report(true, serverDetails);
        })

        .catch((error) => {
            console.error(`Failed to get server with id: ${serverId} Error: ${error}`)
            //@ts-ignore 
            report(false, null);
        })
}

export function editServer(serverId: string, settings: IServerSettings, report: (wasSuccess: boolean) => void) {
    log("API Request: editServer");
    axiosClient().put(`/api/v3/servers/${serverId}`, JSON.stringify(settings))
        .then((response) => {
            if (response?.status !== 200) {
                return Promise.reject(response);
            }

            log(response?.status);
            log(response?.data);
            report(true);
        })

        .catch((error) => {
            console.error(`Failed to save settings of server with id: ${serverId} Error: ${error}`)
            report(false);
        })
}

export async function postServerAction(serverId: string, action: string) {
    if (!serverId || !hasPermission(Permission.useServerActions, serverId)) {
        return;
    }

    log("API Request: postServerAction");
    axiosClient().post(`/api/v3/servers/${serverId}/execute/action`, JSON.stringify({ action: action }))
        .then((response) => {
            if (response?.status !== 200) {
                return Promise.reject(response);
            }

            log(response?.status);
            log(response?.data);
            return response.data;
        })

        .catch((error) => {
            console.error(`Failed to execute action: ${action} on server: ${serverId} Error: ${error}`)
        })
}

export async function postMassServerAction(serverIds: string[], action: ServerAction, completed: (wasSuccess: boolean) => void) {
    // we don't check perm here, the backend will do that
    if (!serverIds || serverIds.length <= 0) {
        return;
    }

    log("API Request: postMassServerAction");
    axiosClient().post(`/api/v3/servers/execute/action`, JSON.stringify({ action: action, serverIds: serverIds }))
        .then((response) => {
            if (response?.status !== 200) {
                return Promise.reject(response);
            }

            log(response?.status);
            log(response?.data);
            completed(true);
        })
        .catch((error) => {
            console.error(`Failed to mass execute action: ${action} on servers: ${serverIds} Error: ${error}`)
            completed(false);
        })
}

export async function postServerCommand(serverId: string, input: string) {
    if (!serverId || !input || !hasPermission(Permission.useConsole, serverId)) {
        return;
    }

    if (get(settings).chatModeConsole) {
        if (!input.startsWith("/say") && !input.startsWith("say ")) {
            input = "/say " + input;
        }
    }

    log("API Request: postServerCommand");
    axiosClient().post(`/api/v3/servers/${serverId}/execute/command`, JSON.stringify({ command: input }))
        .then((response) => {
            if (response?.status !== 200) {
                return Promise.reject(response);
            }

            log(response?.status);
            log(response?.data);
            return response.data;
        })
        .catch((error) => {
            console.error(`Failed to execute command: ${input} on server: ${serverId} Error: ${error}`)
        })
}

export function getServerStatus(serverId: string, report: (latestStats: Stats) => void, completed: (wasSuccess: boolean) => void): void {
    if (!serverId || !hasPermission(Permission.viewStats, serverId)) {
        return;
    }

    log("API Request: getServerStatus");
    axiosClient().get(`/api/v3/servers/${serverId}/stats`)
        .then((response) => {
            if (response?.status !== 200) {
                return Promise.reject(response);
            }

            log(response?.status);
            log(response?.data);
            return response?.data?.latest ?? {};
        })
        .then((latestStats) => {
            const memory: Memory = {
                current: latestStats.memoryUsed ?? 0,
                max: latestStats.memoryLimit ?? 0,
                free: (latestStats.max - latestStats.current),
            }

            const stats: Stats = {
                cpu: latestStats.cpu ?? 0,
                memory: memory,
                playersOnline: latestStats.playersOnline ?? 0,
                playerLimit: latestStats.playerLimit ?? 0,

                uptime: calculateUptime(latestStats.startDate),
                startDateUnix: latestStats.startDate,
                startDate: new Date(latestStats.startDate * 1000).toLocaleString(window.navigator.language, {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                })
            }

            report(stats);
            completed(true);
        })
        .catch((error) => {
            console.error(`Failed to check if console is outdated on server: ${serverId} Error: ${error}`)
            completed(false);
        })
}

export function getServerConsole(serverId: string, report: (consoleLines: string[]) => void, completed: (wasSuccess: boolean) => void): void {
    if (!serverId || !hasPermission(Permission.viewConsole, serverId)) {
        return;
    }

    const amountOfConsoleLines = get(settings)?.amountOfConsoleLines ?? 50;
    const reverseConsoleLines = get(settings)?.reverseConsoleLines ?? false;

    log("API Request: getServerConsole");
    axiosClient().get(`/api/v3/servers/${serverId}/console?amountOfLines=${amountOfConsoleLines}&reversed=${reverseConsoleLines}`)
        .then((response) => {
            if (response?.status !== 200) {
                return Promise.reject(response);
            }

            log(response?.status);
            log(`amount of lines: ${response?.data?.length}`);

            return response?.data ?? [];
        })
        .then((consoleLines) => {
            report(consoleLines);
            completed(true);
        })
        .catch((error) => {
            console.error(`Failed to fetch console on server: ${serverId} Error: ${error}`)
            completed(false);
        })
}

// TODO make a custom wrapper for the SSE package
export function GetConsoleStream(serverId: string): SSE {
    return new SSE(`${baseUrl}/api/v3/servers/${serverId}/console/events`, {
        headers: { apiKey: get(auth)?.apiKey }
    });
}

export function getPanelUsers(report: (users: IPanelUser[]) => void, completed: (wasSuccess: boolean) => void): void {
    log("API Request: getPanelUsers");
    axiosClient().get(`/api/v3/users`)
        .then((response) => {
            if (response?.status !== 200) {
                return Promise.reject(response);
            }

            log(response?.status);
            log(response?.data);
            return response?.data ?? [];
        })
        .then((rawResponse) => {
            return rawResponse as IGetUsersListResponse;
        })
        .then((data) => {
            let users: IPanelUser[] = [];
            data.forEach((data: any) => {
                let user: IPanelUser = {
                    userId: data.userId,
                    username: data.username,
                    enabled: data.enabled,
                    isAdmin: data.isAdmin,
                    serverAccessDetails: new ServerAccessDetails(),
                    createdAt: data.createdAt,
                    lastModifiedAt: data.lastModifiedAt
                }
                user.serverAccessDetails.init(data.hasAccessToAllServers, data.customServerPermissions);
                users.push(user);
            });

            report(users);
            completed(true);
        })

        .catch((error) => {
            console.error(`Failed to fetch panel users with error: ${error}`)
            completed(false);
        })
}

export function getPanelUser(userId: string, report: (wasSuccess: boolean, user: IPanelUser) => void) {
    log("API Request: getPanelUser");
    axiosClient().get(`/api/v3/users/${userId}`)
        .then((response) => {
            if (response?.status !== 200) {
                return Promise.reject(response);
            }

            log(response?.status);
            log(response?.data);
            return response?.data ?? [];
        })
        .then((rawResponse) => {
            return rawResponse as IGetUserDetailsResponse;
        })
        .then((data) => {
            let user: IPanelUser = {
                userId: data.userId,
                username: data.username,
                enabled: data.enabled,
                isAdmin: data.isAdmin,
                serverAccessDetails: new ServerAccessDetails(),
                createdAt: data.createdAt,
                lastModifiedAt: data.lastModifiedAt
            }
            user.serverAccessDetails.init(data.hasAccessToAllServers, data.customServerPermissions);

            report(true, user);
        })

        .catch((error) => {
            console.error(`Failed to get panel user with id: ${userId} Error: ${error}`)
            //@ts-ignore 
            report(false, null);
        })
}

export function createPanelUser(newUser: INewPanelUser, completed: (wasSuccess: boolean) => void) {
    //formulate proper request
    var requestBody: ICreateUserRequest = {
        username: newUser.username,
        password: newUser.password,
        passwordRepeat: newUser.passwordRepeat,
        enabled: newUser.enabled,
        isAdmin: newUser.isAdmin,
        hasAccessToAllServers: newUser.serverAccessDetails.hasAccessToAllServers,
        customServerPermissions: {}
    }

    ServerAccessDetails.UpdatePermissionTargetObject(newUser.serverAccessDetails, requestBody);

    log("API Request: createPanelUser");
    axiosClient().post(`/api/v3/users`, JSON.stringify(requestBody))
        .then((response) => {
            if (response?.status !== 201) {
                return Promise.reject(response);
            }

            log(response?.status);
            log(response?.data);
            completed(true);
        })

        .catch((error) => {
            console.error(`Failed to create panel user: ${newUser.username} Error: ${error}`)
            completed(false);
        })
}

export function editPanelUser(updatedUser: IEditPanelUser, completed: (wasSuccess: boolean) => void) {
    //formulate proper request
    var requestBody: IUpdateUserRequest = {
        password: updatedUser.password,
        passwordRepeat: updatedUser.passwordRepeat,
        enabled: updatedUser.enabled,
        isAdmin: updatedUser.isAdmin,
        hasAccessToAllServers: updatedUser.serverAccessDetails.hasAccessToAllServers,
        customServerPermissions: {}
    }

    ServerAccessDetails.UpdatePermissionTargetObject(updatedUser.serverAccessDetails, requestBody);

    log("API Request: editPanelUser");
    axiosClient().put(`/api/v3/users/${updatedUser.userId}`, JSON.stringify(requestBody))
        .then((response) => {
            if (response?.status !== 200) {
                return Promise.reject(response);
            }

            log(response?.status);
            log(response?.data);
            completed(true);
        })

        .catch((error) => {
            console.error(`Failed to edit panel user with id: ${updatedUser.userId} Error: ${error}`)
            completed(false);
        })
}

export function deletePanelUser(userId: string, completed: (wasSuccess: boolean) => void): void {
    log("API Request: deletePanelUser");
    axiosClient().delete(`/api/v3/users/${userId}`)
        .then((response) => {
            if (response?.status !== 200) {
                return Promise.reject(response);
            }

            log(response?.status);
            log(response?.data);
            completed(true);
        })

        .catch((error) => {
            console.error(`Failed to delete panel user with id ${userId} Error: ${error}`)
            completed(false);
        })
}

export function editUserAccount(updatedUserAccount: IEditUserAccount, completed: (wasSuccess: boolean) => void) {
    //formulate proper request
    var requestBody: IUpdateUserAccountRequest = {
        password: updatedUserAccount.password,
        newPassword: updatedUserAccount.newPassword,
        newPasswordRepeat: updatedUserAccount.newPasswordRepeat,
    }

    log("API Request: editUserAccount");
    axiosClient().put(`/api/v3/users/current/account`, JSON.stringify(requestBody))
        .then((response) => {
            if (response?.status !== 200) {
                return Promise.reject(response);
            }

            log(response?.status);
            log(response?.data);
            completed(true);
        })

        .catch((error) => {
            console.error(`Failed to edit user account Error: ${error}`)
            completed(false);
        })
}

export function deleteUserAccount(deleteUserAccount: IDeleteUserAccount, completed: (wasSuccess: boolean) => void) {
    //formulate proper request
    var requestBody: IDeleteUserAccountRequest = {
        password: deleteUserAccount.password,
        delete: deleteUserAccount.confirm,
    }

    log("API Request: deleteUserAccount");
    axiosClient().post(`/api/v3/users/current/account`, JSON.stringify(requestBody))
        .then((response) => {
            if (response?.status !== 200) {
                return Promise.reject(response);
            }

            log(response?.status);
            log(response?.data);
            completed(true);
        })

        .catch((error) => {
            console.error(`Failed to delete user account Error: ${error}`)
            completed(false);
        })
}

export function wipeUserSessions(completed: (wasSuccess: boolean) => void) {
    log("API Request: wipeUserSessions");
    axiosClient().post(`/api/v3/users/wipe/sessions`)
        .then((response) => {
            if (response?.status !== 200) {
                return Promise.reject(response);
            }

            log(response?.status);
            log(response?.data);
            completed(true);
        })

        .catch((error) => {
            console.error(`Failed to wipe user sessions Error: ${error}`)
            completed(false);
        })
}

export function getPanelUserSettings(report: (wasSuccess: boolean, panelUserSettings: IPanelSettings) => void) {
    log("API Request: getPanelUserSettings");
    axiosClient().get(`/api/v3/panel/account/current/settings`)
        .then((response) => {
            if (response?.status !== 200) {
                return Promise.reject(response);
            }

            log(response?.status);
            log(response?.data);
            return response?.data ?? [];
        })
        .then((rawResponse) => {
            return rawResponse as IGetPanelUserSettingsResponse;
        })
        .then((data) => {
            let userSettings: IPanelSettings = {
                amountOfConsoleLines: data.amountOfConsoleLines,
                consoleRefreshRate: data.consoleRefreshRate,
                panelTheme: data.panelTheme,
                serverRefreshRate: data.serverRefreshRate,
                enableAutomaticConsoleScrolling: data.enableAutomaticConsoleScrolling,
                enableConsoleChatMode: data.enableConsoleChatMode,
                enableDebugging: data.enableDebugging,
                lastModifiedAt: data.lastModifiedAt
            }

            report(true, userSettings);
        })

        .catch((error) => {
            console.error(`Failed to get panel user settings. Error: ${error}`)
            //@ts-ignore 
            report(false, null);
        })
}

export function editPanelSettings(updatedSettings: IEditPanelSettings, completed: (wasSuccess: boolean) => void) {
    //formulate proper request
    var requestBody: IEditPanelSettingsRequest = {
        amountOfConsoleLines: updatedSettings.amountOfConsoleLines,
        consoleRefreshRate: updatedSettings.consoleRefreshRate,
        panelTheme: updatedSettings.panelTheme,
        serverRefreshRate: updatedSettings.serverRefreshRate,
        enableAutomaticConsoleScrolling: updatedSettings.enableAutomaticConsoleScrolling,
        enableConsoleChatMode: updatedSettings.enableConsoleChatMode,
        enableDebugging: updatedSettings.enableDebugging
    }

    log("API Request: editPanelSettings");
    axiosClient().put(`/api/v3/panel/account/current/settings`, JSON.stringify(requestBody))
        .then((response) => {
            if (response?.status !== 200) {
                return Promise.reject(response);
            }

            log(response?.status);
            log(response?.data);
            completed(true);
        })

        .catch((error) => {
            console.error(`Failed to edit panel user settings. Error: ${error}`)
            completed(false);
        })
}

export function uploadUserAvatar(base64: string, completed: (wasSuccess: boolean) => void) {
    //formulate proper request
    var requestBody: IUserAvatarRequest = {
        image: base64
    }

    log("API Request: uploadUserAvatar");
    axiosClient().post(`/api/v3/panel/account/current/avatar`, JSON.stringify(requestBody))
        .then((response) => {
            if (response?.status !== 200) {
                return Promise.reject(response);
            }

            log(response?.status);
            log(response?.data);
            completed(true);
        })
        .catch((error) => {
            console.error(`Failed to upload user avatar Error: ${error}`)
            completed(false);
        })
}

export function getBackups(serverId: string, report: (backups: Backup[]) => void, completed: (wasSuccess: boolean) => void): void {
    log("API Request: getBackups");
    axiosClient().get(`/api/v3/servers/${serverId}/backups`)
        .then((response) => {
            if (response?.status !== 200) {
                return Promise.reject(response);
            }

            log(response?.status);
            log(response?.data);
            return response?.data ?? [];
        })
        .then((backups) => {
            report(backups ?? []);
            completed(true);
        })
        .catch((error) => {
            console.error(`Failed to fetch backups Error: ${error}`)
            completed(false);
        })
}

export function getBackupStats(serverId: string, report: (stats: IBackupStats) => void, completed: (wasSuccess: boolean) => void): void {
    log("API Request: getBackupStats");
    axiosClient().get(`/api/v3/servers/${serverId}/backups/stats`)
        .then((response) => {
            if (response?.status !== 200) {
                return Promise.reject(response);
            }

            log(response?.status);
            log(response?.data);
            return response?.data ?? [];
        })
        .then((stats) => {
            report(stats);
            completed(true);
        })
        .catch((error) => {
            console.error(`Failed to fetch backup stats Error: ${error}`)
            completed(false);
        })
}

export function getBackupDetails(serverId: string, backupId: string, report: (wasSuccess: boolean, backupDetails: IBackupDetails) => void) {
    log("API Request: getBackup");
    axiosClient().get(`/api/v3/servers/${serverId}/backups/${backupId}`)
        .then((response) => {
            if (response?.status !== 200) {
                return Promise.reject(response);
            }

            log(response?.status);
            log(response?.data);
            return response?.data ?? [];
        })
        .then((backupDetails) => {
            report(true, backupDetails);
        })

        .catch((error) => {
            console.error(`Failed to get backup with id: ${backupId} Error: ${error}`)
            //@ts-ignore 
            report(false, null);
        })
}

export function editBackup(serverId: string, backupId: string, backupSettings: IEditBackup, report: (wasSuccess: boolean) => void) {
    log("API Request: editServer");

    // this solves some incorrect formatting of arrays
    backupSettings.fileBlacklist = backupSettings.fileBlacklist.map(a => a);
    backupSettings.folderBlacklist = backupSettings.folderBlacklist.map(a => a);

    axiosClient().put(`/api/v3/servers/${serverId}/backups/${backupId}`, JSON.stringify(backupSettings))
        .then((response) => {
            if (response?.status !== 200) {
                return Promise.reject(response);
            }
            log(response?.status);
            log(response?.data);
            report(true);
        })

        .catch((error) => {
            console.error(`Failed to save settings of backup with id: ${backupId} Error: ${error}`)
            report(false);
        })
}

export function runBackup(serverId: string, backupId: string, completed: (wasSuccess: boolean) => void) {
    log("API Request: runBackup");
    axiosClient().post(`/api/v3/servers/${serverId}/backups/${backupId}`,)
        .then((response) => {
            if (response?.status !== 200) {
                return Promise.reject(response);
            }

            log(response?.status);
            log(response?.data);
            completed(true);
        })

        .catch((error) => {
            console.error(`Failed to run backup with Error: ${error}`)
            completed(false);
        })
}

export function createBackup(serverId: string, newBackup: INewBackup, completed: (wasSuccess: boolean) => void) {
    //formulate proper request
    var requestBody: ICreateBackupRequest = {
        name: newBackup.name,
        destination: newBackup.destination,
        suspend: newBackup.suspend,
        deleteOldBackups: newBackup.deleteOldBackups,
        compression: newBackup.compression,
        runBackupAfterCreation: newBackup.runBackupAfterCreation,
        // this solves some incorrect formatting of arrays
        fileBlacklist: newBackup.fileBlacklist.map(a => a),
        folderBlacklist: newBackup.folderBlacklist.map(a => a)
    }

    log("API Request: createBackup");
    axiosClient().post(`/api/v3/servers/${serverId}/backups`, JSON.stringify(requestBody))
        .then((response) => {
            if (response?.status !== 201) {
                return Promise.reject(response);
            }

            log(response?.status);
            log(response?.data);
            completed(true);
        })

        .catch((error) => {
            console.error(`Failed to create backup: ${newBackup.name} Error: ${error}`)
            completed(false);
        })
}

export function deleteBackup(serverId: string, backupId: string, completed: (wasSuccess: boolean) => void) {
    log("API Request: deleteBackup");
    axiosClient().delete(`/api/v3/servers/${serverId}/backups/${backupId}`,)
        .then((response) => {
            if (response?.status !== 200) {
                return Promise.reject(response);
            }

            log(response?.status);
            log(response?.data);
            completed(true);
        })

        .catch((error) => {
            console.error(`Failed to delete backup with Error: ${error} `)
            completed(false);
        })
}

export function getBackupHistory(serverId: string, report: (backups: BackupHistory[]) => void, completed: (wasSuccess: boolean) => void): void {
    log("API Request: getBackupHistory");
    axiosClient().get(`/api/v3/servers/${serverId}/backups/history`)
        .then((response) => {
            if (response?.status !== 200) {
                return Promise.reject(response);
            }

            log(response?.status);
            log(response?.data);
            return response?.data ?? [];
        })
        .then((backups) => {
            report(backups ?? []);
            completed(true);
        })
        .catch((error) => {
            console.error(`Failed to fetch backups with error: ${error} `)
            completed(false);
        })
}

export function deleteBackupHistory(serverId: string, completed: (wasSuccess: boolean) => void) {
    log("API Request: deleteBackupHistory");
    axiosClient().post(`/api/v3/servers/${serverId}/backups/history/clear`,)
        .then((response) => {
            if (response?.status !== 200) {
                return Promise.reject(response);
            }

            log(response?.status);
            log(response?.data);
            completed(true);
        })

        .catch((error) => {
            console.error(`Failed to delete backup history Error: ${error} `)
            completed(false);
        })
}

export function getSchedulerTasks(serverId: string, report: (backups: ISchedulerTask[]) => void, completed: (wasSuccess: boolean) => void): void {
    log("API Request: getSchedulerTasks");
    axiosClient().get(`/api/v3/scheduler/${serverId}/tasks`)
        .then((response) => {
            if (response?.status !== 200) {
                return Promise.reject(response);
            }

            log(response?.status);
            log(response?.data);
            return response?.data ?? [];
        })

        .then((rawData) => {
            let tasks: ISchedulerTask[] = [];
            rawData.forEach((data: any) => {
                tasks.push(translateRawSchedulerResponse(data));
            });

            report(tasks);
            completed(true);
        })
        .catch((error) => {
            console.error(`Failed to fetch Scheduler Tasks Error: ${error}`)
            completed(false);
        })
}

export function getSchedulerDetails(serverId: string, report: (details: ISchedulerDetails) => void, completed: (wasSuccess: boolean) => void): void {
    log("API Request: getSchedulerDetails");
    axiosClient().get(`/api/v3/scheduler/${serverId}`)
        .then((response) => {
            if (response?.status !== 200) {
                return Promise.reject(response);
            }

            log(response?.status);
            log(response?.data);
            return response?.data ?? [];
        })
        .then((details) => {
            report(details);
            completed(true);
        })
        .catch((error) => {
            console.error(`Failed to fetch scheduler details Error: ${error}`)
            completed(false);
        })
}

export function getSchedulerTaskDetails(serverId: string, taskId: string, report: (wasSuccess: boolean, taskDetails: ISchedulerTask) => void) {
    log("API Request: getSchedulerTaskDetails");
    axiosClient().get(`/api/v3/scheduler/${serverId}/tasks/${taskId}`)
        .then((response) => {
            if (response?.status !== 200) {
                return Promise.reject(response);
            }

            log(response?.status);
            log(response?.data);
            return response?.data ?? [];
        })
        .then((rawData) => {
            report(true, translateRawSchedulerResponse(rawData));
        })

        .catch((error) => {
            console.error(`Failed to get task with id: ${taskId} Error: ${error}`)
            //@ts-ignore 
            report(false, null);
        })
}

export function editSchedulerTask(serverId: string, taskId: string, updatedTask: IEditSchedulerTask, report: (wasSuccess: boolean) => void) {
    log("API Request: editSchedulerTask");

    //formulate proper request
    var requestBody: IUpdateSchedulerTaskRequest = {
        name: updatedTask.name,
        enabled: updatedTask.enabled,
        playerRequirement: updatedTask.playerRequirement,
        trigger: updatedTask.trigger,
        jobs: updatedTask.jobs
    }

    axiosClient().put(`/api/v3/scheduler/${serverId}/tasks/${taskId}`, JSON.stringify(updatedTask))
        .then((response) => {
            if (response?.status !== 200) {
                return Promise.reject(response);
            }
            log(response?.status);
            log(response?.data);
            report(true);
        })

        .catch((error) => {
            console.error(`Failed to save scheduler task with id: ${taskId} Error: ${error}`)
            report(false);
        })
}

export function runSchedulerTask(serverId: string, taskId: string, completed: (wasSuccess: boolean) => void) {
    log("API Request: runSchedulerTask");

    axiosClient().post(`/api/v3/scheduler/${serverId}/tasks/${taskId}`)
        .then((response) => {
            if (response?.status !== 200) {
                return Promise.reject(response);
            }

            log(response?.status);
            log(response?.data);
            completed(true);
        })

        .catch((error) => {
            console.error(`Failed to run scheduler task with Error: ${error}`)
            completed(false);
        })
}

export function createSchedulerTask(serverId: string, newTask: INewSchedulerTask, completed: (wasSuccess: boolean) => void) {
    log("API Request: createSchedulerTask");

    //formulate proper request
    var requestBody: ICreateSchedulerTaskRequest = {
        name: newTask.name,
        enabled: newTask.enabled,
        playerRequirement: newTask.playerRequirement,
        trigger: newTask.trigger,
        jobs: newTask.jobs
    }

    axiosClient().post(`/api/v3/scheduler/${serverId}/tasks`, JSON.stringify(requestBody))
        .then((response) => {
            if (response?.status !== 201) {
                return Promise.reject(response);
            }

            log(response?.status);
            log(response?.data);
            completed(true);
        })

        .catch((error) => {
            console.error(`Failed to create scheduler task: ${newTask.name} Error: ${error}`)
            completed(false);
        })
}

export function deleteSchedulerTask(serverId: string, taskId: string, completed: (wasSuccess: boolean) => void) {
    log("API Request: deleteSchedulerTask");
    axiosClient().delete(`/api/v3/scheduler/${serverId}/tasks/${taskId}`)
        .then((response) => {
            if (response?.status !== 200) {
                return Promise.reject(response);
            }

            log(response?.status);
            log(response?.data);
            completed(true);
        })

        .catch((error) => {
            console.error(`Failed to delete scheduler task with Error: ${error} `)
            completed(false);
        })
}

export function getApiKeys(report: (apiKey: IApiKey[]) => void, completed: (wasSuccess: boolean) => void): void {
    log("API Request: getApiKeys");
    axiosClient().get(`/api/v3/apikeys`)
        .then((response) => {
            if (response?.status !== 200) {
                return Promise.reject(response);
            }

            log(response?.status);
            log(response?.data);
            return response?.data ?? [];
        })
        .then((rawResponse) => {
            return rawResponse as IGetApiKeyListResponse;
        })
        .then((data) => {
            let apiKeys: IApiKey[] = [];
            data.forEach((data: any) => {
                let apiKey: IApiKey = {
                    apiKeyId: data.apiKeyId,
                    name: data.name,
                    isAdmin: data.isAdmin,
                    hasAccessToAllServers: data.hasAccessToAllServers,
                    serverAccessDetails: new ServerAccessDetails(),
                    createdAt: data.createdAt,
                }
                apiKey.serverAccessDetails.init(data.hasAccessToAllServers, data.customServerPermissions);
                apiKeys.push(apiKey);
            });

            report(apiKeys);
            completed(true);
        })

        .catch((error) => {
            console.error(`Failed to fetch API Keys with error: ${error}`)
            completed(false);
        })
}

export function createApiKey(newApiKey: INewApiKey, completed: (wasSuccess: boolean, plainTextApiKey: string) => void) {
    //formulate proper request
    var requestBody: ICreateApiKeyRequest = {
        name: newApiKey.name,
        isAdmin: newApiKey.isAdmin,
        hasAccessToAllServers: newApiKey.serverAccessDetails.hasAccessToAllServers,
        customServerPermissions: {}
    }

    ServerAccessDetails.UpdatePermissionTargetObject(newApiKey.serverAccessDetails, requestBody);

    log("API Request: createApiKey");
    axiosClient().post(`/api/v3/apikeys`, JSON.stringify(requestBody))
        .then((response) => {
            if (response?.status !== 201) {
                return Promise.reject(response);
            }

            log(response?.status);
            // don't log the key!
            // log(response?.data);
            return response?.data ?? [];
        })
        .then((rawData) => {
            completed(true, rawData.apiKey);
        })
        .catch((error) => {
            console.error(`Failed to create API Key: ${newApiKey.name} Error: ${error}`)
            completed(false, "");
        })
}

export function deleteApiKey(apiKeyId: string, completed: (wasSuccess: boolean) => void): void {
    log("API Request: deleteApiKey");
    axiosClient().delete(`/api/v3/apikeys/${apiKeyId}`)
        .then((response) => {
            if (response?.status !== 200) {
                return Promise.reject(response);
            }

            log(response?.status);
            log(response?.data);
            completed(true);
        })

        .catch((error) => {
            console.error(`Failed to delete API Key with id ${apiKeyId} Error: ${error}`)
            completed(false);
        })
}

export function getWebhooks(report: (webhooks: IWebhook[]) => void, completed: (wasSuccess: boolean) => void): void {
    log("API Request: getWebhooks");
    axiosClient().get(`/api/v3/webhooks`)
        .then((response) => {
            if (response?.status !== 200) {
                return Promise.reject(response);
            }

            log(response?.status);
            log(response?.data);
            return response?.data ?? [];
        })
        .then((rawResponse) => {
            return rawResponse as IRawGetWebhookListResponse;
        })
        .then((rawData) => {
            let webhooks: IWebhook[] = [];
            rawData.forEach((data: any) => {
                webhooks.push(data);
            });

            report(webhooks);
            completed(true);
        })

        .catch((error) => {
            console.error(`Failed to fetch API Keys with error: ${error}`)
            completed(false);
        })
}

export function getWebhookDetails(WebhookId: string, report: (wasSuccess: boolean, webhook: IWebhook) => void) {
    log("API Request: getWebhookDetails");
    axiosClient().get(`/api/v3/webhooks/${WebhookId}`)
        .then((response) => {
            if (response?.status !== 200) {
                return Promise.reject(response);
            }

            log(response?.status);
            log(response?.data);
            return response?.data ?? [];
        })
        .then((response) => {
            return response as IRawGetWebhookResponse;
        })
        .then((rawResponse) => {
            let webhook: IWebhook = {
                webhookId: rawResponse.webhookId,
                name: rawResponse.name,
                url: rawResponse.url,
                enabled: rawResponse.enabled,
                messageFormat: rawResponse.messageFormat,
                optionalHeaders: rawResponse.optionalHeaders,
                webhookTriggers: rawResponse.webhookTriggers.map((key: number) => WebhookTrigger[key]),
                createdAt: rawResponse.createdAt,
                lastModifiedAt: rawResponse.lastModifiedAt,
            };

            report(true, webhook);
        })

        .catch((error) => {
            console.error(`Failed to get webhook with id: ${WebhookId} Error: ${error}`)
            //@ts-ignore 
            report(false, null);
        })
}

export function createWebhook(newWebhook: INewWebhook, completed: (wasSuccess: boolean) => void) {
    //formulate proper request
    var requestBody: ICreateWebhookRequest = {
        name: newWebhook.name,
        url: newWebhook.url,
        enabled: newWebhook.enabled,
        messageFormat: newWebhook.messageFormat,
        webhookTriggers: newWebhook.webhookTriggers,
        optionalHeaders: convertWebhookHeaderArrayToObject(newWebhook.optionalHeaders),
    }

    log("API Request: createWebhook");
    axiosClient().post(`/api/v3/webhooks`, JSON.stringify(requestBody))
        .then((response) => {
            if (response?.status !== 201) {
                return Promise.reject(response);
            }

            log(response?.status);
            log(response?.data);
            return response?.data ?? [];
        })
        .then((rawData) => {
            completed(true);
        })
        .catch((error) => {
            console.error(`Failed to create Webhook: ${newWebhook.name} Error: ${error}`)
            completed(false);
        })
}


export function editWebhooks(webhookId: string, editedWebhook: IEditWebhook, report: (wasSuccess: boolean) => void) {
    //formulate proper request
    var requestBody: IUpdateWebhookRequest = {
        name: editedWebhook.name,
        url: editedWebhook.url,
        enabled: editedWebhook.enabled,
        messageFormat: editedWebhook.messageFormat,
        webhookTriggers: editedWebhook.webhookTriggers,
        optionalHeaders: convertWebhookHeaderArrayToObject(editedWebhook.optionalHeaders),
    }

    log("API Request: editWebhooks");
    axiosClient().put(`/api/v3/webhooks/${webhookId}`, JSON.stringify(requestBody))
        .then((response) => {
            if (response?.status !== 200) {
                return Promise.reject(response);
            }
            log(response?.status);
            log(response?.data);
            report(true);
        })

        .catch((error) => {
            console.error(`Failed to save settings of webhook with id: ${webhookId} Error: ${error}`)
            report(false);
        })
}

export function deleteWebhook(webhookId: string, completed: (wasSuccess: boolean) => void) {
    log("API Request: deleteWebhook");
    axiosClient().delete(`/api/v3/webhooks/${webhookId}`,)
        .then((response) => {
            if (response?.status !== 200) {
                return Promise.reject(response);
            }

            log(response?.status);
            log(response?.data);
            completed(true);
        })

        .catch((error) => {
            console.error(`Failed to delete webhook with Error: ${error} `)
            completed(false);
        })
}