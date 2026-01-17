<script lang="ts">
	interface Props {
		icon: "none" | "tick" | "minus" | "close",
	}

	let { icon }: Props = $props();
</script>

<svg class="radio__icon" width="24" height="24" viewBox="0 0 24 24" fill="none">
	{#if icon === "tick"}
		<path
			d="M8.554 12.26l2.642 2.381 4.817-4.763"
			stroke="currentColor"
			stroke-width="2"
			stroke-miterlimit="16"
			stroke-linecap="round"
		/>
	{:else if icon === "minus"}
		<rect x="6" y="11" width="12" height="2" rx="1" fill="currentColor"/>
	{:else if icon === "close"}
		<path
			d="M12.071 13.485L9.95 15.607a1 1 0 01-1.414-1.415l2.12-2.12-2.12-2.122A1 1 0 019.95 8.536l2.121 2.12 2.121-2.12a1 1 0 111.415 1.414l-2.122 2.121 2.122 2.121a1 1 0 01-1.415 1.415l-2.12-2.122z"
			fill="currentColor"
		/>
	{/if}
</svg>
