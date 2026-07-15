export default function NotFoundPage() {
	return (
		<div
			data-theme="forest"
			className="relative min-h-screen overflow-hidden bg-base-100 font-grotesk flex flex-col"
		>
			{/* ---------- Component-scoped styles: fonts + keyframes ---------- */}
			<style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Space+Mono:wght@400;700&display=swap');

        .font-grotesk { font-family: 'Space Grotesk', sans-serif; }
        .font-mono-brand { font-family: 'Space Mono', monospace; }

        /* Organic paint-blob morphing */
        @keyframes blob-morph {
          0%, 100% { border-radius: 46% 54% 52% 48% / 50% 46% 54% 50%; }
          25%      { border-radius: 54% 46% 44% 56% / 48% 56% 44% 52%; }
          50%      { border-radius: 48% 52% 58% 42% / 56% 44% 56% 44%; }
          75%      { border-radius: 56% 44% 48% 52% / 44% 52% 48% 56%; }
        }

        /* Dotted orbit ring spins slowly */
        @keyframes spin-slow {
          to { transform: rotate(360deg); }
        }

        /* Soft breathing glow behind the blob */
        @keyframes glow-pulse {
          0%, 100% { opacity: .45; transform: scale(1); }
          50%      { opacity: .8;  transform: scale(1.08); }
        }

        /* Paint drips stretching down */
        @keyframes drip {
          0%, 100% { transform: scaleY(.4); opacity: .5; }
          50%      { transform: scaleY(1);  opacity: 1; }
        }

        /* Ambient corner blobs drifting */
        @keyframes drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%      { transform: translate(2%, -3%) scale(1.06); }
        }

        /* Scattered dots twinkling */
        @keyframes twinkle {
          0%, 100% { opacity: .25; transform: scale(.8); }
          50%      { opacity: 1;   transform: scale(1.15); }
        }

        /* Page-load entrance */
        @keyframes rise-in {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .anim-blob   { animation: blob-morph 9s ease-in-out infinite; }
        .anim-orbit  { animation: spin-slow 24s linear infinite; }
        .anim-glow   { animation: glow-pulse 5s ease-in-out infinite; }
        .anim-drip   { animation: drip 2.6s ease-in-out infinite; transform-origin: top; }
        .anim-drift  { animation: drift 14s ease-in-out infinite; }
        .anim-dot    { animation: twinkle 4s ease-in-out infinite; }

        .rise    { animation: rise-in .7s cubic-bezier(.22,1,.36,1) both; }
        .rise-1  { animation-delay: .05s; }
        .rise-2  { animation-delay: .15s; }
        .rise-3  { animation-delay: .3s; }
        .rise-4  { animation-delay: .45s; }
        .rise-5  { animation-delay: .6s; }

        @media (prefers-reduced-motion: reduce) {
          .anim-blob, .anim-orbit, .anim-glow, .anim-drip,
          .anim-drift, .anim-dot, .rise {
            animation: none;
          }
        }
      `}</style>

			{/* ---------- Ambient background: corner glows + scattered dots ---------- */}
			<div className="pointer-events-none absolute inset-0" aria-hidden="true">
				{/* top-right dark green glow */}
				<div className="anim-drift absolute -top-40 -right-40 h-136 w-136 rounded-full bg-primary/10 blur-3xl" />
				{/* bottom-left olive glow */}
				<div
					className="anim-drift absolute -bottom-48 -left-48 h-144 w-xl rounded-full bg-accent/10 blur-3xl"
					style={{ animationDelay: "-7s" }}
				/>

				{/* scattered specks */}
				<span className="anim-dot absolute left-[9%] top-[16%] h-1.5 w-1.5 rounded-full bg-primary" />
				<span
					className="anim-dot absolute right-[13%] top-[23%] h-1.5 w-1.5 rounded-full bg-primary/70"
					style={{ animationDelay: "-1s" }}
				/>
				<span
					className="anim-dot absolute left-[15%] top-[67%] h-1 w-1 rounded-full bg-base-content/40"
					style={{ animationDelay: "-2s" }}
				/>
				<span
					className="anim-dot absolute right-[19%] bottom-[21%] h-2 w-2 rounded-full bg-primary/80"
					style={{ animationDelay: "-3s" }}
				/>
				<span
					className="anim-dot absolute left-[46%] bottom-[30%] h-1 w-1 rounded-full bg-base-content/30"
					style={{ animationDelay: "-1.6s" }}
				/>
			</div>

			{/* ---------- Header ---------- */}
			<header className="rise rise-1 relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
				<a href="/" className="flex items-center gap-3">
					<span className="grid h-10 w-10 place-items-center rounded-xl bg-primary font-bold text-primary-content text-lg">
						A
					</span>
					<span className="text-xl font-bold text-base-content">Artmate</span>
				</a>
				<span className="font-mono-brand text-sm tracking-[0.35em] text-base-content/50">
					ERROR&nbsp;·&nbsp;404
				</span>
			</header>

			{/* ---------- Main ---------- */}
			<main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
				<p className="rise rise-2 font-mono-brand text-sm font-bold tracking-[0.45em] text-primary">
					PAGE NOT FOUND
				</p>

				{/* 404 figure */}
				<div className="rise rise-3 mt-6 flex items-center justify-center gap-2 sm:gap-4 select-none">
					<span className="text-[7rem] leading-none font-bold text-base-content sm:text-[11rem]">
						4
					</span>

					{/* the "0": paint blob + dotted orbit + drips */}
					<div className="relative mx-1 h-40 w-40 sm:h-56 sm:w-56">
						{/* glow */}
						<div className="anim-glow absolute inset-4 rounded-full bg-primary/30 blur-2xl" />
						{/* dotted orbit ring with satellite dot */}
						<div className="anim-orbit absolute inset-0 rounded-full border-2 border-dotted border-base-content/25">
							<span className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-accent" />
						</div>
						{/* morphing paint blob */}
						<div className="anim-blob absolute inset-6 bg-primary shadow-[0_0_60px_-10px] shadow-primary/60 sm:inset-8" />
						{/* drips */}
						<div
							className="absolute -bottom-6 left-1/2 flex -translate-x-1/2 items-start gap-2"
							aria-hidden="true"
						>
							<span className="anim-drip h-4 w-1 rounded-full bg-primary/80" />
							<span
								className="anim-drip h-6 w-1 rounded-full bg-primary"
								style={{ animationDelay: "-.8s" }}
							/>
							<span
								className="anim-drip h-3 w-1 rounded-full bg-primary/60"
								style={{ animationDelay: "-1.6s" }}
							/>
						</div>
					</div>

					<span className="text-[7rem] leading-none font-bold text-base-content sm:text-[11rem]">
						4
					</span>
				</div>

				{/* Copy */}
				<h1 className="rise rise-4 mt-14 text-3xl font-bold text-base-content sm:text-4xl">
					This canvas is blank.
				</h1>
				<p className="rise rise-4 mt-4 max-w-md text-base-content/60">
					The page you&apos;re looking for was moved, renamed, or never framed in the first place.
					Let&apos;s get you back to the work.
				</p>

				{/* Actions */}
				<div className="rise rise-5 mt-8 flex flex-wrap items-center justify-center gap-3">
					<a
						href="/discover"
						className="btn btn-primary rounded-full px-6 shadow-lg shadow-primary/25 transition-transform duration-200 hover:-translate-y-0.5"
					>
						Back to Discover
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth={2}
						>
							<path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
						</svg>
					</a>
					<a href="/" className="btn btn-ghost rounded-full px-6">
						Go home
					</a>
				</div>
			</main>

			{/* ---------- Footer ---------- */}
			<footer className="rise rise-5 relative z-10 py-8 text-center">
				<p className="font-mono-brand text-xs tracking-[0.35em] text-base-content/40">
					ARTMATE&nbsp;·&nbsp;THE&nbsp;HOME&nbsp;FOR&nbsp;CREATIVE&nbsp;WORK
				</p>
			</footer>
		</div>
	);
}
