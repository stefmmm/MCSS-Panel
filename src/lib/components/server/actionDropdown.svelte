<script lang="ts">
	import { get } from 'svelte/store';
	import { clickOutside } from '$lib/code/shared';
	import { postServerAction } from '$lib/code/api';
	import Icon from '../elements/icon.svelte';
	import { mdiMenuDown } from '@mdi/js';
	import { selectedServerId } from '$lib/code/global';
	import { ServerAction } from '$lib/code/server';

	export let statusName: string;

	let dropdownVisible: boolean = false;

	function toggleDropdown() {
		dropdownVisible = !dropdownVisible;
	}

	function handleClickOutside() {
		dropdownVisible = false;
	}

	function serverActionClick(action: any) {
		dropdownVisible = false;
		const serverId = get(selectedServerId);
		if (!serverId) {
			return;
		}
		postServerAction(serverId, action);
	}
</script>

<div class="relative" use:clickOutside on:click_outside={handleClickOutside}>
	<button on:click={toggleDropdown} aria-controls="dropdown" aria-expanded={dropdownVisible} class="inline-flex justify-center items-center group p-[7px] rounded-lg bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-700 dark:focus:ring-blue-500">
		<div class="flex items-center truncate text-zinc-100">
			<span class="truncate ml-2 text-xs font-medium uppercase">{statusName}</span>
			<Icon data={mdiMenuDown} size={5} />
		</div>
	</button>

	<!-- FUTURE add some colors here -->
	{#if dropdownVisible}
		<div id="dropdown" class="absolute top-full z-20 right-0 min-w-44 py-1.5 mt-1 rounded-lg overflow-hidden shadow-lg divide-gray-150 dark:divide-gray-500 bg-white dark:bg-gray-600">
			<ul class="w-28 text-gray-700 dark:text-gray-200">
				{#each Object.values(ServerAction).filter((element) => typeof element === 'number') as action}
					<li>
						<button on:click={() => serverActionClick(action)} class="flex w-full py-1 px-3 text-sm capitalize hover:bg-gray-100 dark:hover:bg-gray-500">{ServerAction[action]}</button>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>
