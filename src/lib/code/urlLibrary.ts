import { auth } from '$lib/code/auth';
import { get } from 'svelte/store';
import { baseUrl } from "./routing";

export enum Url {
    Contribute = "https://mcserversoft.com/donate",
    Website = "https://mcserversoft.com",
    Documentation = "https://mcserversoft.com/documentation",
    DocumentationPanel = "https://url.mcserversoft.com/WebPanelDocs",
    DocumentationApi = "https://url.mcserversoft.com/WebApiDocs",
    DocumentationAdminApi = "https://url.mcserversoft.com/AdminPermissionsDocs",
    DocumentationCustomZipFileFormat = "https://url.mcserversoft.com/BackupCustomZipFormatDocs",
}

export function getUrl(url: Url) {
    return url.toString();
}

export function getURLToCurrentUserAvatar(): string {
    return `${baseUrl}/panelbackend/users/${get(auth).userId}/avatar?sasKey=${get(auth).sharedAccessSignature}`;
}
