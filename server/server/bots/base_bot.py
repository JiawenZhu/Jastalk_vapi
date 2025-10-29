"""Base bot framework for shared functionality."""

from abc import ABC, abstractmethod
import os
from typing import Optional, List, Dict

from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.parallel_pipeline import ParallelPipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.processors.frameworks.rtvi import RTVIConfig, RTVIProcessor
from pipecat.processors.filters.function_filter import FunctionFilter
from pipecat.services.deepgram import DeepgramSTTService, DeepgramTTSService
from pipecat.services.cartesia import CartesiaTTSService
from pipecat.services.elevenlabs import ElevenLabsTTSService
from pipecat.services.google import GoogleLLMService, GoogleSTTService, GoogleTTSService
from pipecat.services.gemini_multimodal_live import GeminiMultimodalLiveLLMService
from pipecat.services.openai import OpenAILLMService
from pipecat.processors.aggregators.openai_llm_context import (
    OpenAILLMContext,
    OpenAILLMContextFrame,
)
from pipecat.processors.filters.stt_mute_filter import (
    STTMuteFilter,
    STTMuteConfig,
    STTMuteStrategy,
)
from pipecat.services.rime import RimeHttpTTSService
from pipecat.transports.services.daily import DailyTransport, DailyParams
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.audio.vad.vad_analyzer import VADParams
from pipecat.sync.event_notifier import EventNotifier
from pipecat.processors.user_idle_processor import UserIdleProcessor
from pipecat.frames.frames import (
    UserStartedSpeakingFrame,
    UserStoppedSpeakingFrame,
    TranscriptionFrame,
    LLMMessagesFrame,
    LLMMessagesAppendFrame,
    StartInterruptionFrame,
    StopInterruptionFrame,
    FunctionCallInProgressFrame,
    FunctionCallResultFrame,
)
from deepgram import LiveOptions

from loguru import logger
import time

from .smart_endpointing import (
    CLASSIFIER_SYSTEM_INSTRUCTION,
    CompletenessCheck,
    OutputGate,
    StatementJudgeContextFilter,
)


class BaseBot(ABC):
    """Abstract base class for bot implementations."""

    def __init__(self, config, system_messages: Optional[List[Dict[str, str]]] = None):
        """Initialize bot with core services and pipeline components.

        Args:
            config: Application configuration.
            system_messages: Optional initial system messages for the LLM context.
        """
        self.config = config

        # If no explicit system messages were provided, try to construct one from
        # environment variables set by the server (template/language/questions/persona)
        if not system_messages:
            tmpl = os.getenv("INTERVIEW_TEMPLATE")
            lang = os.getenv("INTERVIEW_LANGUAGE")
            qs = os.getenv("INTERVIEW_QUESTIONS")
            # Persona envs
            persona_name = (os.getenv("INTERVIEWER_NAME") or "").strip()
            persona_brand = (os.getenv("INTERVIEW_BRAND") or "JasTalk").strip()
            persona_intro = (os.getenv("INTERVIEWER_INTRO") or "").strip()
            if tmpl or lang or qs:
                # Build interviewer intro instruction
                if persona_intro:
                    intro_line = (
                        f"Start with a brief self‑introduction based on this line (paraphrase naturally): \"{persona_intro}\"."
                    )
                else:
                    who = persona_name if persona_name else f"the {persona_brand} interview agent"
                    intro_line = (
                        f"Start by briefly introducing yourself as {who}, mention {persona_brand}, and give a one‑sentence overview of the format."
                    )

                lines = [
                    f"You are an AI Interviewer for {persona_brand}.",
                    intro_line,
                    "Confirm the candidate's preferred name and the role before asking the first question.",
                    "Ask ONE question at a time and listen fully.",
                    "If the answer is too brief, ask one clarifying follow‑up and continue.",
                    "Do not end the call yourself; the user will end it.",
                ]
                if tmpl:
                    lines.append(f"INTERVIEW_TEMPLATE: {tmpl}")
                if lang:
                    lines.append(f"LANGUAGE: {lang}")
                if qs:
                    # Keep initial context reasonably sized
                    preview = "\n".join([f"{i+1}. {line}" for i, line in enumerate(qs.splitlines()[:20]) if line.strip()])
                    if preview:
                        lines.append("QUESTIONS:\n" + preview)
                system_messages = [{"role": "system", "content": "\n".join(lines)}]

        # For Gemini Live, we don't need separate STT/TTS services
        # They're handled by the multimodal service
        if config.llm_provider != "gemini-live":
            # Initialize STT service (Google Cloud STT)
            self.stt = GoogleSTTService(
                credentials=config.google_credentials,
                credentials_path=config.google_credentials_path,
            )
        else:
            self.stt = None  # Gemini Live handles STT internally

        # Initialize TTS service (skip for Gemini Live as it handles TTS internally)
        if config.llm_provider != "gemini-live":
            match config.tts_provider:
                case "elevenlabs":
                    if not config.elevenlabs_api_key:
                        raise ValueError("ElevenLabs API key is required for ElevenLabs TTS")

                    self.tts = ElevenLabsTTSService(
                        api_key=config.elevenlabs_api_key,
                        voice_id=config.elevenlabs_voice_id,
                    )
                case "cartesia":
                    if not config.cartesia_api_key:
                        raise ValueError("Cartesia API key is required for Cartesia TTS")

                    self.tts = CartesiaTTSService(
                        api_key=config.cartesia_api_key, voice_id=config.cartesia_voice
                    )
                case "deepgram":
                    if not config.deepgram_api_key:
                        raise ValueError("Deepgram API key is required for Deepgram TTS")

                    self.tts = DeepgramTTSService(
                        api_key=config.deepgram_api_key, voice=config.deepgram_voice
                    )
                case "google":
                    # Google Cloud Text-to-Speech (Chirp/Journey streaming voices)
                    self.tts = GoogleTTSService(
                        credentials=config.google_credentials,
                        credentials_path=config.google_credentials_path,
                        voice_id=config.google_tts_voice_id,
                    )
                case "rime":
                    if not config.rime_api_key:
                        raise ValueError("Rime API key is required for Rime TTS")

                    self.tts = RimeHttpTTSService(
                        api_key=config.rime_api_key,
                        voice_id=config.rime_voice_id,
                        params=RimeHttpTTSService.InputParams(
                            reduce_latency=config.rime_reduce_latency,
                            speed_alpha=config.rime_speed_alpha,
                        ),
                    )
                case _:
                    raise ValueError(f"Invalid TTS provider: {config.tts_provider}")
        else:
            self.tts = None  # Gemini Live handles TTS internally

        # Initialize LLM services
        match config.llm_provider:
            case "google":
                if not config.google_api_key:
                    raise ValueError("Google API key is required for Google LLM")

                # Main conversation LLM
                system_instruction = (
                    system_messages[0]["content"]
                    if system_messages
                    else "You are a voice assistant"
                )
                self.conversation_llm = GoogleLLMService(
                    api_key=config.google_api_key,
                    model=config.google_model,
                    params=config.google_params,
                    system_instruction=system_instruction,
                )
                self.llm = self.conversation_llm

                # Statement classifier LLM for endpoint detection
                self.statement_llm = GoogleLLMService(
                    name="StatementJudger",
                    api_key=config.google_api_key,
                    model=config.classifier_model,
                    temperature=0.0,
                    system_instruction=CLASSIFIER_SYSTEM_INSTRUCTION,
                )

            case "gemini-live":
                if not config.google_api_key:
                    raise ValueError("Google API key is required for Gemini Live")

                # Gemini Live handles realtime STT + LLM + TTS
                system_instruction = (
                    system_messages[0]["content"]
                    if system_messages
                    else "You are a voice assistant"
                )

                self.conversation_llm = GeminiMultimodalLiveLLMService(
                    api_key=config.google_api_key,
                    model=config.google_model,
                    voice_id=config.google_tts_voice_id,
                    system_instruction=system_instruction,
                    # Enable proactive first response on context initialization
                    inference_on_context_initialization=True,
                )
                self.llm = self.conversation_llm

                # Note: Smart endpointing not available with Gemini Live
                self.statement_llm = None

            case "openai":
                if not config.openai_api_key:
                    raise ValueError("OpenAI API key is required for OpenAI LLM")

                self.conversation_llm = OpenAILLMService(
                    api_key=config.openai_api_key,
                    model=config.openai_model,
                    params=config.openai_params,
                )

                # Note: Smart endpointing currently only supports Google LLM
                raise NotImplementedError(
                    "Smart endpointing is currently only supported with Google LLM"
                )

            case _:
                raise ValueError(f"Invalid LLM provider: {config.llm_provider}")

        # Initialize context
        self.context = OpenAILLMContext(messages=system_messages)
        self.context_aggregator = self.conversation_llm.create_context_aggregator(self.context)

        # Initialize mute filter
        self.stt_mute_filter = (
            STTMuteFilter(
                stt_service=self.stt,
                config=STTMuteConfig(
                    strategies={
                        STTMuteStrategy.MUTE_UNTIL_FIRST_BOT_COMPLETE,
                        STTMuteStrategy.FUNCTION_CALL,
                    }
                ),
            )
            if config.enable_stt_mute_filter
            else None
        )

        logger.debug(f"Initialised bot with config: {config}")

        # Initialize transport params with optimized VAD settings for faster responses
        self.transport_params = DailyParams(
            audio_out_enabled=True,
            vad_enabled=True,
            vad_analyzer=SileroVADAnalyzer(
                params=VADParams(
                    stop_secs=0.2,  # Further reduced from 0.3s - detect end of speech faster
                    start_secs=0.05,  # Further reduced from 0.1s - start processing sooner
                    min_volume=0.4,  # More sensitive threshold
                )
            ),
            vad_audio_passthrough=True,
        )

        # Initialize RTVI with default config
        self.rtvi = RTVIProcessor(config=RTVIConfig(config=[]))

        # Initialize smart endpointing components
        self.notifier = EventNotifier()
        self.statement_judge_context_filter = StatementJudgeContextFilter(notifier=self.notifier)
        self.completeness_check = CompletenessCheck(notifier=self.notifier)
        self.output_gate = OutputGate(notifier=self.notifier, start_open=True)

        async def user_idle_notifier(frame):
            await self.notifier.notify()

        # Balanced timeout - not too aggressive, allows natural pauses
        self.user_idle = UserIdleProcessor(callback=user_idle_notifier, timeout=2.0)

        # These will be set up when needed
        self.transport: Optional[DailyTransport] = None
        self.task: Optional[PipelineTask] = None
        self.runner: Optional[PipelineRunner] = None

    async def setup_transport(self, url: str, token: str):
        """Set up the transport with the given URL and token."""
        self.transport = DailyTransport(url, token, self.config.bot_name, self.transport_params)

        # Set up basic event handlers
        @self.transport.event_handler("on_participant_left")
        async def on_participant_left(transport, participant, reason):
            if self.task:
                await self.task.cancel()

        @self.transport.event_handler("on_first_participant_joined")
        async def on_first_participant_joined(transport, participant):
            await transport.capture_participant_transcription(participant["id"])
            await self._handle_first_participant()
            # Proactively trigger first response so the agent speaks IMMEDIATELY
            try:
                persona_name = (os.getenv("INTERVIEWER_NAME") or "").strip()
                persona_brand = (os.getenv("INTERVIEW_BRAND") or "JasTalk").strip()
                persona_intro = (os.getenv("INTERVIEWER_INTRO") or "").strip()
                tmpl = (os.getenv("INTERVIEW_TEMPLATE") or "").strip()

                logger.info("🎤 Triggering agent to speak first...")

                # Build the greeting prompt
                if persona_intro:
                    intro_hint = f"Start with a paraphrase of: \"{persona_intro}\"."
                else:
                    who = persona_name if persona_name else f"the {persona_brand} interview agent"
                    intro_hint = f"Introduce yourself briefly as {who} from {persona_brand}."

                begin_lines = [
                    intro_hint,
                    "Explain the interview format in one sentence,",
                    "ask the candidate to confirm their name and the role they're interviewing for.",
                    "IMPORTANT: Do NOT state or assume the role yourself - let the candidate tell you.",
                    "Keep it concise and friendly.",
                ]
                if tmpl:
                    begin_lines.append(f"(Template will be used: {tmpl})")

                begin_text = " ".join(begin_lines)

                # Add the greeting prompt to context and trigger LLM
                self.context.messages.append({"role": "user", "content": begin_text})

                # Queue the frames to trigger immediate response
                await self.task.queue_frames([
                    OpenAILLMContextFrame(context=self.context),
                ])
                logger.info("✅ Agent greeting triggered successfully")
            except Exception as e:
                logger.error(f"❌ Proactive start failed: {e}")

        @self.transport.event_handler("on_app_message")
        async def on_app_message(transport, message, sender):
            try:
                # Accept interview metadata from the client
                template = (message or {}).get("template")
                language = (message or {}).get("language")
                questions = (message or {}).get("questions")

                if template or language or questions:
                    # Normalize questions
                    q_list = []
                    if isinstance(questions, list):
                        q_list = [str(q) for q in questions if q]
                    elif isinstance(questions, str) and questions.strip():
                        # Split on newlines if a single string
                        q_list = [s for s in questions.split("\n") if s.strip()]

                    # Build a concise system update describing the interview
                    sys_lines = [
                        "You are an AI Interviewer conducting a structured mock interview.",
                        "Ask one question at a time, listen fully, and be concise.",
                        "If answers are brief, ask one follow‑up; otherwise continue.",
                        "Never end the call on your own; the user will hang up.",
                    ]
                    if template:
                        sys_lines.append(f"INTERVIEW_TEMPLATE: {template}")
                    if language:
                        sys_lines.append(f"LANGUAGE: {language}")
                    if q_list:
                        preview = "\n".join(
                            [f"{i+1}. {q}" for i, q in enumerate(q_list[:20])]  # cap to 20 to avoid context bloat
                        )
                        sys_lines.append("QUESTIONS:\n" + preview)

                    sys_msg = {"role": "system", "content": "\n".join(sys_lines)}
                    try:
                        self.context.messages.append(sys_msg)
                    except Exception:
                        pass

                    # Update LLM context and trigger a brief greeting + first question
                    # Build a begin cue that aligns with persona
                    persona_name = (os.getenv("INTERVIEWER_NAME") or "").strip()
                    persona_brand = (os.getenv("INTERVIEW_BRAND") or "JasTalk").strip()
                    persona_intro = (os.getenv("INTERVIEWER_INTRO") or "").strip()
                    if persona_intro:
                        intro_hint = f"Start with a paraphrase of: \"{persona_intro}\"."
                    else:
                        who = persona_name if persona_name else f"the {persona_brand} interview agent"
                        intro_hint = f"Introduce yourself briefly as {who} from {persona_brand}."
                    begin_text = (
                        f"{intro_hint} Explain the format in one sentence, confirm the candidate's name and role, then ask the first question from the provided list."
                    )
                    # Add to context and queue frame
                    self.context.messages.append({"role": "user", "content": begin_text})
                    await self.task.queue_frames([OpenAILLMContextFrame(context=self.context)])

                # Also support free‑text app messages as user speech
                if "message" in (message or {}):
                    await self.task.queue_frames(
                        [
                            UserStartedSpeakingFrame(),
                            TranscriptionFrame(
                                user_id=sender, timestamp=time.time(), text=message["message"]
                            ),
                            UserStoppedSpeakingFrame(),
                        ]
                    )
            except Exception as e:
                logger.warning(f"on_app_message error: {e}")

    def create_pipeline(self):
        """Create the processing pipeline."""
        if not self.transport:
            raise RuntimeError("Transport must be set up before creating pipeline")

        async def block_user_stopped_speaking(frame):
            return not isinstance(frame, UserStoppedSpeakingFrame)

        async def pass_only_llm_trigger_frames(frame):
            return (
                isinstance(frame, OpenAILLMContextFrame)
                or isinstance(frame, LLMMessagesFrame)
                or isinstance(frame, LLMMessagesAppendFrame)
                or isinstance(frame, StartInterruptionFrame)
                or isinstance(frame, StopInterruptionFrame)
                or isinstance(frame, FunctionCallInProgressFrame)
                or isinstance(frame, FunctionCallResultFrame)
            )

        # Define an async filter that always discards frames.
        async def discard_all(frame):
            return False

        # Build parallel pipeline branches
        branches = [
            [
                # Branch 1: Pass everything except UserStoppedSpeakingFrame
                FunctionFilter(filter=block_user_stopped_speaking),
            ],
        ]

        # Only add smart endpointing branch if statement_llm is available AND enabled
        # Smart endpointing adds 200-500ms latency per utterance due to extra LLM call
        # Set ENABLE_SMART_ENDPOINTING=false in .env to disable for faster responses
        enable_smart_endpointing = os.getenv("ENABLE_SMART_ENDPOINTING", "true").lower() in ("true", "1", "yes")
        if self.statement_llm is not None and enable_smart_endpointing:
            logger.info("Smart endpointing enabled (adds latency but improves turn detection)")
            branches.append([
                # Branch 2: Endpoint detection branch using Gemini for completeness
                self.statement_judge_context_filter,
                self.statement_llm,
                self.completeness_check,
                # Use an async filter to discard branch 2's output.
                FunctionFilter(filter=discard_all),
            ])
        elif self.statement_llm is not None:
            logger.info("Smart endpointing disabled (faster responses, may have turn detection issues)")

        branches.append([
            # Branch 3: Conversation branch using Gemini for dialogue
            FunctionFilter(filter=pass_only_llm_trigger_frames),
            self.conversation_llm,
            self.output_gate,
        ])

        # Build pipeline with Deepgram STT at the beginning
        pipeline = Pipeline(
            [
                processor
                for processor in [
                    self.rtvi,
                    self.transport.input(),
                    self.stt_mute_filter,
                    self.stt,  # STT transcribes incoming audio (or None for Gemini Live)
                    self.context_aggregator.user(),
                    ParallelPipeline(*branches),
                    self.tts,  # TTS generates audio output (or None for Gemini Live)
                    self.user_idle,
                    self.transport.output(),
                    self.context_aggregator.assistant(),
                ]
                if processor is not None
            ]
        )

        self.task = PipelineTask(
            pipeline,
            PipelineParams(
                allow_interruptions=True,
                enable_metrics=True,
                enable_usage_metrics=True,
            ),
        )
        self.runner = PipelineRunner()

    async def start(self):
        """Start the bot's main task."""
        if not self.runner or not self.task:
            raise RuntimeError("Bot not properly initialized. Call create_pipeline first.")
        await self.runner.run(self.task)

    async def cleanup(self):
        """Clean up resources."""
        if self.runner:
            await self.runner.stop_when_done()
        if self.transport:
            await self.transport.close()

    @abstractmethod
    async def _handle_first_participant(self):
        """Override in subclass to handle the first participant joining."""
        pass
