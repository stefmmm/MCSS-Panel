<script lang="ts">
	import { Button, Modal } from 'flowbite-svelte';
	import Icon from '../elements/icon.svelte';
	import { mdiArrowULeftTop, mdiContentSave } from '@mdi/js';
	import Spinner from '../elements/spinner.svelte';
	import { isLoadingServers, servers } from '$lib/code/global';
	import type { ServerAccessDetails } from '$lib/code/permissions';

	export let serverAccessDetails: ServerAccessDetails;

	let permissionSelection: string[] = [];
	let serverSelection: string[] = [];
	let showCustomServersModal: boolean = false;

	function loadModalData() {
		serverSelection = serverAccessDetails?.getServerIds();
		permissionSelection = serverAccessDetails?.getServerPermissionIds();
	}

	function handleModalCustomServersToggle() {
		showCustomServersModal = !showCustomServersModal;
	}

	function handleServerSelection(event: any, serverId: string) {
		let checked = event.target.checked;

		// toggle all
		if (checked) {
			let enabledPermissions: string[] = [];
			enabledPermissions.push(`${serverId}-viewStats`);
			enabledPermissions.push(`${serverId}-viewConsole`);
			enabledPermissions.push(`${serverId}-useConsole`);
			enabledPermissions.push(`${serverId}-useServerActions`);
			enabledPermissions.push(`${serverId}-viewSchedulerTasks`);
			enabledPermissions.push(`${serverId}-createSchedulerTask`);
			enabledPermissions.push(`${serverId}-editSchedulerTask`);
			enabledPermissions.push(`${serverId}-deleteSchedulerTasks`);
			enabledPermissions.push(`${serverId}-triggerSchedulerTask`);

			permissionSelection = permissionSelection.concat(enabledPermissions);
		} else {
			permissionSelection = permissionSelection.filter((s) => !s.startsWith(serverId));
		}
	}

	function handlePermissionInput(event: any, serverId: string) {
		let checked = event.target.checked;

		// check if toggle is first to be checked
		let shouldToggleParent = checked && permissionSelection.filter((s) => s.includes(serverId)).length <= 1 && !serverSelection.includes(serverId);
		if (shouldToggleParent) {
			serverSelection = [...serverSelection, serverId];
		}
	}

	function handleSave() {
		serverAccessDetails.update(serverSelection, permissionSelection, serverAccessDetails.hasAccessToAllServers);
		showCustomServersModal = false;

		//HACK force state update
		serverAccessDetails = serverAccessDetails;
	}

	function handleDiscard() {
		showCustomServersModal = false;
	}
</script>

<p class="block mb-1 text-sm font-medium text-gray-900 dark:text-white">Server Access & Permissions</p>
<p class="mb-3 text-sm text-gray-500 dark:text-gray-400"><slot>Set what servers & permissions this user will be able to use.</slot></p>

<div class="flex space-x-4">
	<div class="flex items-center">
		<input
			id="radio-selection-all"
			name="radio-selection"
			value={true}
			bind:group={serverAccessDetails.hasAccessToAllServers}
			type="radio"
			class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
		/>
		<label for="radio-selection-all" class="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">All</label>
	</div>
	<div class="flex items-center">
		<input
			id="radio-selection-custom"
			name="radio-selection"
			value={false}
			bind:group={serverAccessDetails.hasAccessToAllServers}
			type="radio"
			class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
		/>
		<label for="radio-selection-custom" class="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">Custom ({serverAccessDetails?.getCustomServerCount()})</label>
	</div>
	<div class="flex items-center">
		<form on:submit|preventDefault={handleModalCustomServersToggle}>
			<button type="submit" on:click={loadModalData} class="px-3 py-2 text-xs font-medium text-center text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">Set Servers</button>
		</form>
	</div>
</div>

<!-- FUTURE this has a weird white line in dark mode -->
<Modal bind:open={showCustomServersModal} title="Custom Server Access & Permissions" class="overflow-hidden my-0 sm:my-20">
	<ul class="space-y-3">
		{#each $servers || [] as { serverId, name, description }, index}
			<li class="text-gray-800 bg-gray-50 rounded-lg hover:bg-gray-100 group hover:shadow dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-white border border-gray-200 dark:border-gray-600">
				<label class="flex items-center p-3 text-base font-bold">
					<input
						id="checkbox-custom-server-{index}"
						bind:group={serverSelection}
						on:change={(event) => handleServerSelection(event, serverId)}
						value={serverId}
						type="checkbox"
						class="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:focus:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
					/>
					<label for="checkbox-custom-server-{index}" class="sr-only">checkbox</label>
					<div class="ml-3 w-full pr-9">
						<p class="truncate">{name}</p>
						<p class="text-sm italic font-light truncate">{description ? description : ' No description for this server.'}</p>
					</div>
				</label>

				<ul class="items-center px-3 space-x-3 w-full text-sm font-medium text-gray-900 bg-gray-50 sm:flex dark:bg-gray-700 border border-l-0 border-r-0 border-b-0 border-gray-200 dark:border-gray-600 dark:text-white">
					<li class="w-full border-b border-gray-200 sm:border-b-0 sm:border-r dark:border-gray-600">
						<div class="flex items-center">
							<input
								id="checkbox-permission-view-stats-{index}-{serverId}"
								type="checkbox"
								value="{serverId}-viewStats"
								bind:group={permissionSelection}
								on:change={(event) => handlePermissionInput(event, serverId)}
								class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-700 dark:focus:ring-offset-gray-700 focus:ring-2 dark:bg-gray-600 dark:border-gray-500"
							/>
							<label for="checkbox-permission-view-stats-{index}-{serverId}" class="w-full py-3 ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">View Stats</label>
						</div>
					</li>
					<li class="w-full border-b border-gray-200 sm:border-b-0 sm:border-r dark:border-gray-600">
						<div class="flex items-center">
							<input
								id="checkbox-permission-view-console-{index}-{serverId}"
								type="checkbox"
								value="{serverId}-viewConsole"
								bind:group={permissionSelection}
								on:change={(event) => handlePermissionInput(event, serverId)}
								class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-700 dark:focus:ring-offset-gray-700 focus:ring-2 dark:bg-gray-600 dark:border-gray-500"
							/>
							<label for="checkbox-permission-view-console-{index}-{serverId}" class="w-full py-3 ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">View Console</label>
						</div>
					</li>
					<li class="w-full border-b border-gray-200 sm:border-b-0 sm:border-r dark:border-gray-600">
						<div class="flex items-center">
							<input
								id="checkbox-permission-use-console-{index}-{serverId}"
								type="checkbox"
								value="{serverId}-useConsole"
								bind:group={permissionSelection}
								on:change={(event) => handlePermissionInput(event, serverId)}
								class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-700 dark:focus:ring-offset-gray-700 focus:ring-2 dark:bg-gray-600 dark:border-gray-500"
							/>
							<label for="checkbox-permission-use-console-{index}-{serverId}" class="w-full py-3 ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">Use Console</label>
						</div>
					</li>
					<li class="w-full dark:border-gray-600">
						<div class="flex items-center">
							<input
								id="checkbox-permission-edit-server-{index}-{serverId}"
								type="checkbox"
								value="{serverId}-editServer"
								bind:group={permissionSelection}
								on:change={(event) => handlePermissionInput(event, serverId)}
								class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-700 dark:focus:ring-offset-gray-700 focus:ring-2 dark:bg-gray-600 dark:border-gray-500"
							/>
							<label for="checkbox-permission-edit-server-{index}-{serverId}" class="w-full py-3 ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">Edit Server</label>
						</div>
					</li>
				</ul>

				<ul class="items-center px-3 space-x-3 w-full text-sm font-medium text-gray-900 bg-gray-50 sm:flex dark:bg-gray-700 border border-l-0 border-r-0 border-b-0 border-gray-200 dark:border-gray-600 dark:text-white">
					<li class="w-full border-b border-gray-200 sm:border-b-0 sm:border-r dark:border-gray-600">
						<div class="flex items-center">
							<input
								id="checkbox-permission-use-server-actions-{index}-{serverId}"
								type="checkbox"
								value="{serverId}-useServerActions"
								bind:group={permissionSelection}
								on:change={(event) => handlePermissionInput(event, serverId)}
								class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-700 dark:focus:ring-offset-gray-700 focus:ring-2 dark:bg-gray-600 dark:border-gray-500"
							/>
							<label for="checkbox-permission-use-server-actions-{index}-{serverId}" class="w-full py-3 ml-2 text-sm font-medium text-gray-900 dark:text-gray-300 whitespace-nowrap">Use Server Actions</label>
						</div>
					</li>

					<li class="w-full border-b border-gray-200 sm:border-b-0 sm:border-r dark:border-gray-600">
						<div class="flex items-center">
							<input
								id="checkbox-permission-view-scheduler-tasks-{index}-{serverId}"
								type="checkbox"
								value="{serverId}-viewSchedulerTasks"
								bind:group={permissionSelection}
								on:change={(event) => handlePermissionInput(event, serverId)}
								class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-700 dark:focus:ring-offset-gray-700 focus:ring-2 dark:bg-gray-600 dark:border-gray-500"
							/>
							<label for="checkbox-permission-view-scheduler-tasks-{index}-{serverId}" class="w-full py-3 ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">View Scheduler Tasks</label>
						</div>
					</li>
					<li class="w-full dark:border-gray-600">
						<div class="flex items-center">
							<input
								id="checkbox-permission-create-scheduler-task-{index}-{serverId}"
								type="checkbox"
								value="{serverId}-createSchedulerTask"
								bind:group={permissionSelection}
								on:change={(event) => handlePermissionInput(event, serverId)}
								class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-700 dark:focus:ring-offset-gray-700 focus:ring-2 dark:bg-gray-600 dark:border-gray-500"
							/>
							<label for="checkbox-permission-create-scheduler-task-{index}-{serverId}" class="w-full py-3 ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">Create Scheduler Tasks</label>
						</div>
					</li>
				</ul>

				<ul class="items-center px-3 space-x-3 w-full text-sm font-medium text-gray-900 bg-gray-50 rounded-t-none rounded-lg sm:flex dark:bg-gray-700 border border-l-0 border-r-0 border-b-0 border-gray-200 dark:border-gray-600 dark:text-white">
					<li class="w-full border-b border-gray-200 sm:border-b-0 sm:border-r dark:border-gray-600">
						<div class="flex items-center">
							<input
								id="checkbox-permission-edit-scheduler-task-{index}-{serverId}"
								type="checkbox"
								value="{serverId}-editSchedulerTask"
								bind:group={permissionSelection}
								on:change={(event) => handlePermissionInput(event, serverId)}
								class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-700 dark:focus:ring-offset-gray-700 focus:ring-2 dark:bg-gray-600 dark:border-gray-500"
							/>
							<label for="checkbox-permission-edit-scheduler-task-{index}-{serverId}" class="w-full py-3 ml-2 text-sm font-medium text-gray-900 dark:text-gray-300 whitespace-nowrap">Edit Scheduler Task</label>
						</div>
					</li>

					<li class="w-full border-b border-gray-200 sm:border-b-0 sm:border-r dark:border-gray-600">
						<div class="flex items-center">
							<input
								id="checkbox-permission-delete-scheduler-tasks-{index}-{serverId}"
								type="checkbox"
								value="{serverId}-deleteSchedulerTasks"
								bind:group={permissionSelection}
								on:change={(event) => handlePermissionInput(event, serverId)}
								class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-700 dark:focus:ring-offset-gray-700 focus:ring-2 dark:bg-gray-600 dark:border-gray-500"
							/>
							<label for="checkbox-permission-delete-scheduler-tasks-{index}-{serverId}" class="w-full py-3 ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">Delete Scheduler Tasks</label>
						</div>
					</li>

					<li class="w-full dark:border-gray-600">
						<div class="flex items-center">
							<input
								id="checkbox-permission-trigger-scheduler-task-{index}-{serverId}"
								type="checkbox"
								value="{serverId}-triggerSchedulerTask"
								bind:group={permissionSelection}
								on:change={(event) => handlePermissionInput(event, serverId)}
								class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-700 dark:focus:ring-offset-gray-700 focus:ring-2 dark:bg-gray-600 dark:border-gray-500"
							/>
							<label for="checkbox-permission-trigger-scheduler-task-{index}-{serverId}" class="w-full py-3 ml-2 text-sm font-medium text-gray-900 dark:text-gray-300 whitespace-nowrap">Trigger Scheduler Task</label>
						</div>
					</li>
				</ul>
			</li>
		{:else}
			<li>
				{#if $isLoadingServers}
					<p class="text-center"><Spinner /></p>
				{:else}
					<p class="text-center">No servers were found.</p>
				{/if}
			</li>
		{/each}
	</ul>

	<svelte:fragment slot="footer">
		<div class="flex justify-end space-x-1 w-full">
			<Button disabled={false} on:click={handleDiscard} color="alternative">
				<Icon data={mdiArrowULeftTop} class="mr-2 -ml-1" /> Discard
			</Button>
			<Button disabled={false} on:click={handleSave} color="blue">
				<Icon data={mdiContentSave} class="mr-2 -ml-1" /> Save
			</Button>
		</div>
	</svelte:fragment>
</Modal>
