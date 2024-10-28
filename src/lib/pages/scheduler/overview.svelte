<script lang="ts">
	import { get } from 'svelte/store';
	import { mdiArchive, mdiPlay, mdiRefresh, mdiTimerPlus } from '@mdi/js';
	import { deleteSchedulerTask, getSchedulerDetails, getSchedulerTasks, runSchedulerTask } from '$lib/code/api';
	import Icon from '$lib/components/elements/icon.svelte';
	import { Page, navigateToPage } from '$lib/code/routing';
	import Spinner from '$lib/components/elements/spinner.svelte';
	import { selectedServerId } from '$lib/code/global';
	import ServerSelector from '$lib/components/server/serverSelector.svelte';
	import Breadcrumb from '$lib/components/navigation/breadcrumb.svelte';
	import Button from '$lib/components/elements/button.svelte';
	import { Permission, hasPermission } from '$lib/code/permissions';
	import Warning from '$lib/components/elements/warning.svelte';
	import { getTaskEnabledIcon, getTaskEnabledIconColor, getTaskTrigger, type ISchedulerDetails, type ISchedulerTask } from '$lib/code/scheduler';
	import SchedulerOverview from '$lib/components/scheduler/schedulerOverview.svelte';
	import { WarningType } from '$lib/code/panel';

	let tasks: ISchedulerTask[] = [];
	let schedulerDetails: ISchedulerDetails;
	let isLoading = true;

	// this loads it on mount & when the server changes
	$: $selectedServerId, load();

	function load() {
		const serverId = get(selectedServerId);
		if (!serverId) {
			isLoading = false;
			return;
		}

		getSchedulerTasks(
			serverId,
			(data: ISchedulerTask[]) => {
				tasks = data;
			},
			(wasSuccess: boolean) => {
				isLoading = false;
			}
		);

		getSchedulerDetails(
			serverId,
			(data: ISchedulerDetails) => {
				schedulerDetails = data;
			},
			(wasSuccess: boolean) => {
				isLoading = false;
			}
		);
	}

	function handleRefreshButton() {
		isLoading = true;
		tasks = [];
		load();
	}

	function handleEditTask(taskId: string) {
		navigateToPage(Page.SchedulerTaskEdit, taskId);
	}

	function handleRunTask(taskId: string) {
		let allowedToRun = confirm(`Are you sure you want to run this task now?`);
		if (!allowedToRun) {
			return;
		}

		runSchedulerTask($selectedServerId, taskId, (wasSuccess: boolean) => {
			if (wasSuccess) {
				confirm(`Task was successfully triggered.`);
				handleRefreshButton();
			} else {
				confirm(`Failed to run task.`);
			}
		});
	}

	function handleDeleteTask(taskId: string) {
		let allowedToDelete = confirm(`Are you sure you want to delete this task?`);
		if (!allowedToDelete) {
			return;
		}

		deleteSchedulerTask($selectedServerId, taskId, (wasSuccess: boolean) => {
			if (wasSuccess) {
				confirm(`Task was successfully deleted.`);
				handleRefreshButton();
			} else {
				confirm(`Failed to delete task.`);
			}
		});
	}
</script>

<svelte:head>
	<title>MCSS Remote Panel | Scheduler Overview</title>
</svelte:head>

<section class="h-[calc(100vh-56px)] overflow-auto p-6 dark:bg-gray-900 dark:text-white">
	<Breadcrumb
		icon={mdiArchive}
		items={[
			{ name: 'Scheduler', page: Page.Scheduler, isClickable: true },
			{ name: 'Overview', page: Page.Empty, isClickable: false }
		]}
	/>

	<ServerSelector customDescription="Overview of the Scheduler and its tasks.">
		<div class="self-center">
			<button
				type="button"
				on:click={handleRefreshButton}
				class="px-3 py-1.5 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none hover:bg-gray-100 hover:text-blue-700 focus:z-10 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700 focus:ring-2 focus:ring-blue-700 dark:focus:ring-blue-500"
			>
				<Icon data={mdiRefresh} size={5} />
			</button>
			<!-- <Button icon={mdiRefresh} on:click={handleRefreshButton} /> -->
			<span class="sr-only">Reload Scheduler Tasks</span>
		</div>

		{#if hasPermission(Permission.createSchedulerTask, $selectedServerId)}
			<div class="self-center">
				<Button icon={mdiTimerPlus} text={'Create Task'} on:click={() => navigateToPage(Page.SchedulerTaskCreate)} reactive={true} />
			</div>
		{/if}
	</ServerSelector>

	{#if hasPermission(Permission.viewSchedulerTasks, $selectedServerId)}
		<SchedulerOverview stats={schedulerDetails} />

		<div class="relative overflow-x-auto">
			<div class="relative overflow-x-auto rounded-lg border dark:border-gray-800">
				<table class="w-full text-sm text-left text-gray-500 dark:text-gray-400">
					<!-- this colgroup HACK auto fills the first column to max width -->
					<colgroup>
						<col class="w-full" />
					</colgroup>
					<thead class="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-400">
						<tr>
							<th scope="col" class="px-6 py-3">Name</th>
							<th scope="col" class="px-6 py-3">Jobs</th>
							<th scope="col" class="px-6 py-3">Trigger</th>
							<th scope="col" class="px-6 py-3">Enabled</th>
							<th scope="col" class="px-6 py-3">{hasPermission(Permission.triggerSchedulerTask, $selectedServerId) ? 'Trigger' : ''} </th>
							<th scope="col" class="px-6 py-3">{hasPermission(Permission.editSchedulerTask, $selectedServerId) || hasPermission(Permission.deleteSchedulerTasks, $selectedServerId) ? 'Action' : ''} </th>
						</tr>
					</thead>

					<tbody>
						{#each tasks as task}
							<tr class="bg-white dark:bg-gray-800">
								<td class="px-6 py-4 font-medium text-gray-800 whitespace-nowrap dark:text-white">{task.name}</td>
								<td class="px-6 py-4 font-medium text-gray-800 whitespace-nowrap dark:text-white">{task.jobs.length}</td>
								<td class="px-6 py-4 font-medium text-gray-800 whitespace-nowrap dark:text-white">{getTaskTrigger(task.trigger)}</td>

								<td class="px-6 py-4">
									<Icon data={getTaskEnabledIcon(task)} class={getTaskEnabledIconColor(task)} />
								</td>

								<td class=" px-6 py-4 space-x-3 whitespace-nowrap">
									{#if hasPermission(Permission.triggerSchedulerTask, $selectedServerId)}
										<form on:submit|preventDefault={() => handleRunTask(task.taskId)}>
											<button type="submit" class=" text-blue-600 dark:text-blue-500 hover:underline">
												<button type="button" class="font-medium rounded-lg text-xs px-2 inline-flex items-center text-center py-[0.15rem] focus:ring-4 focus:outline-none text-white bg-blue-700 hover:bg-blue-800 focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
													<Icon data={mdiPlay} size={4} />
													<span class="whitespace-nowrap">Run Now</span>
												</button>
											</button>
										</form>
									{/if}
								</td>

								<td class="flex px-6 py-4 space-x-3">
									{#if hasPermission(Permission.editSchedulerTask, $selectedServerId)}
										<form on:submit|preventDefault={() => handleEditTask(task.taskId)}>
											<button type="submit" class="font-medium text-blue-600 dark:text-blue-500 hover:underline">Edit</button>
										</form>
									{/if}

									{#if hasPermission(Permission.deleteSchedulerTasks, $selectedServerId)}
										<form on:submit|preventDefault={() => handleDeleteTask(task.taskId)}>
											<button type="submit" class="font-medium text-red-600 dark:text-red-500 hover:underline">Delete</button>
										</form>
									{/if}
								</td>
							</tr>
						{:else}
							<tr class="bg-white dark:bg-gray-800">
								{#if isLoading}
									<td class="px-6 py-4 text-center" colspan="7"><Spinner /></td>
								{:else}
									<td class="px-6 py-4 text-center" colspan="7">No tasks were found.</td>
								{/if}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{:else}
		<Warning message={`You are missing the following permissions, to view this page: ${Permission.viewSchedulerTasks}`} type={WarningType.Permission} />
	{/if}
</section>
