<script lang="ts">
	import { mdiArchive, mdiArchivePlus, mdiArrowULeftTop } from '@mdi/js';
	import Icon from '$lib/components/elements/icon.svelte';
	import PageTitleBanner from '$lib/components/page/pageTitleBanner.svelte';
	import Breadcrumb from '$lib/components/navigation/breadcrumb.svelte';
	import { getServer, selectedServerId } from '$lib/code/global';
	import { createSchedulerTask } from '$lib/code/api';
	import { Page, navigateToPage } from '$lib/code/routing';
	import Input from '$lib/components/elements/input.svelte';
	import { Button } from 'flowbite-svelte';
	import BoxedContainer from '$lib/components/elements/boxedContainer.svelte';
	import { Permission, hasPermission } from '$lib/code/permissions';
	import Warning from '$lib/components/elements/warning.svelte';
	import { Tabs, TabItem } from 'flowbite-svelte';
	import TaskTriggerIntervalInput from '$lib/components/scheduler/taskTriggerIntervalInput.svelte';
	import TaskTriggerFixedTimeInput from '$lib/components/scheduler/taskTriggerFixedTimeInput.svelte';
	import TaskPlayerRequirementInput from '$lib/components/scheduler/taskPlayerRequirementInput.svelte';
	import { triggerOptions, type INewSchedulerTask, type JobTask, type TaskTrigger, IntervalTaskTrigger, FixedTimeTaskTrigger } from '$lib/code/scheduler';
	import { WarningType } from '$lib/code/panel';
	import JobsList from '$lib/components/scheduler/jobsList.svelte';

	let name: string = '';
	let jobs: Array<JobTask> = [];
	let trigger: TaskTrigger;
	let playerRequirement: number;

	const tabItemStyle = 'inline-block text-sm font-medium text-center disabled:cursor-not-allowed p-4 w-full group-first:rounded-l-lg group-last:rounded-r-lg text-white bg-blue-500 focus:ring-4 focus:ring-primary-300 focus:outline-none dark:bg-blue-700 dark:text-white';

	function createNewScheduledTask() {
		let newTask: INewSchedulerTask = {
			name: name,
			enabled: true,
			jobs: jobs,
			trigger: trigger,
			playerRequirement
		};

		createSchedulerTask($selectedServerId, newTask, (wasSuccess: boolean) => {
			if (wasSuccess) {
				confirm(`Task: '${newTask.name}' was successfully created.`);
				navigateBack();
			} else {
				confirm(`Failed to create task: '${newTask.name}'.`);
			}
		});
	}

	function handleJobsInputChange(updatedJobs: any) {
		jobs = updatedJobs.detail;
	}

	function handleTaskTriggerIntervalInput(event: any) {
		trigger = new IntervalTaskTrigger(event.detail.repeat, event.detail.interval);
	}

	function handleTaskTriggerFixedTimeInput(event: any) {
		trigger = new FixedTimeTaskTrigger(event.detail.repeat, event.detail.fixedTime);
	}

	function handleTaskPlayerRequirementInput(event: any) {
		playerRequirement = event.detail;
	}

	function navigateBack() {
		navigateToPage(Page.Scheduler);
	}
</script>

<svelte:head>
	<title>MCSS Remote Panel | Create Scheduler Task</title>
</svelte:head>

<section class="h-[calc(100vh-56px)] overflow-auto p-6 dark:bg-gray-900 dark:text-white">
	<Breadcrumb
		icon={mdiArchive}
		items={[
			{ name: 'Scheduler', page: Page.Scheduler, isClickable: true },
			{ name: 'Create', page: Page.Empty, isClickable: false }
		]}
	/>

	<PageTitleBanner title="Create Task" caption="Create a new task for server: {getServer($selectedServerId)?.name ?? 'Unknown server.'}." />

	{#if hasPermission(Permission.createSchedulerTask, $selectedServerId)}
		<form on:submit|preventDefault={createNewScheduledTask}>
			<BoxedContainer class="space-y-3">
				<Input bind:value={name} label={'Name'} type={'text'} placeholder={'Task name'} required={true} />
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
					<TabItem class="w-full" activeClasses={tabItemStyle} open>
						<span class="text-xs sm:text-sm" slot="title">{triggerOptions[0].name}</span>
						<TaskTriggerIntervalInput trigger={new IntervalTaskTrigger(true, 0)} on:update={handleTaskTriggerIntervalInput} />
					</TabItem>
					<TabItem class="w-full" activeClasses={tabItemStyle}>
						<span class="text-xs sm:text-sm" slot="title">{triggerOptions[1].name}</span>
						<TaskTriggerFixedTimeInput trigger={new FixedTimeTaskTrigger(true, '')} on:update={handleTaskTriggerFixedTimeInput} />
					</TabItem>
					<TabItem class="w-full" activeClasses={tabItemStyle}>
						<span class="text-xs sm:text-sm" slot="title">{triggerOptions[2].name}</span>
						<p class="text-sm text-gray-500 dark:text-gray-400 text-center">
							A <b>triggerless</b> task has no trigger options.
						</p>
					</TabItem>
				</Tabs>
			</BoxedContainer>

			<BoxedContainer class="space-y-3">
				<TaskPlayerRequirementInput playerRequirement={0} on:update={handleTaskPlayerRequirementInput} />
			</BoxedContainer>

			<div class="flex space-x-3">
				<Button type="submit" color="blue">
					<Icon data={mdiArchivePlus} class="mr-2 -ml-1" />Create Task
				</Button>
				<Button type="button" on:click={navigateBack} color="alternative">
					<Icon data={mdiArrowULeftTop} class="mr-2 -ml-1" />Cancel
				</Button>
			</div>
		</form>
	{:else}
		<Warning message={`You are missing the following permissions, to view this page: ${Permission.createSchedulerTask}`} type={WarningType.Permission} />
	{/if}
</section>
