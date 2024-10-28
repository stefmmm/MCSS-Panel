import { persisted } from 'svelte-local-storage-store'
import { get } from 'svelte/store';
import { Page, baseUrl, navigateToPage } from '$lib/code/routing';
import { settings } from '$lib/code/storage';
import { getPanelUserSettings } from './api';
import { PanelTheme, type IPanelSettings } from './panel';

export enum LoginFailureReason {
    Unauthorized,
    Network,
    Unknown
}

export const auth = persisted('user', {
    apiKey: '',
    showAdminFeatures: false,
    sharedAccessSignature: '',
    userId: '',
    username: '',
    userJoinDate: 0,
})

export let username: string = get(auth).username;

export function login(username: string, password: string, report: (failureReason: LoginFailureReason) => void): void {
    const request = new Request(`${baseUrl}/panelbackend/auth/login`, {
        method: `POST`,
        body: JSON.stringify({ username: username, password: password }),
        headers: new Headers({ 'content-type': 'application/json' }),
    });

    fetch(request)
        .then((response) => {
            if (response.status !== 200) {
                return Promise.reject(response);
            }

            return response.json();
        })
        .then((data) => {
            auth.set({
                apiKey: data.apiKey,
                showAdminFeatures: data.isAdmin,
                sharedAccessSignature: data.sharedAccessSignature,
                userId: data.userId,
                username: data.username,
                userJoinDate: data.userJoinDate
            });

            getPanelUserSettings((wasSuccess: boolean, fetchedSettings: IPanelSettings) => {
                if (wasSuccess) {
                    // check against empty C# DateTime
                    if (fetchedSettings.lastModifiedAt.toString() == '0001-01-01T00:00:00') {
                        setDefaultSettings();
                    } else {
                        settings.set({
                            serversRefreshRate: fetchedSettings.serverRefreshRate,
                            consoleRefreshRate: fetchedSettings.consoleRefreshRate,
                            autoScrollConsole: fetchedSettings.enableAutomaticConsoleScrolling,
                            chatModeConsole: fetchedSettings.enableConsoleChatMode,
                            amountOfConsoleLines: fetchedSettings.amountOfConsoleLines,
                            reverseConsoleLines: false,
                            panelTheme: fetchedSettings.panelTheme,
                            debugging: fetchedSettings.enableDebugging,
                            loadedSuccessfully: true
                        })
                    }

                } else {
                    confirm(`Unable to fetch users settings, reverting to default.`);
                    setDefaultSettings();
                }
            });

            navigateToPage(Page.Servers);
        })
        .catch((error) => {
            if (error.status === 401) {
                report(LoginFailureReason.Unauthorized);
            } else if (error.status === 500) {
                report(LoginFailureReason.Unknown);
            } else {
                report(LoginFailureReason.Network);
            }
        });
}

export function logout() {
    auth.set({
        apiKey: '',
        showAdminFeatures: false,
        sharedAccessSignature: '',
        userId: '',
        username: '',
        userJoinDate: 0
    });
}


function setDefaultSettings() {
    settings.set({
        serversRefreshRate: 5,
        consoleRefreshRate: 5,
        autoScrollConsole: true,
        chatModeConsole: false,
        amountOfConsoleLines: 50,
        reverseConsoleLines: false,
        panelTheme: PanelTheme.Light,
        debugging: false,
        loadedSuccessfully: false
    })
}
