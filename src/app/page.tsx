"use client";

import { useEffect, useRef, useState } from "react";

// Configuration: Add your video/audio pairs here
const VIDEO_MODES = [
	{ video: "/videos/base.mp4", name: "Mode 1" },
	{ video: "/videos/noir.mp4", name: "Mode 2" },
	{ video: "/videos/depths.mp4", name: "Mode 3" },
	{ video: "/videos/crimson.mp4", name: "Mode 4" },
	{ video: "/videos/fade.mp4", name: "Mode 5" },
	{ video: "/videos/altered.mp4", name: "Mode 6" },
	// Add more modes as needed
];

// Configuration: How often to switch modes (in seconds)
const MIN_SWITCH_INTERVAL = 2;
const MAX_SWITCH_INTERVAL = 10;

export default function Home() {
	const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
	const [currentModeIndex, setCurrentModeIndex] = useState(0);
	const [isMuted, setIsMuted] = useState(true);
	const [showUnmuteHint, setShowUnmuteHint] = useState(true);
	const switchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	// Initialize autoplay and mode switching
	useEffect(() => {
		const currentVideo = videoRefs.current[currentModeIndex];
		if (!currentVideo) return;

		// Try to autoplay (will be muted initially due to browser policies)
		currentVideo.play().catch((error) => {
			console.log("Autoplay prevented:", error);
		});

		// Schedule next mode switch
		const scheduleNextSwitch = () => {
			const delay =
				(MIN_SWITCH_INTERVAL +
					Math.random() * (MAX_SWITCH_INTERVAL - MIN_SWITCH_INTERVAL)) *
				1000;

			switchTimeoutRef.current = setTimeout(() => {
				switchToRandomMode();
				scheduleNextSwitch();
			}, delay);
		};

		scheduleNextSwitch();

		return () => {
			if (switchTimeoutRef.current) {
				clearTimeout(switchTimeoutRef.current);
			}
		};
	}, [currentModeIndex]);

	const switchToRandomMode = () => {
		const currentVideo = videoRefs.current[currentModeIndex];
		if (!currentVideo) return;

		const currentTime = currentVideo.currentTime;
		
		// Pick a random different mode
		let newIndex;
		do {
			newIndex = Math.floor(Math.random() * VIDEO_MODES.length);
		} while (newIndex === currentModeIndex && VIDEO_MODES.length > 1);

		const newVideo = videoRefs.current[newIndex];
		if (!newVideo) return;

		// Sync timestamp and START new video BEFORE switching visibility
		newVideo.currentTime = currentTime;
		newVideo.muted = currentVideo.muted;
		
		// Start new video playing first
		newVideo.play().then(() => {
			// Now trigger the crossfade by switching the index
			setCurrentModeIndex(newIndex);
			
			// Wait for fade transition to complete, then pause old video
			setTimeout(() => {
				currentVideo.pause();
			}, 1000); // Match the CSS transition duration
		});
	};

	const handleUnmute = () => {
		videoRefs.current.forEach((video) => {
			if (video) video.muted = false;
		});
		setIsMuted(false);
		setShowUnmuteHint(false);
	};

	return (
		<div className="relative w-screen h-screen overflow-hidden bg-black">
			{/* Video layers */}
			{VIDEO_MODES.map((mode, index) => (
				<video
					key={index}
					ref={(el) => {
						videoRefs.current[index] = el;
					}}
					className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
						index === currentModeIndex ? "opacity-100" : "opacity-0"
					}`}
					src={mode.video}
					loop
					muted={isMuted}
					playsInline
					preload="auto"
				/>
			))}

			{/* Unmute button overlay */}
			{showUnmuteHint && (
				<button
					onClick={handleUnmute}
					className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white px-4 py-2 rounded-lg backdrop-blur-sm transition-all"
				>
					🔇 Click to unmute
				</button>
			)}

			{/* Optional: Mode indicator (remove if you want pure visual) */}
			<div className="absolute bottom-4 left-4 bg-black/30 text-white/70 px-3 py-1 rounded text-sm backdrop-blur-sm">
				{VIDEO_MODES[currentModeIndex].name}
			</div>
		</div>
	);
}
