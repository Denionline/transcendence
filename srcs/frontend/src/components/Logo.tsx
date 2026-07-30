export default function Logo() {
	return (
		<div className="flex items-center gap-2 sm:gap-2.5">
			<div className="bg-primary h-9 w-9 shrink-0 rounded-[11px] sm:h-11 sm:w-11 sm:rounded-[13px]">
				<div className="text-xl font-extrabold text-primary-content text-center leading-9 sm:text-[1.625rem] sm:leading-11">
					A
				</div>
			</div>
			<span className="font-bold text-xl sm:text-2xl">Artmate</span>
		</div>
	);
}
