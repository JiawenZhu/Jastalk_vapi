# Pipecat Quickstart

Build and deploy your first voice AI bot in under 10 minutes. Develop locally, then scale to production on Pipecat Cloud.

**Two steps**: [🏠 Local Development](#run-your-bot-locally) → [☁️ Production Deployment](#deploy-to-production)

## Step 1: Local Development (5 min)

### Prerequisites

#### Environment

- Python 3.10 or later
- [uv](https://docs.astral.sh/uv/getting-started/installation/) package manager installed

#### AI Service API keys

You'll need API keys from three services:

- [Deepgram](https://console.deepgram.com/signup) for Speech-to-Text
- [OpenAI](https://auth.openai.com/create-account) for LLM inference
- [Cartesia](https://play.cartesia.ai/sign-up) for Text-to-Speech

> 💡 **Tip**: Sign up for all three now. You'll need them for both local and cloud deployment.

### Setup

Navigate to the quickstart directory and set up your environment.

1. Clone this repository

	```bash
	git clone https://github.com/pipecat-ai/pipecat-quickstart.git
	cd pipecat-quickstart
	```

2. Configure your API keys:

	Create a `.env` file:

	```bash
	cp env.example .env
	```

	Then, add your API keys:

	```ini
	DEEPGRAM_API_KEY=your_deepgram_api_key
	OPENAI_API_KEY=your_openai_api_key
	CARTESIA_API_KEY=your_cartesia_api_key
	```

3. Set up a virtual environment and install dependencies

	```bash
	uv sync
	```

### Run your bot locally

```bash
uv run bot.py
```

**Open http://localhost:7860 in your browser** and click `Connect` to start talking to your bot.

> 💡 First run note: The initial startup may take ~20 seconds as Pipecat downloads required models and imports.

🎉 **Success!** Your bot is running locally. Now let's deploy it to production so others can use it.

---

## Step 2: Deploy to Production (5 min)

Transform your local bot into a production-ready service. Pipecat Cloud handles scaling, monitoring, and global deployment.

### Prerequisites

1. [Sign up for Pipecat Cloud](https://pipecat.daily.co/sign-up).

2. Set up Docker for building your bot image:

	- **Install [Docker](https://www.docker.com/)** on your system
	- **Create a [Docker Hub](https://hub.docker.com/) account**
	- **Login to Docker Hub:**

	  ```bash
	  docker login
	  ```

3. Log in with the `pipecatcloud` CLI—installed with the quickstart project—is used to manage your deployment and secrets.

	```bash
	uv run pcc auth login
	```

	> Tip: Use the CLI with the `pcc` command alias.

### Configure your deployment

```
