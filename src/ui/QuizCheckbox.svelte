<script lang="ts">
	import type { Quiz, QuizOption } from "../schemas";
	import InlineMarkdown from "./InlineMarkdown.svelte";
	import type { AppContext } from "../markdown";
	import Icon from "./Icon.svelte";

	interface Props {
		ctx: AppContext,
		quiz: Extract<Quiz, { type: "checkbox" }>;
		stableId: string;
	}

	let { ctx, stableId, quiz }: Props = $props();
	let selectedIds = $state<Set<string>>(new Set());
	let frozen = $state(false);

	function optionId(opt: QuizOption): string {
		return opt.id ?? opt.content;
	}

	function has(id: string): boolean {
		return selectedIds.has(id);
	}

	function toggle(id: string) {
		if (frozen) return;
		const next = new Set(selectedIds);
		next.has(id) ? next.delete(id) : next.add(id);
		selectedIds = next;
	}

	function onCheck() {
		if (selectedIds.size === 0) return;
		frozen = true;
	}

	function onReset() {
		selectedIds = new Set();
		frozen = false;
	}
</script>

<form class="quiz-form">
	{#each quiz.options as opt (optionId(opt))}
		{@const id = optionId(opt)}
		{@const selected = has(id)}
		{@const correct = frozen && opt.correct}
		{@const checked = frozen && opt.correct || selected}
		{@const missed = frozen && opt.correct && !selected}
		{@const mistaken = frozen && !opt.correct && selected}

		<div class="quiz-option">
			<label class="quiz-option-label">
				<div
					class={["radio", "quiz-form-choice__control", "checkbox", missed ? "radio_view_outline" : "radio_view_default"]}
					class:radio_disabled={frozen}
					class:radio_checked={checked}
					class:quiz-radio--correct={correct}
					class:quiz-radio--mistake={mistaken}
				>
					<span class="visually-hidden">
						<input
							type="checkbox"
							name={stableId}
							value={id}
							disabled={frozen}
							checked={selected}
							aria-checked={checked ? "true" : "false"}
							onchange={() => toggle(id)}
						/>
					</span>

					<div class="radio__icon-host">
						<Icon icon={mistaken ? "close" : (missed ? "minus" : (selected ? "tick" : "none"))}/>
					</div>
				</div>

				<span class="quiz-option-text">
					<InlineMarkdown {ctx} markdown={opt.content}/>
				</span>
			</label>

			{#if opt.feedback && frozen && (correct || selected)}
				<div class="quiz-option-feedback" class:is-correct={correct} class:is-wrong={!correct}>
					<InlineMarkdown {ctx} markdown={opt.feedback}/>
				</div>
			{/if}
		</div>
	{/each}
</form>

<div class="quiz-actions">
	{#if !frozen}
		<button class="quiz-check" type="button" onclick={onCheck} disabled={selectedIds.size === 0}>
			Check
		</button>
	{:else}
		<button class="quiz-reset" type="button" onclick={onReset} aria-label="Reset quiz" title="Reset quiz">
			↻
		</button>
	{/if}
</div>
