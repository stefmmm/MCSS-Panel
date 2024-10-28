<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { mdiArchive, mdiArrowULeftTop, mdiContentSave } from '@mdi/js';
	import Icon from '$lib/components/elements/icon.svelte';
	import PageTitleBanner from '$lib/components/page/pageTitleBanner.svelte';
	import Breadcrumb from '$lib/components/navigation/breadcrumb.svelte';
	import { getServer, selectedServerId } from '$lib/code/global';
	import { Page, navigateToPage, selectedPageProps } from '$lib/code/routing';
	import { Button, TabItem, Tabs } from 'flowbite-svelte';
	import BoxedContainer from '$lib/components/elements/boxedContainer.svelte';
	import Input from '$lib/components/elements/input.svelte';
	import { editSchedulerTask, getSchedulerTaskDetails } from '$lib/code/api';
	import Warning from '$lib/components/elements/warning.svelte';
	import { Permission, hasPermission } from '$lib/code/permissions';
	import { type ISchedulerTask, triggerOptions, type JobTask, type TaskTrigger, IntervalTaskTrigger, FixedTimeTaskTrigger, TriggerlessTaskTrigger, type IEditSchedulerTask } from '$lib/code/scheduler';
	import TaskTriggerIntervalInput from '$lib/components/scheduler/taskTriggerIntervalInput.svelte';
	import TaskTriggerFixedTimeInput from '$lib/components/scheduler/taskTriggerFixedTimeInput.svelte';
	import TaskPlayerRequirementInput from '$lib/components/scheduler/taskPlayerRequirementInput.svelte';
	import Toggle from '$lib/components/elements/toggle.svelte';
	import { WarningType } from '$lib/code/panel';
	import JobsList from '$lib/components/scheduler/jobsList.svelte';

	let taskId: string;
	let name: string = '';
	let enabled: boolean = true;
	let jobs: Array<JobTask> = [];

	let trigger: TaskTrigger;
	let playerRequirement: number;

	let originalName: string = '';
	let showError: boolean;
	let errorMessage: string;
	let areButtonsDisabled: boolean = true;

	const tabItemStyle = 'inline-block text-sm font-medium text-center disabled:cursor-not-allowed p-4 w-full group-first:rounded-l-lg group-last:rounded-r-lg text-white bg-blue-500 focus:ring-4 focus:ring-primary-300 focus:outline-none dark:bg-blue-700 dark:text-white';

	onMount(async () => {
		load();
	});

	function load() {
		taskId = get(selectedPageProps) ?? '';
		getTask(taskId);
	}

	function getTask(taskId: string) {
		getSchedulerTaskDetails($selectedServerId, taskId, (wasSuccess: boolean, taskDetails: ISchedulerTask) => {
			if (!wasSuccess) {
				showError = true;
				errorMessage = 'Unable to load this page, does the task exist?';
			} else {
				name = taskDetails.name;
				enabled = taskDetails.enabled;
				jobs = taskDetails.jobs;
				trigger = taskDetails.trigger;
				playerRequirement = taskDetails.playerRequirement;

				originalName = taskDetails.name;
			}
		});
	}

	function updateTask() {
		let updatedTask: IEditSchedulerTask = {
			name: name,
			enabled: enabled,
			jobs: jobs,
			trigger: trigger,
			playerRequirement: playerRequirement
		};

		editSchedulerTask($selectedServerId, taskId, updatedTask, (wasSuccess: boolean) => {
			if (wasSuccess) {
				confirm(`Task: '${updatedTask.name}' was successfully edited.`);
				navigateBack();
			} else {
				showError = true;
				errorMessage = `Failed to save changes for task: '${updatedTask.name}'.`;
			}
		});
	}

	function handleJobsInputChange(updatedJobs: any) {
		jobs = updatedJobs.detail;
		handleInputChange();
	}

	function handleInputChange() {
		areButtonsDisabled = false;
	}

	function handleTaskTriggerIntervalInput(event: any) {
		trigger = new IntervalTaskTrigger(event.detail.repeat, event.detail.interval);
		areButtonsDisabled = false;
	}

	function handleTaskTriggerFixedTimeInput(event: any) {
		trigger = new FixedTimeTaskTrigger(event.detail.repeat, event.detail.fixedTime);
		areButtonsDisabled = false;
	}

	function handleTaskPlayerRequirementInput(event: any) {
		playerRequirement = event.detail;
		areButtonsDisabled = false;
	}

	function navigateBack() {
		navigateToPage(Page.Scheduler);
	}
</script>

<svelte:head>
	<title>MCSS Remote Panel | Edit Scheduler Task</title>
</svelte:head>

<section class="h-[calc(100vh-56px)] overflow-auto p-6 dark:bg-gray-900 dark:text-white">
	<Breadcrumb
		icon={mdiArchive}
		items={[
			{ name: 'Scheduler', page: Page.Scheduler, isClickable: true },
			{ name: 'Edit', page: Page.Empty, isClickable: false }
		]}
	/>

	<PageTitleBanner title="Edit Task" caption="You are modifying task: '{originalName}' from server: {getServer($selectedServerId)?.name ?? 'Unknown server.'}." />

	{#if hasPermission(Permission.viewSchedulerTasks, $selectedServerId)}
		{#if showError}
			<Warning message={errorMessage} />
		{/if}

		<Warning message="Keep in mind that it's not possible to switch between jobs or triggers." type={WarningType.Info} />

		<form on:submit|preventDefault={updateTask}>
			<BoxedContainer class="space-y-3">
				<Input bind:value={name} label={'Name'} type={'text'} placeholder={'Task name'} required={true} on:input={handleInputChange} />
			</BoxedContainer>
			<BoxedContainer class="space-y-3">
				<JobsList {jobs} on:update={handleJobsInputChange} />
			</BoxedContainer>
			<BoxedContainer class="space-y-3">
				<span class="space-y-1 text-sm font-medium">
					<p class="">Trigger</p>
					<p class="text-gray-400">Choose when and how frequent this task should run.</p>
				</span>
				<!--TODO support player triggers -->

				<Tabs style="full" defaultClass="flex rounded-lg divide-x rtl:divide-x-reverse divide-gray-200 shadow dark:divide-gray-700" contentClass="bg-inherit pt-2">
					<TabItem class="w-full" open={trigger instanceof IntervalTaskTrigger ? true : false} disabled={trigger instanceof IntervalTaskTrigger ? false : true} activeClasses={tabItemStyle}>
						<span class="text-xs sm:text-sm" slot="title">{triggerOptions[0].name}</span>
						<TaskTriggerIntervalInput {trigger} on:update={handleTaskTriggerIntervalInput} />
					</TabItem>
					<TabItem class="w-full" open={trigger instanceof FixedTimeTaskTrigger ? true : false} disabled={trigger instanceof FixedTimeTaskTrigger ? false : true} activeClasses={tabItemStyle}>
						<span class="text-xs sm:text-sm" slot="title">{triggerOptions[1].name}</span>
						<TaskTriggerFixedTimeInput {trigger} on:update={handleTaskTriggerFixedTimeInput} />
					</TabItem>
					<TabItem class="w-full" open={trigger instanceof TriggerlessTaskTrigger ? true : false} disabled={trigger instanceof TriggerlessTaskTrigger ? false : true} activeClasses={tabItemStyle}>
						<span class="text-xs sm:text-sm" slot="title">{triggerOptions[2].name}</span>
						<p class="text-sm text-gray-500 dark:text-gray-400 text-center">
							A <b>triggerless</b> task has no trigger options.
						</p>
					</TabItem>
				</Tabs>
			</BoxedContainer>

			<BoxedContainer class="space-y-3">
				<TaskPlayerRequirementInput {playerRequirement} on:update={handleTaskPlayerRequirementInput} />
			</BoxedContainer>

			{#if trigger instanceof TriggerlessTaskTrigger == false}
				<BoxedContainer>
					<Toggle bind:value={enabled} label={'Enable Task'} on:toggle={handleInputChange} />
				</BoxedContainer>
			{/if}

			<div class="flex space-x-3">
				<Button type="submit" color="blue" disabled={areButtonsDisabled}>
					<Icon data={mdiContentSave} class="mr-2 -ml-1" />Save Task
				</Button>
				<Button type="button" on:click={navigateBack} disabled={areButtonsDisabled} color="alternative">
					<Icon data={mdiArrowULeftTop} class="mr-2 -ml-1" />Cancel
				</Button>
			</div>
		</form>
	{:else}
		<Warning message={`You are missing the following permissions, to view this page: ${Permission.viewSchedulerTasks}`} type={WarningType.Permission} />
	{/if}
</section>
