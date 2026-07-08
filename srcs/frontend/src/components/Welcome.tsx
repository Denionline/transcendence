const labelClasses =
	"absolute text-base-content/40 text-[9.5px] font-['IBM_Plex_Mono',_monospace] uppercase tracking-[0.08em]";

export default function Welcome() {
	return (
		<div className="hidden md:block bg-base-200 min-h-160 h-dvh pt-8 pb-8 pr-8 pl-8">
			<div className="w-108">
				<h2 className="text-[2.625rem] font-extrabold">
					Where goodwork finds <span className="text-primary">good people.</span>
				</h2>
				<span className="mt-2 opacity-80">
					The home for muralists, illustrators and set-makers — and the people who commission them.
				</span>
				<div className="mt-4 h-44.75 w-full">
					<div className="grid grid-cols-2 grid-rows-2 gap-4 h-full">
						<div className="row-span-2 relative rounded-2xl overflow-hidden bg-base-300">
							<span className={`${labelClasses} bottom-2.5 left-3`}>mural / lisbon</span>
						</div>
						<div className="relative rounded-2xl overflow-hidden bg-base-300">
							<span className={`${labelClasses} bottom-2.25 left-2.75`}>set design</span>
						</div>
						<div className="relative rounded-2xl overflow-hidden bg-primary/10">
							<span className={`${labelClasses} bottom-2.25 left-2.75`}>lettering</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
