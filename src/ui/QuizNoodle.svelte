<script lang="ts">
	import type { Quiz, QuizChoiceQuestion } from "../schemas";
	import InlineMarkdown from "./InlineMarkdown.svelte";
	import { type AppContext } from "../markdown";

	type Side = "left" | "right";
	type Pair = { left: string; right: string };

	interface Props {
		ctx: AppContext;
		quiz: Extract<Quiz, { type: "noodle" }>;
	}

	let { ctx, quiz }: Props = $props();

	let pairs = $state<Pair[]>([]);
	let frozen = $state(false);

	let pending = $state<{ side: Side; id: string } | null>(null);
	let dragging = $state(false);

	// cursor position in local coords
	let pointer = $state<{ x: number; y: number } | null>(null);
	let lastPointer = $state<{ x: number; y: number } | null>(null);

	// snap target (opposite side) under cursor
	let hoverTarget = $state<{ side: Side; id: string } | null>(null);

	// hovered noodle for "cut" highlighting + cursor
	let hoveredPairKey = $state<string | null>(null);

	// quick pulse on the END pin when connection finishes
	let justConnected = $state<{ side: Side; id: string } | null>(null);

	let containerEl = $state<HTMLElement | null>(null);

	// pin -> element for geometry
	let leftPins = new Map<string, HTMLElement>();
	let rightPins = new Map<string, HTMLElement>();

	let centers = $state<Record<string, { x: number; y: number }>>({});

	const optionId = (opt: QuizChoiceQuestion): string => opt.id ?? opt.content;
	const questionId = (i: number): string => quiz.questions[i]?.id ?? `q-${i}`;
	const key = (side: Side, id: string): string => `${side}:${id}`;
	const pairKey = (p: Pair) => `${p.left}->${p.right}`;

	function hasPair(left: string, right: string) {
		return pairs.some((p) => p.left === left && p.right === right);
	}

	function connectedLeftForRight(right: string): string | undefined {
		return pairs.find((p) => p.right === right)?.left;
	}

	function connectedRightForLeft(left: string): string | undefined {
		return pairs.find((p) => p.left === left)?.right;
	}

	function pairForLeft(left: string): Pair | undefined {
		return pairs.find((p) => p.left === left);
	}

	function pairForRight(right: string): Pair | undefined {
		return pairs.find((p) => p.right === right);
	}

	function connect(left: string, right: string, endPin?: { side: Side; id: string }) {
		if (frozen) return;
		if (!left || !right) return;

		// replace any existing connections for either endpoint
		pairs = pairs.filter((p) => p.left !== left && p.right !== right);

		if (!hasPair(left, right)) {
			pairs = [...pairs, { left, right }];
		}

		// pulse the END pin (where user connected into)
		if (endPin) {
			justConnected = endPin;
			setTimeout(() => {
				if (justConnected?.side === endPin.side && justConnected.id === endPin.id) {
					justConnected = null;
				}
			}, 350);
		}
	}

	function disconnect(pair: Pair) {
		if (frozen) return;
		pairs = pairs.filter((p) => !(p.left === pair.left && p.right === pair.right));
	}

	function clearPending() {
		pending = null;
		dragging = false;
		hoverTarget = null;
		// keep pointer/lastPointer so re-click immediately draws from last cursor pos
	}

	function onItemClick(side: Side, id: string) {
		if (frozen) return;

		if (pending) {
			if (pending.side !== side) {
				const left = side === "left" ? id : pending.id;
				const right = side === "right" ? id : pending.id;

				connect(left, right, { side, id }); // end pin = second click
				clearPending();
				return;
			}

			// same side clicked twice: replace pending
			pending = { side, id };
			// ensure we show noodle immediately after click (if we know cursor)
			if (!pointer && lastPointer) pointer = lastPointer;
			return;
		}

		pending = { side, id };

		// floating noodle after click selection
		if (!pointer && lastPointer) pointer = lastPointer;
	}

	function onItemPointerDown(side: Side, id: string, e: PointerEvent) {
		if (frozen) return;

		// if we're already in click-construct mode, DON'T overwrite pending
		// click→click must be handled by onItemClick
		if (pending) return;

		// drag mode start
		pending = { side, id };
		dragging = true;

		pointer = toLocalPoint(e.clientX, e.clientY);
		lastPointer = pointer;
		updateHoverTarget(e.clientX, e.clientY);

		(containerEl as HTMLElement | null)?.setPointerCapture?.(e.pointerId);
	}

	function onContainerPointerMove(e: PointerEvent) {
		// we always track cursor so click→click noodle works nicely
		const p = toLocalPoint(e.clientX, e.clientY);
		lastPointer = p;

		if (pending) {
			pointer = p;
			if (!frozen) updateHoverTarget(e.clientX, e.clientY);
		}
	}

	function onContainerPointerUp(e: PointerEvent) {
		if (!pending) return;

		if (!dragging) return;

		dragging = false;

		// final snap check on release
		updateHoverTarget(e.clientX, e.clientY);

		if (hoverTarget && hoverTarget.side !== pending.side) {
			const left = hoverTarget.side === "left" ? hoverTarget.id : pending.id;
			const right = hoverTarget.side === "right" ? hoverTarget.id : pending.id;

			connect(left, right, hoverTarget);
			clearPending();
			return;
		}

		// not connected -> keep pending mode (floating noodle stays)
		hoverTarget = null;
		pointer = toLocalPoint(e.clientX, e.clientY);
		lastPointer = pointer;
	}

	function updateHoverTarget(clientX: number, clientY: number) {
		const target = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
		const hit = target?.closest?.("[data-noodle-side][data-noodle-id]") as HTMLElement | null;

		if (!pending || !hit) {
			hoverTarget = null;
			return;
		}

		const side = hit.dataset.noodleSide as Side | undefined;
		const id = hit.dataset.noodleId;

		if (!side || !id || side === pending.side) {
			hoverTarget = null;
			return;
		}

		hoverTarget = { side, id };
	}

	function toLocalPoint(clientX: number, clientY: number) {
		if (!containerEl) return { x: clientX, y: clientY };
		const r = containerEl.getBoundingClientRect();
		return { x: clientX - r.left, y: clientY - r.top };
	}

	$effect(() => {
		if (!pending) return;

		const onMove = (e: PointerEvent) => {
			const p = toLocalPoint(e.clientX, e.clientY);
			pointer = p;
			lastPointer = p;
			updateHoverTarget(e.clientX, e.clientY);
		};

		const onDown = (e: PointerEvent) => {
			// if user clicks outside any noodle item → cancel construction
			const t = e.target as HTMLElement | null;
			const hit = t?.closest?.("[data-noodle-side][data-noodle-id]");
			if (!hit) clearPending();
		};

		window.addEventListener("pointermove", onMove, { capture: true });
		window.addEventListener("pointerdown", onDown, { capture: true });

		return () => {
			window.removeEventListener("pointermove", onMove, { capture: true } as any);
			window.removeEventListener("pointerdown", onDown, { capture: true } as any);
		};
	});

	function centerOf(side: Side, id: string) {
		return centers[key(side, id)];
	}

	function updateCenters() {
		if (!containerEl) return;
		const base = containerEl.getBoundingClientRect();
		const next: Record<string, { x: number; y: number }> = {};

		for (const [id, el] of leftPins.entries()) {
			const r = el.getBoundingClientRect();
			next[key("left", id)] = {
				x: r.left - base.left + r.width / 2,
				y: r.top - base.top + r.height / 2,
			};
		}

		for (const [id, el] of rightPins.entries()) {
			const r = el.getBoundingClientRect();
			next[key("right", id)] = {
				x: r.left - base.left + r.width / 2,
				y: r.top - base.top + r.height / 2,
			};
		}

		centers = next;
	}

	$effect(() => {
		if (!containerEl) return;

		// now container exists — compute centers again
		updateCenters();

		const mo = new MutationObserver(() => updateCenters());
		mo.observe(containerEl, { childList: true, subtree: true });

		const ro = new ResizeObserver(() => updateCenters());
		ro.observe(containerEl);

		window.addEventListener("resize", updateCenters);
		window.addEventListener("scroll", updateCenters, { passive: true, capture: true });

		return () => {
			ro.disconnect();
			mo.disconnect();
			window.removeEventListener("resize", updateCenters);
			window.removeEventListener("scroll", updateCenters, { capture: true } as any);
		};
	});

	function straightD(from: { x: number; y: number }, to: { x: number; y: number }) {
		return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
	}

	/**
	 * Macaroni Z:
	 * - start: horizontal outward from the pin
	 * - then rounded bend into diagonal segment toward the other side
	 * - then rounded bend into horizontal segment into the end pin
	 *
	 * This avoids the "funny Z" when user starts from the right side.
	 */
	function macaroniD(
		from: { x: number; y: number },
		to: { x: number; y: number },
		fromSide: Side,
		toSide?: Side
	) {
		// desired look:
		// [Option ( )]----\
		//                  \
		//                   \----[( ) Question]
		// i.e. horizontal stub -> rounded corner -> diagonal -> rounded corner -> horizontal stub

		const r = 8;      // corner radius
		const out = 30;   // stub length out of pin

		toSide = toSide ?? (fromSide === "left" ? "right" : "left");
		const dirFrom = fromSide === "left" ? 1 : -1; // outward direction for start
		const dirTo = toSide === "left" ? 1 : -1;     // outward direction for end

		const S = from;
		const E = to;

		// Stub endpoints (in the "gap space")
		const A = { x: S.x + dirFrom * out, y: S.y };
		const D = { x: E.x + dirTo * out, y: E.y };

		// Diagonal direction from A to D
		const dx = D.x - A.x;
		const dy = D.y - A.y;
		const len = Math.hypot(dx, dy) || 1;
		const ux = dx / len;
		const uy = dy / len;

		// Clamp radius if the diagonal is too short
		const rr = Math.min(r, Math.max(2, len / 6));

		// Points where we enter/leave the rounded corners
		const A1 = { x: A.x - dirFrom * rr, y: A.y };     // before corner on horizontal
		const A2 = { x: A.x + ux * rr, y: A.y + uy * rr }; // after corner on diagonal

		const D2 = { x: D.x - ux * rr, y: D.y - uy * rr }; // before corner on diagonal

		// after corner on horizontal toward the end pin
		// horizontal direction into E is (-dirTo)
		const D3 = { x: D.x - dirTo * rr, y: D.y };

		// Path:
		// S -> A1 (horizontal)
		// A1 -> A2 (rounded via Q at A)
		// A2 -> D2 (diagonal)
		// D2 -> D3 (rounded via Q at D)
		// D3 -> E  (horizontal)
		return [
			`M ${S.x} ${S.y}`,
			`H ${A1.x}`,
			`Q ${A.x} ${A.y} ${A2.x} ${A2.y}`,
			`L ${D2.x} ${D2.y}`,
			`Q ${D.x} ${D.y} ${D3.x} ${D3.y}`,
			`H ${E.x}`,
		].join(" ");
	}

	function isCorrectPair(pair: Pair): boolean {
		const rightIndex = quiz.questions.findIndex((q, i) => questionId(i) === pair.right);
		if (rightIndex < 0) return false;
		return quiz.questions[rightIndex]?.correct_option === pair.left;
	}

	function pinStatus(side: Side, id: string): "none" | "correct" | "wrong" {
		if (!frozen) return "none";

		let pair: Pair | undefined = undefined;
		if (side === "left") pair = pairForLeft(id);
		else pair = pairForRight(id);

		if (!pair) return "none";
		return isCorrectPair(pair) ? "correct" : "wrong";
	}

	let noodlesLeft = $derived(Math.min(quiz.questions.length, quiz.options.length) - Object.values(pairs).length);

	function onCheck() {
		frozen = true;
		// stop construction noodles
		pending = null;
		dragging = false;
		hoverTarget = null;
	}

	function onReset() {
		pairs = [];
		frozen = false;
		pending = null;
		dragging = false;
		hoverTarget = null;
		hoveredPairKey = null;
	}

	// Action: register pin elements (center points)
	function noodlePinRef(node: HTMLElement, params: { side: Side; id: string }) {
		const apply = (p: { side: Side; id: string }) => {
			const map = p.side === "left" ? leftPins : rightPins;
			map.set(p.id, node);
			updateCenters();
		};

		const cleanup = (p: { side: Side; id: string }) => {
			const map = p.side === "left" ? leftPins : rightPins;
			map.delete(p.id);
			updateCenters();
		};

		apply(params);

		return {
			update(next: { side: Side; id: string }) {
				if (next.side !== params.side || next.id !== params.id) {
					cleanup(params);
					apply(next);
					params = next;
				}
			},
			destroy() {
				cleanup(params);
			},
		};
	}
</script>

<div
	class="quiz-noodle"
	class:is-constructing={!!pending && !frozen}
	class:is-dragging={dragging && !frozen}
	bind:this={containerEl}
	onpointermove={onContainerPointerMove}
	onpointerup={onContainerPointerUp}
>
	<svg class="quiz-noodle-lines" focusable="false" aria-hidden="true">
		{#each pairs as pair (pairKey(pair))}
			{@const from = centerOf("left", pair.left)}
			{@const to = centerOf("right", pair.right)}
			{#if from && to}
				{@const correct = frozen ? isCorrectPair(pair) : false}
				{@const hovered = hoveredPairKey === pairKey(pair)}

				<g
					class="quiz-noodle-line"
					class:is-correct={frozen && correct}
					class:is-wrong={frozen && !correct}
					class:is-hovered={!frozen && hovered}
				>
					<!-- border for overlaps -->
					<path
						class="quiz-noodle-line-border"
						d={macaroniD(from, to, "left", "right")}
					/>

					<!-- visible noodle -->
					<path
						class="quiz-noodle-line-body"
						d={macaroniD(from, to, "left", "right")}
					/>

					<!-- hit area -->
					<path
						class="quiz-noodle-line-hit"
						d={macaroniD(from, to, "left", "right")}
						role="button"
						tabindex="0"
						aria-label={frozen ? undefined : "Remove connection"}
						onpointerenter={() => (hoveredPairKey = pairKey(pair))}
						onpointerleave={() => (hoveredPairKey = null)}
						onclick={() => disconnect(pair)}
						onkeydown={(e) => {
						if (frozen) return;
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							disconnect(pair);
						}
					}}
					/>
				</g>
			{/if}
		{/each}

		<!-- pending noodle: visible after click OR while dragging -->
		{#if pending && pointer}
			{@const from = centerOf(pending.side, pending.id)}
			{@const snap =
				hoverTarget && hoverTarget.side !== pending.side
					? centerOf(hoverTarget.side, hoverTarget.id)
					: null}

			{#if from}
				<g class="quiz-noodle-line quiz-noodle-line--pending">
					{#if snap}
						<!-- snap macaroni -->
						<path class="quiz-noodle-line-border"
							  d={macaroniD(from, snap, pending.side, hoverTarget?.side)}/>
						<path class="quiz-noodle-line-body"
							  d={macaroniD(from, snap, pending.side, hoverTarget?.side)}/>
					{:else}
						<!-- floating straight line -->
						<path class="quiz-noodle-line-border" d={straightD(from, pointer)}/>
						<path class="quiz-noodle-line-body" d={straightD(from, pointer)}/>
					{/if}
				</g>
			{/if}
		{/if}
	</svg>

	<div class="quiz-noodle-lists">
		<figure class="quiz-noodle-list quiz-noodle-list--left">
			<ol class="quiz-noodle-items">
				{#each quiz.options as opt (optionId(opt))}
					{@const id = optionId(opt)}
					{@const connectedRight = connectedRightForLeft(id)}
					{@const status = pinStatus("left", id)}

					<li class="quiz-noodle-item-row">
						<button
							type="button"
							class="quiz-noodle-item quiz-noodle-item--left"
							class:is-active={pending?.side === "left" && pending.id === id}
							class:is-target={hoverTarget?.side === "left" && hoverTarget.id === id}
							class:is-connected={!!connectedRight}
							data-noodle-side="left"
							data-noodle-id={id}
							disabled={frozen}
							onpointerdown={(e) => onItemPointerDown("left", id, e)}
							onclick={() => onItemClick("left", id)}
						>
							<span class="quiz-noodle-label"><InlineMarkdown {ctx} markdown={opt.content}/></span>

							<span
								class="quiz-noodle-pin"
								class:is-start={pending?.side === "left" && pending.id === id}
								class:is-target={hoverTarget?.side === "left" && hoverTarget.id === id}
								class:is-connected={!!connectedRight}
								class:is-pulse={justConnected?.side === "left" && justConnected.id === id}
								class:is-correct={status === "correct"}
								class:is-wrong={status === "wrong"}
								aria-hidden="true"
								use:noodlePinRef={{ side: "left", id }}
							></span>
						</button>
					</li>
				{/each}
			</ol>
		</figure>

		<figure class="quiz-noodle-list quiz-noodle-list--right">
			<ol class="quiz-noodle-items">
				{#each quiz.questions as q, i (questionId(i))}
					{@const id = questionId(i)}
					{@const selected = connectedLeftForRight(id)}
					{@const status = pinStatus("right", id)}

					<li class="quiz-noodle-item-row">
						<button
							type="button"
							class="quiz-noodle-item quiz-noodle-item--right"
							class:is-active={pending?.side === "right" && pending.id === id}
							class:is-target={hoverTarget?.side === "right" && hoverTarget.id === id}
							class:is-connected={!!selected}
							data-noodle-side="right"
							data-noodle-id={id}
							disabled={frozen}
							onpointerdown={(e) => onItemPointerDown("right", id, e)}
							onclick={() => onItemClick("right", id)}
						>
							<!-- reversed layout: pin on the left -->
							<span
								class="quiz-noodle-pin"
								class:is-start={pending?.side === "right" && pending.id === id}
								class:is-target={hoverTarget?.side === "right" && hoverTarget.id === id}
								class:is-connected={!!selected}
								class:is-pulse={justConnected?.side === "right" && justConnected.id === id}
								class:is-correct={status === "correct"}
								class:is-wrong={status === "wrong"}
								aria-hidden="true"
								use:noodlePinRef={{ side: "right", id }}
							></span>

							<span class="quiz-noodle-label"><InlineMarkdown {ctx} markdown={q.content}/></span>
						</button>

						{#if frozen && q.feedback}
							<div class="quiz-noodle-feedback"
								 class:is-correct={status === "correct"}
								 class:is-wrong={status === "wrong"}
							>
								<InlineMarkdown {ctx} markdown={q.feedback}/>
							</div>
						{/if}
					</li>
				{/each}
			</ol>
		</figure>
	</div>
</div>

<div class="quiz-actions">
	{#if !frozen}
		<button class="quiz-check" type="button" onclick={onCheck} disabled={noodlesLeft > 0}>
			{#if noodlesLeft === 0}
				Check
			{:else}
				Check ({noodlesLeft} pairs left)
			{/if}
		</button>
	{:else}
		<button class="quiz-reset" type="button" onclick={onReset} aria-label="Reset quiz" title="Reset quiz">
			↻
		</button>
	{/if}
</div>
