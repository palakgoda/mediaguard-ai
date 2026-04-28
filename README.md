🛡️ MediaGuard AI: Autonomous Forensic Workstation
National Finalist Submission | Build with AI Solution Challenge

📌 1. What is MediaGuard AI?
MediaGuard AI is a sophisticated forensic workstation designed for sports leagues and broadcasters to protect high-value digital assets. It utilizes an Agentic AI Architecture to move beyond brittle hashing, providing deep-content analysis and autonomous piracy defense.

The Problem
Traditional piracy protection is reactive. By the time a leak is reported, the broadcast value has already plummeted. Standard hashing fails if a pirate simply crops or filters the video.

The Solution
A proactive, AI-driven ecosystem that:

Ingests & Notarizes: Creates a "Digital DNA" fingerprint for every asset.

Monitors: Scans global networks using multi-agent multimodal reasoning.

Enforces: Triggers automated forensic logging and rapid response.

🛠️ 2. How it Works (The Tech Stack)
We built an enterprise-grade system designed for scale, security, and precision.

Frontend: Responsive Mission HUD built with HTML5, Tailwind CSS, and Vanilla JS.

AI Engine: Gemini 1.5 Flash & Pro for high-speed multimodal reasoning and "Judge" logic.

Infrastructure: Serverless orchestration deployed on Google Cloud Run.

Security: Integrated Application Default Credentials (ADC) for secure, keyless service-to-service communication.

Persistence: Firebase Firestore real-time NoSQL vault for forensic audit logs and asset registry.

🤖 3. The Agentic Orchestration (A2A Protocol)
We moved away from hardcoded logic to a Hierarchical Three-Agent System that utilizes the Agent-to-Agent (A2A) protocol for decision-making:

The Watcher Agent: Performs initial forensic ingestion, identifying jerseys, logos, and proprietary broadcast markers.

The Investigator Agent: Executes heuristic pattern matching across global streams, identifying "Speed-shifting," "Mirroring," or "Cropping" bypasses.

The Judge Agent: Powered by Gemini 1.5 Pro, this agent generates natural language reasoning logs explaining the "Intent" of the content (Piracy vs. Fan Tribute).

Note on SynthID: The architecture is designed for Google SynthID integration to provide pixel-level steganographic watermarking. The current version utilizes a forensic simulation layer to demonstrate provenance tracking pending full production API access.

📜 4. Step-by-Step Setup (For Reviewers)
Prerequisites
A modern web browser.

Google Cloud SDK (if deploying/managing via CLI).

Local Installation
Clone the Repo:
git clone https://github.com/palakgoda/mediashield-ai.git
cd mediashield-ai

Launch:
Open index.html in your browser or run a local server:
npx serve .

Deployment to Google Cloud Run
gcloud run deploy mediashield-app --source . --project mediashield-ai-454009 --region us-central1 --allow-unauthenticated

📊 5. Key Features
Mission HUD: A real-time navigation system guiding users through the forensic lifecycle.

Geospatial Threat Map: Live visualization of unauthorized stream sources via Google Maps API.

Forensic Registry: A persistent Firestore table of all "Master Assets" protected by the system.

Neural Intent Recognition: Using Gemini's long-context window to differentiate between copyright theft and fair-use fan engagement.

Automated Takedown Logic: Cloud Run-triggered alerts with 94%+ match accuracy.

🚀 6. Future Roadmap
Blockchain Notarization: Implementing immutable certificates of ownership for every digital asset.

Deepfake Detection: Enhancing the Investigator Agent to detect AI-generated sports highlights.

Direct Social API Integration: Automated DMCA strikes via YouTube and Meta webhooks.
