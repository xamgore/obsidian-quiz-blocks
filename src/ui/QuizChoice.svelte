<script lang="ts">
	import type { Quiz, QuizChoiceQuestion } from "../schemas";
	import InlineMarkdown from "./InlineMarkdown.svelte";
	import { type AppContext } from "../markdown";

	interface Props {
		ctx: AppContext,
		quiz: Extract<Quiz, { type: "choice" }>;
	}

	let { ctx, quiz }: Props = $props();
	let answers = $state<Record<number, string>>({});
	let frozen = $state(false);

	function optionId(opt: QuizChoiceQuestion): string {
		return opt.id ?? opt.content;
	}

	function setAnswer(i: number, value: string) {
		answers = { ...answers, [i]: value };
	}

	let questionsLeft = $derived(quiz.questions.length - Object.values(answers).filter(x => x).length);

	function onCheck() {
		frozen = true;
	}

	function onReset() {
		answers = {};
		frozen = false;
	}

	function selectedOption(id?: string) {
		if (!id) return undefined;
		return quiz.options.find((o) => optionId(o) === id);
	}

	function isCorrect(q: QuizChoiceQuestion, selectedId?: string) {
		return q.correct_option === selectedId && typeof selectedId !== "undefined";
	}
</script>

<div class="quiz-choice">
	{#each quiz.questions as q, i (q.id ?? i)}
		{@const selectedId = answers[i] ?? ""}
		{@const selectedOpt = selectedOption(selectedId)}
		{@const correct = selectedId ? isCorrect(q, selectedId) : false}

		<div class="quiz-choice-question">
			<div class="quiz-choice-question-text">
				<InlineMarkdown {ctx} markdown={q.content}/>
			</div>

			{#if !frozen}
				<select
					class="quiz-choice-select"
					aria-label="Select an answer"
					value={selectedId}
					onchange={(e) => setAnswer(i, e.currentTarget.value)}
				>
					{#if !selectedId}
						<option value="">...</option>
					{/if}
					{#each quiz.options as opt (optionId(opt))}
						{@const id = optionId(opt)}
						{#if id}
							<option value={id}>
								<InlineMarkdown {ctx} markdown={opt.content} asPlainText={true}/>
							</option>
						{/if}
					{/each}
				</select>
			{:else}
				<div class="quiz-choice-result">
					<div class="quiz-choice-answer" class:is-correct={correct} class:is-wrong={!correct}>
						{#if selectedOpt}
							<InlineMarkdown {ctx} markdown={selectedOpt.content}/>
						{:else}
							{selectedId}
						{/if}
					</div>

					{#if q.feedback}
						<div class="quiz-choice-feedback" class:is-correct={correct} class:is-wrong={!correct}>
							<InlineMarkdown {ctx} markdown={q.feedback}/>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	{/each}
</div>

<div class="quiz-actions">
	{#if !frozen}
		<button class="quiz-check" type="button" onclick={onCheck} disabled={questionsLeft > 0}>
			{#if questionsLeft === 0}
				Check
			{:else}
				Check ({questionsLeft} questions left)
			{/if}
		</button>
	{:else}
		<button class="quiz-reset" type="button" onclick={onReset} aria-label="Reset quiz" title="Reset quiz">
			↻
		</button>
	{/if}
</div>
