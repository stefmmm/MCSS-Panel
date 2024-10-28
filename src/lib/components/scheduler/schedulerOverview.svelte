<script lang="ts">
	import type { ISchedulerDetails } from '$lib/code/scheduler';
	import ColoredDot from '../elements/coloredDot.svelte';

	export let stats: ISchedulerDetails = { tasks: 0, triggers: { interval: 0, fixedTime: 0, noTrigger: 0 } };
</script>

<div class="justify-between mb-6 flex bg-white shadow border border-gray-200 rounded-lg dark:border-gray-700 dark:bg-gray-800">
	<div class="w-full p-4 text-gray-600 dark:text-gray-400">
		<div class="flex space-x-6 text-xs sm:text-base">
			<div>
				<span>Overview ({stats.tasks}):</span>
			</div>
			<div>
				<ColoredDot color="bg-orange-500" />
				{stats.triggers.interval} Interval
			</div>
			<div>
				<ColoredDot color="bg-blue-500" />
				{stats.triggers.fixedTime} Fixed Time
			</div>
			<div>
				<ColoredDot color="bg-gray-500" />
				{stats.triggers.noTrigger} Triggerless
			</div>
		</div>
	</div>
</div>
