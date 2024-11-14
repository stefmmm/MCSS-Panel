<script lang="ts">
	import { onDestroy, beforeUpdate, afterUpdate, onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { browser } from '$app/environment';
	import { settings } from '$lib/code/storage';
	import { GetConsoleStream, getServerConsole, postServerCommand } from '$lib/code/api';
	import { hasPermission, Permission } from '$lib/code/permissions';
	import { mdiChat, mdiRefresh, mdiSend, mdiArrowVerticalLock, mdiTextBoxRemove } from '@mdi/js';
	import Icon from '../elements/icon.svelte';
	import { Popover } from 'flowbite-svelte';
	import { selectedServerId } from '$lib/code/global';
	import { SSE } from 'sse.js';
	import XTerminal from '$lib/code/xTerminal';

	export let fillScreen: boolean = false;

	export function refreshConsole() {
		reloadConsole();
	}

	let sseClient: SSE;
	let term: XTerminal;
	let loadingConsole: boolean;
	let consoleInput: string;
	let textarea: HTMLTextAreaElement;
	let consoleRequiresUpdate: boolean;

	if (browser) {
		async function subscribe() {
			console.log('Subscribing from console stream.');
			const serverId = get(selectedServerId);
			term = new XTerminal(document.getElementById('xterm') as HTMLDivElement);

			sseClient = GetConsoleStream(serverId);
			sseClient.addEventListener('message', function (e: any) {
				term.push(e.data);
				scrollToBottomIfAllowed();
			});

			sseClient.addEventListener('abort', function (e: any) {
				console.warn('Console stream closed.');
			});
		}

		function unsubscribe() {
			console.log('Unsubscribing from console stream.');
			sseClient?.close();
		}

		onMount(subscribe);
		onDestroy(unsubscribe);
	}

	beforeUpdate(() => {
		consoleRequiresUpdate = textarea && textarea.offsetHeight + textarea.scrollTop > textarea.scrollHeight - 20;
	});

	afterUpdate(() => {
		if (consoleRequiresUpdate) {
			scrollToBottomIfAllowed();
		}
	});

	async function reloadConsole() {
		const serverId = get(selectedServerId);
		if (!serverId) {
			return;
		}

		loadingConsole = true;

		getServerConsole(
			serverId,
			(consoleLines: string[]) => {
				term.update(consoleLines);
				scrollToBottomIfAllowed();
			},
			(wasSuccess: boolean) => {
				loadingConsole = false;
			}
		);
	}

	function sendCommand() {
		const serverId = get(selectedServerId);
		if (!consoleInput || !serverId) {
			return;
		}

		postServerCommand(serverId, consoleInput);
		consoleInput = '';
	}

	function scrollToBottomIfAllowed() {
		if (get(settings).autoScrollConsole) {
			term.scroll();
		}
	}

	function clearConsole() {
		term.clear();
	}

	function toggleChatMode() {
		$settings.chatModeConsole = !get(settings).chatModeConsole;
	}

	function toggleAutoScroll() {
		$settings.autoScrollConsole = !get(settings).autoScrollConsole;
	}
</script>

<div class="w-full border border-b-0 border-gray-200 rounded-b-none rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
	<div class="flex items-center justify-between px-3 py-2">
		<div class="flex flex-wrap items-center divide-gray-200 sm:divide-x dark:divide-gray-600">
			<div class="flex items-center space-x-1 sm:pr-4">
				<h2 class="font-semibold text-gray-700 dark:text-gray-300">Console</h2>
				<button on:click={reloadConsole} disabled={loadingConsole} class="p-2 text-gray-500 rounded cursor-pointer hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-600 disabled:text-zinc-800 disabled:pointer-events-none">
					<Icon data={mdiRefresh} size={5} class={loadingConsole ? 'animate-spin' : ''} />
				</button>
			</div>
		</div>
		<div class="flex items-center text-xs space-x-2">
			<form on:submit|preventDefault={toggleAutoScroll}>
				<button id="autoScrollPopup" type="submit" class="p-2 text-gray-500 rounded-lg cursor-pointer hover:text-gray-900 hover:bg-gray-100 {$settings.autoScrollConsole ? 'text-gray-400 dark:text-gray-400' : 'text-red-400 dark:text-red-400'}  dark:hover:bg-gray-600">
					<Icon data={mdiArrowVerticalLock} size={6} />
					<span class="sr-only">Auto Scroll</span>
				</button>
			</form>

			<form on:submit|preventDefault={clearConsole}>
				<button id="clearConsole" type="submit" class="p-2 text-gray-500 rounded-lg cursor-pointer hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-red-500">
					<Icon data={mdiTextBoxRemove} size={6} />
					<span class="sr-only">Clear Console</span>
				</button>
			</form>
		</div>
	</div>
	<div class="bg-white dark:bg-gray-800 pl-3 pt-3">
		<div id="xterm" style="width: 99%;" class="block {fillScreen ? 'h-[calc(100vh-275px)]' : 'h-96'} font-consolas text-sm text-gray-800 bg-white border-0 dark:bg-gray-800 focus:ring-0 dark:text-white dark:placeholder-gray-400"></div>
	</div>

	<Popover arrow={false} triggeredBy="[id^='autoScrollPopup']" placement="bottom" class="w-64 text-sm font-light " title="Auto Scroll {$settings.autoScrollConsole ? 'Enabled (default)' : 'Disabled'}">Automatically scroll the console to the latest message.</Popover>
	<Popover arrow={false} triggeredBy="[id^='clearConsole']" placement="bottom" class="w-64 text-sm font-light text-red-500" title="Clear Console">Wipe all text from the console (current session).</Popover>
</div>

{#if hasPermission(Permission.useConsole, $selectedServerId)}
	<form on:submit|preventDefault={sendCommand} class="">
		<div class="flex items-center px-3 py-2 border rounded-b-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
			<form on:submit|preventDefault={toggleChatMode}>
				<button id="placement-right" type="submit" class="p-2 text-gray-500 rounded-lg cursor-pointer hover:text-gray-900 hover:bg-gray-100 {$settings.chatModeConsole ? 'text-green-400 dark:text-green-400  ' : 'text-gray-400 dark:text-gray-400  '}  dark:hover:bg-gray-600">
					<Icon data={mdiChat} size={6} />
					<span class="sr-only">Chat mode</span>
				</button>
			</form>
			<Popover triggeredBy="[id^='placement-']" placement="right" class="w-64 text-sm font-light " title="Chat Mode {$settings.chatModeConsole ? 'Enabled' : 'Disabled (default)'}">Talk a lot? Automatically convert your console input to the /say format.</Popover>
			<input
				bind:value={consoleInput}
				id="console-input"
				type="text"
				placeholder="Enter command e.g. /say hello"
				class="block mx-4 p-2.5 w-full text-sm text-gray-900 bg-white rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
			/>
			<button type="submit" class="inline-flex justify-center p-2 text-blue-600 rounded-lg cursor-pointer hover:bg-blue-100 dark:text-blue-500 dark:hover:bg-gray-600">
				<Icon data={mdiSend} size={6} />
				<span class="sr-only">Send Message</span>
			</button>
		</div>
	</form>
{/if}

<!--TODO add saved commands here-->