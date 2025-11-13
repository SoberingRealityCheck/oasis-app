"use client";

import { useEffect, useRef, useState } from "react";

// Configuration: Add your video/audio pairs here
const VIDEO_MODES = [
	{ video: "/videos/base.mp4", name: "clean" },
	{ video: "/videos/noir.mp4", name: "noir" },
	{ video: "/videos/depths.mp4", name: "depths" },
	{ video: "/videos/crimson.mp4", name: "crimson" },
	{ video: "/videos/sand.mp4", name: "sand" },
	// Add more modes as needed
];

// Configuration: How often to switch modes (in seconds)
const MIN_SWITCH_INTERVAL = 5;
const MAX_SWITCH_INTERVAL = 15;

export default function Home() {
	const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
	const [currentModeIndex, setCurrentModeIndex] = useState(0);
	const [isMuted, setIsMuted] = useState(true);
	const [showUnmuteHint, setShowUnmuteHint] = useState(true);
	const switchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const [nextModeIndex, setNextModeIndex] = useState<number | null>(null);

	// Preload all videos aggressively on mount
	useEffect(() => {
		videoRefs.current.forEach((video, index) => {
			if (video && index !== currentModeIndex) {
				// Load metadata and buffer for non-current videos
				video.load();
				// Try to force buffering by seeking to a small timestamp
				video.currentTime = 0.1;
			}
		});
	}, []);

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

			// Pre-select and warm up next video halfway through the interval
			const warmupDelay = delay / 2;
			
			setTimeout(() => {
				// Pick next mode early
				let newIndex;
				do {
					newIndex = Math.floor(Math.random() * VIDEO_MODES.length);
				} while (newIndex === currentModeIndex && VIDEO_MODES.length > 1);
				
				setNextModeIndex(newIndex);
				
				// Warm up the next video
				const nextVideo = videoRefs.current[newIndex];
				if (nextVideo) {
					nextVideo.load();
					// Seek to current timestamp to buffer that section
					const currentVideo = videoRefs.current[currentModeIndex];
					if (currentVideo) {
						nextVideo.currentTime = currentVideo.currentTime;
					}
				}
			}, warmupDelay);

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
		
		// Use pre-selected next mode if available, otherwise pick random
		let newIndex = nextModeIndex;
		if (newIndex === null || newIndex === currentModeIndex) {
			do {
				newIndex = Math.floor(Math.random() * VIDEO_MODES.length);
			} while (newIndex === currentModeIndex && VIDEO_MODES.length > 1);
		}

		const newVideo = videoRefs.current[newIndex];
		if (!newVideo) return;

		// Sync timestamp (should already be close if warmed up)
		newVideo.currentTime = currentTime;
		newVideo.muted = currentVideo.muted;
		
		// Set initial volume for crossfade
		newVideo.volume = 0;
		
		// Start new video playing first
		newVideo.play().then(() => {
			// Crossfade audio over 1 second
			const fadeDuration = 1000;
			const fadeSteps = 50;
			const fadeInterval = fadeDuration / fadeSteps;
			let step = 0;

			const fadeAudio = setInterval(() => {
				step++;
				const progress = step / fadeSteps;
				
				// Fade out old video
				currentVideo.volume = Math.max(0, 1 - progress);
				// Fade in new video
				newVideo.volume = Math.min(1, progress);

				if (step >= fadeSteps) {
					clearInterval(fadeAudio);
					currentVideo.volume = 0;
					newVideo.volume = 1;
					currentVideo.pause();
				}
			}, fadeInterval);

			// Trigger visual crossfade
			setCurrentModeIndex(newIndex);
			setNextModeIndex(null);
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
		<div className="relative w-screen h-screen overflow-hidden bg-black flex items-center justify-center p-[50px]">
			{/* Square video container - takes smaller dimension minus padding */}
			<div className="relative w-full h-full max-w-[calc(100vh-100px)] max-h-[calc(100vw-100px)] aspect-square">
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
			</div>

			{/* Unmute button overlay */}
			{showUnmuteHint && (
				<button
					onClick={handleUnmute}
					className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white px-4 py-2 rounded-lg backdrop-blur-sm transition-all"
				>
					🔇 Click to unmute
				</button>
			)}
		</div>
	);
}
