<script lang="ts">
	import { hasPermission, Permission } from '$lib/code/permissions';
	import ConsoleComponent from '$lib/components/server/console.svelte';
	import { selectedServerId } from '$lib/code/global';
	import ServerSelector from '$lib/components/server/serverSelector.svelte';
	import { mdiRefresh } from '@mdi/js';
	import Icon from '$lib/components/elements/icon.svelte';

	let consoleComponent: any;

	function handleRefreshButton() {
		consoleComponent.refreshConsole();
	}
</script>

<svelte:head>
	<title>MCSS Remote Panel | Dashboard</title>
</svelte:head>

<!-- FUTURE implement console stream version -->

<section class="h-[calc(100vh-56px)] overflow-auto p-6 dark:bg-gray-900 dark:text-white">
	<ServerSelector>
		<div class="self-center">
			<button
				type="button"
				on:click={handleRefreshButton}
				class="px-3 py-1.5 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none hover:bg-gray-100 hover:text-blue-700 focus:z-10 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700 focus:ring-2 focus:ring-blue-700 dark:focus:ring-blue-500"
			>
				<Icon data={mdiRefresh} size={5} />
			</button>
			<span class="sr-only">Reload Console</span>
		</div>
	</ServerSelector>

	{#key $selectedServerId}
		{#if $selectedServerId}
			{#if hasPermission(Permission.viewConsole, $selectedServerId)}
				<ConsoleComponent bind:this={consoleComponent} fillScreen={true} />
			{:else}
				<p>You don't have permission to view the console.</p>
			{/if}
		{:else}
			<div class="text-center">
				<span class="text-sm font-medium italic text-slate-400">No server selected.</span>
			</div>
		{/if}
	{/key}
</section>
