<script lang="ts">
	import { type AppContext, renderInlineMarkdown } from "../markdown";

	interface Props {
		ctx: AppContext,
		markdown?: string;
		cls?: string;
		asPlainText?: boolean;
	}

	let { ctx, markdown, cls, asPlainText = false }: Props = $props();
	let host: HTMLDivElement;

	async function render() {
		if (!host) return;
		host.replaceChildren();
		await renderInlineMarkdown(ctx, markdown ?? "", host, asPlainText);
	}

	$effect(() => {
		ctx;
		markdown;
		void render();
	});
</script>

<div class={cls ?? ""} bind:this={host}></div>
