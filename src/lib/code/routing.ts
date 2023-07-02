import { persisted } from 'svelte-local-storage-store';
import { Page } from '../../types';

// used for testing purposes
export const baseUrl = '';

export const selectedPage = persisted('selectedPage', Page.Dashboard);
export const selectedPageProps = persisted('selectedPageProps', null);

export function navigateToPage(pageName: Page) {
export function navigateToPage(pageName: Page, props: any = null) {
    selectedPage.set(pageName);

    if (props) {
        selectedPageProps.set(props);
    }
}
