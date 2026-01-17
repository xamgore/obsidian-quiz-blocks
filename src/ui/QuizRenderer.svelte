<script lang="ts">
	import type { AppContext } from "../markdown";
	import type { Quiz } from "../schemas";

	import InlineMarkdown from "./InlineMarkdown.svelte";
	import QuizChoice from "./QuizChoice.svelte";
	import QuizRadio from "./QuizRadio.svelte";
	import QuizCheckbox from "./QuizCheckbox.svelte";

	interface Props {
		ctx: AppContext,
		stableId: string;
		groupName: string;
		quiz: Quiz;
	}

	let { ctx, stableId, quiz }: Props = $props();
</script>

<div class="quiz-block" data-quiz-id={stableId}>
	<div class="quiz-title">
		<InlineMarkdown {ctx} markdown={quiz.content}/>
	</div>

	{#if quiz.type === "choice"}
		<QuizChoice {ctx} quiz={quiz}/>
	{:else if quiz.type === "radio"}
		<QuizRadio {ctx} {stableId} quiz={quiz}/>
	{:else if quiz.type === "checkbox"}
		<QuizCheckbox {ctx} {stableId} quiz={quiz}/>
	{/if}
</div>
