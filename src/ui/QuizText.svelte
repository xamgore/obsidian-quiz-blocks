<script lang="ts">
	import type { Quiz } from "../schemas";
	import InlineMarkdown from "./InlineMarkdown.svelte";
	import type { AppContext } from "../markdown";
	import autosize from "svelte-autosize";
	import { tick } from "svelte";

	interface Props {
		ctx: AppContext,
		quiz: Extract<Quiz, { type: "text" }>;
		stableId: string;
	}

	let { ctx, stableId, quiz }: Props = $props();
	let answer = $state("");
	let frozen = $state(false);
	let textarea: Element;

	function onCheck() {
		// We can't grade free text yet; "Check" just freezes the input
		// and reveals the reference answer (if provided).
		if (answer.trim().length === 0) return;
		frozen = true;
	}

	async function onReset() {
		answer = "";
		frozen = false;
		await tick();
		autosize.update(textarea);
	}
</script>

<form class="quiz-form">
	<textarea
		class="quiz-textarea"
		name={stableId}
		disabled={frozen}
		rows={4}
		bind:value={answer}
		placeholder="Type your answer…"
		use:autosize
		bind:this={textarea}
	></textarea>

	{#if frozen && quiz.correct && quiz.correct.trim().length > 0}
		<div class="quiz-text-correct">
			<InlineMarkdown {ctx} markdown={quiz.correct}/>
		</div>
	{/if}

	{#if frozen && quiz.feedback && quiz.feedback.trim().length > 0}
		<div class="quiz-text-feedback">
			<InlineMarkdown {ctx} markdown={quiz.feedback}/>
		</div>
	{/if}
</form>

<div class="quiz-actions">
	{#if !frozen}
		<button class="quiz-check" type="button" onclick={onCheck} disabled={answer.trim().length === 0}>
			Check
		</button>
	{:else}
		<button class="quiz-reset" type="button" onclick={onReset} aria-label="Reset quiz" title="Reset quiz">
			↻
		</button>
	{/if}
</div>
