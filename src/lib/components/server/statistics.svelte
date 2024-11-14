<script lang="ts">
	import { onDestroy } from 'svelte';
	import { get } from 'svelte/store';
	import { browser } from '$app/environment';
	import { getServerStatus } from '$lib/code/api';
	import ServerStatistic from './stat.svelte';
	import { mdiAccountCowboyHat, mdiChartArc, mdiChip, mdiClockTimeEight } from '@mdi/js';
	import { selectedServerId } from '$lib/code/global';
	import type { Stats } from '$lib/code/statistics';

	let stats: Stats = {
		cpu: 0,
		memory: { current: 0, max: 0, free: 0 },
		playersOnline: 0,
		playerLimit: 0,
		startDateUnix: 0,
		startDate: '',
		uptime: 'offline'
	};

	let isLoadingStats: boolean = true;

	if (browser) {
		function unsubscribe() {
			clearInterval(updateConsole);
			isLoadingStats = true;
			updateServerStats();
		}

		const updateConsole = setInterval(() => {
			updateServerStats();
		}, 2000);

		onDestroy(unsubscribe);
	}

	async function updateServerStats() {
		const serverId = get(selectedServerId);

		if (!serverId) {
			return;
		}

		getServerStatus(
			serverId,
			(latestStats: Stats) => {
				stats = latestStats;
			},
			(wasSuccess: Boolean) => {
				isLoadingStats = false;
			}
		);
	}

	function calculateFreePercentage(current: number, max: number) {
		return Math.round((current / max) * 100);
	}
</script>

<!-- this fixes a visual bug when loading -->
<div class="grid grid-cols-2 md:grid-cols-3 gap-3 pb-3" class:md:grid-cols-4={stats.playerLimit != 0}>
	<ServerStatistic title="CPU" value={stats.cpu.toString() + '%'} caption="current CPU usage" icon={mdiChip} />
	<ServerStatistic title="Memory" value={stats.memory.current.toString() + 'MB'} caption="{calculateFreePercentage(stats.memory.current, stats.memory.max)}% used of {stats.memory.max} MB" icon={mdiChartArc} />

	{#if stats.playerLimit != 0}
		<ServerStatistic title="Players" value={stats.playersOnline.toString()} caption="out of {stats.playerLimit}" icon={mdiAccountCowboyHat} />
	{/if}

	<ServerStatistic title="Uptime" value={stats.uptime.toString()} caption={stats.startDateUnix > 0 ? 'since ' + stats.startDate : 'server not operational'} icon={mdiClockTimeEight} />
</div>
