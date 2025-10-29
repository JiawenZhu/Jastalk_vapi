#
# Copyright (c) 2024–2025, Daily
#
# SPDX-License-Identifier: BSD 2-Clause License
#

"""Pipecat Quickstart Example.

The example runs a simple voice AI bot that you can connect to using your
browser and speak with it. You can also deploy this bot to Pipecat Cloud.

Required AI services:
- Google Gemini Live (Realtime STT+LLM+TTS)

Run the bot using::

	uv run bot.py
"""

import os
import json
import logging
import asyncio

from dotenv import load_dotenv
from loguru import logger

print("🚀 Starting Pipecat bot...")
print("⏳ Loading models and imports (first run may take ~20s)\n")
from pipecat.frames.frames import (
    InputTextRawFrame,
    LLMMessagesAppendFrame,
)

logger.info("Loading pipeline components...")
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.openai_llm_context import OpenAILLMContext, OpenAILLMContextFrame
from pipecat.processors.frameworks.rtvi import RTVIConfig, RTVIObserver, RTVIProcessor
from pipecat.runner.types import RunnerArguments
from pipecat.runner.utils import create_transport
from pipecat.services.google.gemini_live.llm import GeminiLiveLLMService
from pipecat.transports.base_transport import BaseTransport, TransportParams
from pipecat.transports.daily.transport import DailyParams
try:
    from pipecat.audio.vad.silero import SileroVADAnalyzer
    from pipecat.audio.turn.smart_turn.base_smart_turn import SmartTurnParams
    try:
        from pipecat.audio.turn.smart_turn.local_smart_turn_v3 import LocalSmartTurnAnalyzerV3 as _LocalST
    except Exception:
        _LocalST = None
    try:
        from pipecat.audio.turn.smart_turn.http_smart_turn import HttpSmartTurnAnalyzer as _HttpST
    except Exception:
        _HttpST = None
    try:
        from pipecat.audio.turn.smart_turn.fal_smart_turn import FalSmartTurnAnalyzer as _FalST
    except Exception:
        _FalST = None
    _HAVE_SMART_TURN = True
except Exception as _e:
    _LocalST = None
    _HttpST = None
    _HAVE_SMART_TURN = False

logger.info("✅ All components loaded successfully!")

load_dotenv(override=True)
logging.basicConfig(level=logging.DEBUG)

# Global storage for interview data from URL parameters
# This will be populated by the middleware when client HTML is loaded
_global_interview_data = {}


def _load_file_text(path: str) -> str:
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        logger.warning(f"Could not read file {path}: {e}")
        return ""


def _sanitize_flow_markdown(md: str) -> str:
    """Remove example sections that can bias role selection.

    We keep only the core instructions and strip sections like
    "Output Structure", "Example Template", "Voice Example", and "Summary".
    """
    if not md:
        return md
    lines = md.splitlines()
    out = []
    skipping = False
    def is_unwanted_header(s: str) -> bool:
        s = s.strip()
        return (
            s.startswith("## 🔎 Output Structure")
            or s.startswith("## 💡 Example")
            or s.startswith("## 🗣️ Voice")
            or s.startswith("## ✅ Summary")
        )
    for line in lines:
        if not skipping and is_unwanted_header(line):
            skipping = True
            continue
        if skipping and line.strip().startswith("## ") and not is_unwanted_header(line):
            # Stop skipping at the next section header
            skipping = False
            out.append(line)
            continue
        if not skipping:
            out.append(line)
    return "\n".join(out)


def _load_templates(path: str):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.warning(f"Could not read templates {path}: {e}")
        return {}


def _load_flow(path: str):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.warning(f"Could not read flow {path}: {e}")
        return {}


def _summarize_flow(flow: dict) -> str:
    if not isinstance(flow, dict):
        return ""
    name = flow.get("name") or "interview_flow"
    global_prompt = flow.get("globalPrompt") or ""
    nodes = flow.get("nodes") or []
    edges = flow.get("edges") or []

    lines = []
    lines.append(f"Flow Name: {name}")
    if global_prompt:
        lines.append("Global Policy: " + global_prompt)
    lines.append("Nodes and Transitions:")
    for n in nodes:
        nm = n.get("name")
        if not nm:
            continue
        start = " (start)" if n.get("isStart") else ""
        prompt = (n.get("prompt") or "").strip()
        if len(prompt) > 320:
            prompt = prompt[:317] + "…"
        lines.append(f"- {nm}{start}: {prompt}")
        outs = [e for e in edges if e.get("from") == nm]
        for e in outs:
            dest = e.get("to")
            cond = e.get("condition")
            if cond:
                try:
                    cprop = cond.get("property")
                    cop = cond.get("operator")
                    cval = cond.get("value")
                    lines.append(f"  -> {dest} if {cprop} {cop} {cval}")
                except Exception:
                    lines.append(f"  -> {dest} (conditional)")
            else:
                lines.append(f"  -> {dest}")
    return "\n".join(lines)


def _find_template_by_subtitle(templates: dict, subtitle: str):
    if not subtitle or not isinstance(templates, dict):
        return None, None
    target = str(subtitle).strip().lower()
    best = (None, None)
    for category, arr in templates.items():
        if not isinstance(arr, list):
            continue
        for item in arr:
            try:
                sub = str((item or {}).get("subTitle") or "").strip()
                if not sub:
                    continue
                s_low = sub.lower()
                if s_low == target or target in s_low or s_low in target:
                    return category, item
                # Keep first item in case nothing matches
                if best == (None, None):
                    best = (category, item)
            except Exception:
                continue
    return best


def _default_template(templates: dict):
    # Pick from env if provided; else Software -> first item
    prefer_cat = os.getenv("INTERVIEW_DEFAULT_CATEGORY", "Software")
    prefer_sub = os.getenv("INTERVIEW_DEFAULT_SUBTITLE", "")
    if prefer_sub:
        cat, tpl = _find_template_by_subtitle(templates, prefer_sub)
        if tpl:
            return cat, tpl
    try:
        arr = templates.get(prefer_cat)
        if isinstance(arr, list) and arr:
            return prefer_cat, arr[0]
    except Exception:
        pass
    # Fallback to any first template
    for cat, arr in templates.items():
        if isinstance(arr, list) and arr:
            return cat, arr[0]
    return None, None


async def run_bot(transport: BaseTransport, runner_args: RunnerArguments, interview_data: dict = None):
    logger.info("Starting bot")

    # Store interview data for later use
    _interview_data = interview_data or {}

    # Load interview flow prompt + templates
    base_dir = os.path.dirname(__file__)
    flow_prompt_path = os.path.join(base_dir, "interview_flow_prompt.md")
    templates_path = os.path.join(base_dir, "interview_templates.json")
    flow_spec_path = os.path.join(base_dir, "interview_flow.json")
    flow_prompt_raw = _load_file_text(flow_prompt_path).strip()
    flow_prompt = _sanitize_flow_markdown(flow_prompt_raw)
    templates = _load_templates(templates_path)
    flow = _load_flow(flow_spec_path)
    flow_summary = _summarize_flow(flow)

    # Prepare default interview template (can be overridden by app message)
    default_cat, default_tpl = _default_template(templates)
    try:
        if default_tpl:
            logger.info(
                f"Default interview template: category='{default_cat}', subTitle='{default_tpl.get('subTitle')}', "
                f"questions={len(default_tpl.get('questions') or [])}"
            )
        else:
            logger.warning("No default interview template found; proceeding with flow prompt only.")
    except Exception:
        pass

    # Build initial system message
    sys_parts = []
    if flow_prompt:
        # Add guardrails first to avoid example bias from any remaining content.
        sys_parts.append(
            "IMPORTANT: Do not assume a role/category from any examples in these instructions. "
            "Only use the runtime-provided interview template (sent as a system message starting with 'Use the following interview template'). "
            "If a template has not been provided yet, ask the user to confirm their role and wait for the template."
        )
        sys_parts.append(flow_prompt)
    # Do not include a default template in the initial system prompt to avoid
    # starting with the wrong role. The concrete template will be provided by
    # the frontend and applied before the first question.
    # Add structured flow spec so the LLM follows explicit stages
    if flow_summary:
        sys_parts.append(
            "\n\nInterview Flow Specification (stages and transitions):\n" + flow_summary +
            "\n\nFollow nodes in order starting from the start node. Ask one question at a time. "
            "After the candidate answers, advance to the next node using the transitions and conditions. "
            "If a node defines a variableExtractionPlan, implicitly extract those fields for your internal reasoning, but do not read them aloud. "
            "If a conditional branch depends on a value (e.g., years_experience), ask a concise clarifying question first if the value is unknown."
        )
    # Strong safety to avoid agent ending the call by itself
    sys_parts.append(
        "\n\nIMPORTANT: Never end or hang up the interview yourself. "
        "Do not trigger any end-call tools or say any goodbye phrase that would end the call. "
        "Always wait for the user to end the session."
    )

    # Create LLM service now, passing the system instruction string directly so it's
    # available at connection time (prevents generic initial greetings).
    system_instruction = "\n\n".join(sys_parts)
    try:
        logger.info(f"System instruction prepared ({len(system_instruction)} chars)")
    except Exception:
        pass
    # Gemini Live handles realtime STT + LLM + TTS
    llm = GeminiLiveLLMService(
        api_key=os.getenv("GOOGLE_API_KEY"),
        model="models/gemini-2.0-flash-live-001",
        voice_id="Puck",
        system_instruction=system_instruction,
        # Enable proactive first response on context initialization
        inference_on_context_initialization=True,
    )

    messages = []
    if system_instruction:
        messages.append({"role": "system", "content": system_instruction})

    # OpenAI-format context; Gemini upgrades internally.
    context = OpenAILLMContext(messages)
    context_pair = llm.create_context_aggregator(context)

    rtvi = RTVIProcessor(config=RTVIConfig(config=[]))

    # Conversation start coordination flags
    started = False
    template_received = False

    # Bridge typed text into LLM
    from pipecat.processors.frame_processor import FrameProcessor, FrameDirection

    class InputTextToLLM(FrameProcessor):
        async def process_frame(self, frame, direction: FrameDirection):
            await super().process_frame(frame, direction)
            if isinstance(frame, InputTextRawFrame):
                # Ignore early user text so the bot can greet first with the selected template
                if not started:
                    return
                messages.append({"role": "user", "content": frame.text})
                await self.push_frame(
                    LLMMessagesAppendFrame(
                        messages=[{"role": "user", "content": frame.text}],
                        run_llm=True,
                    )
                )
            else:
                await self.push_frame(frame, direction)

    # Full duplex pipeline: input -> user agg -> llm -> assistant agg -> output
    pipeline = Pipeline(
        [
            transport.input(),
            rtvi,
            InputTextToLLM(),
            context_pair.user(),
            llm,
            context_pair.assistant(),
            transport.output(),
        ]
    )

    task = PipelineTask(
        pipeline,
        params=PipelineParams(enable_metrics=True, enable_usage_metrics=True),
        observers=[RTVIObserver(rtvi)],
    )

    async def _start_interview(reason: str = ""):
        nonlocal started
        if started:
            return
        started = True
        logger.info(f"Starting interview (trigger: {reason})")
        try:
            # Create a natural greeting prompt that works with or without a template
            start_msg = {
                "role": "user",
                "content": (
                    "Please introduce yourself now and begin the interview. "
                    "Start with a warm greeting, briefly introduce yourself as an AI interviewer. "
                    "Then ask the candidate to confirm their name and the role they're interviewing for. "
                    "IMPORTANT: Do NOT assume or state the role yourself - let the candidate tell you. "
                    "After they confirm, acknowledge their response and proceed naturally with the interview flow. "
                    "Keep your introduction concise and friendly."
                ),
            }
            messages.append(start_msg)
            try:
                context.messages.append(start_msg)
            except Exception:
                pass
            # Send a context frame to trigger the initial response
            await task.queue_frames([OpenAILLMContextFrame(context=context)])
        except Exception as e:
            logger.warning(f"Could not trigger interview start: {e}")

    @transport.event_handler("on_client_connected")
    async def on_client_connected(transport, client):
        logger.info("Client connected")

        # Inject interview data from URL parameters if available
        if _interview_data:
            try:
                interview_title = _interview_data.get("interview_title", "")
                interview_questions_json = _interview_data.get("interview_questions", "")
                interview_difficulty = _interview_data.get("interview_difficulty", "")
                interview_duration = _interview_data.get("interview_duration", "")
                interview_category = _interview_data.get("interview_category", "")
                interview_company = _interview_data.get("interview_company", "")
                user_name = _interview_data.get("user_name", "Candidate")

                if interview_title:
                    logger.info(f"💼 Injecting interview context: {interview_title}")

                    # Parse questions from JSON string
                    questions_list = []
                    if interview_questions_json:
                        try:
                            questions_list = json.loads(interview_questions_json)
                        except Exception as e:
                            logger.warning(f"Could not parse interview questions JSON: {e}")

                    # Build comprehensive interview context system message
                    context_parts = [
                        "You are an AI Interviewer conducting a structured mock interview.",
                        "Ask one question at a time, listen fully, and be concise.",
                        "If answers are brief, ask one follow-up; otherwise continue.",
                        "Never end the call on your own; the user will hang up.",
                    ]

                    if interview_title:
                        context_parts.append(f"\nINTERVIEW ROLE: {interview_title}")
                    if interview_company:
                        context_parts.append(f"COMPANY: {interview_company}")
                    if interview_difficulty:
                        context_parts.append(f"DIFFICULTY LEVEL: {interview_difficulty}")
                    if interview_duration:
                        context_parts.append(f"EXPECTED DURATION: {interview_duration} minutes")
                    if interview_category:
                        context_parts.append(f"CATEGORY: {interview_category}")
                    if user_name and user_name != "Candidate":
                        context_parts.append(f"CANDIDATE NAME: {user_name}")

                    if questions_list:
                        context_parts.append("\nINTERVIEW QUESTIONS:")
                        for i, q in enumerate(questions_list[:20], 1):  # Limit to first 20 questions
                            if isinstance(q, dict):
                                question_text = q.get("question", str(q))
                            else:
                                question_text = str(q)
                            context_parts.append(f"{i}. {question_text}")

                    context_parts.append(
                        "\nIMPORTANT: Greet the candidate warmly, confirm their name and the role they're interviewing for, "
                        "then proceed with the interview questions in order. Be professional yet friendly."
                    )

                    # Create system message with interview context
                    interview_context_msg = {
                        "role": "system",
                        "content": "\n".join(context_parts)
                    }

                    # Append to both local messages and shared context
                    messages.append(interview_context_msg)
                    context.messages.append(interview_context_msg)

                    logger.info(f"✅ Interview context injected: {len(questions_list)} questions, difficulty={interview_difficulty}")
                else:
                    logger.info("ℹ️  No interview title in URL parameters, proceeding without specific interview context")
            except Exception as e:
                logger.warning(f"Could not inject interview data: {e}")

        # Proactively start mic capture when using SmallWebRTC
        try:
            await transport.capture_participant_audio()
        except Exception:
            pass
        # Start immediately so the agent speaks first (template will be applied when received)
        await _start_interview("client-connected")

    @transport.event_handler("on_app_message")
    async def on_app_message(transport, msg, sender):
        """Handle custom messages from the frontend (template/language)."""
        try:
            template = (msg or {}).get("template")
            language = (msg or {}).get("language")

            sys_msgs = []
            run_after_update = False

            # Handle template selection by subtitle (search across categories)
            if template:
                cat, tpl = _find_template_by_subtitle(templates, template)
                if tpl:
                    template_received = True
                    try:
                        logger.info(
                            f"Applying interview template from app message: category='{cat}', subTitle='{tpl.get('subTitle')}'"
                        )
                    except Exception:
                        pass
                    try:
                        payload = {
                            "category": cat,
                            "subTitle": tpl.get("subTitle"),
                            "difficulty": tpl.get("difficulty"),
                            "duration_minutes": tpl.get("duration_minutes"),
                            "questions": tpl.get("questions", []),
                        }
                        sys_msgs.append({
                            "role": "system",
                            "content": (
                                "Use the following interview template (overrides any previous template):\n"
                                + json.dumps(payload, ensure_ascii=False)
                            ),
                        })
                        # Guardrails to avoid redundant/contradictory phrasing at the start
                        sys_msgs.append({
                            "role": "system",
                            "content": (
                                "IMPORTANT: Treat the above role as tentative until the candidate confirms. "
                                "When you greet, ask the candidate to confirm their name and the role they are interviewing for. "
                                "Do NOT restate or assert the role yourself until they confirm. "
                                "If the candidate states a different role than the template, politely acknowledge the correction, "
                                "update your understanding to that role, and continue accordingly. "
                                "Never say 'Okay, let's begin' before they confirm."
                            ),
                        })
                        run_after_update = True
                    except Exception as e:
                        logger.warning(f"Could not serialize template: {e}")
                else:
                    sys_msgs.append({
                        "role": "system",
                        "content": f"Template titled '{template}' not found. Continue with current template.",
                    })

            # Handle language preference
            if language:
                sys_msgs.append({
                    "role": "system",
                    "content": f"Speak in {language}."
                })

            if sys_msgs:
                # Update both local history and shared context
                try:
                    for m in sys_msgs:
                        messages.append(m)
                        context.messages.append(m)
                except Exception:
                    pass
                # If already started, send a context update to apply the new template
                if started and run_after_update:
                    try:
                        await task.queue_frames([OpenAILLMContextFrame(context=context)])
                        logger.info("Template applied to active conversation")
                    except Exception as e:
                        logger.warning(f"Could not apply template update: {e}")
                # If not started yet and template was received, start now
                elif not started and run_after_update:
                    await _start_interview("template-selected")
        except Exception as e:
            logger.warning(f"on_app_message parse error: {e}")

    @transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(transport, client):
        logger.info("Client disconnected")
        await task.cancel()

    runner = PipelineRunner(handle_sigint=runner_args.handle_sigint)
    await runner.run(task)


async def bot(runner_args: RunnerArguments):
    """Agent entry point."""

    # Configure transports for Gemini Live sample rates
    # Optional Smart Turn and VAD analyzers
    vad = None
    turn = None
    if _HAVE_SMART_TURN:
        try:
            # Enable Silero VAD by default (set ENABLE_SILERO_VAD=0 to disable)
            if os.getenv("ENABLE_SILERO_VAD", "1") != "0":
                vad = SileroVADAnalyzer()

            stop_secs = float(os.getenv("SMART_TURN_STOP_SECS", "1.2"))
            pre_ms = float(os.getenv("SMART_TURN_PRE_SPEECH_MS", "0"))
            max_secs = float(os.getenv("SMART_TURN_MAX_DURATION_SECS", "8"))
            mode = (os.getenv("SMART_TURN_MODE", "local") or "local").lower()

            if mode == "local" and _LocalST is not None:
                turn = _LocalST(
                    params=SmartTurnParams(
                        stop_secs=stop_secs, pre_speech_ms=pre_ms, max_duration_secs=max_secs
                    )
                )
                logger.info(
                    f"Smart Turn enabled (local v3): stop_secs={stop_secs}, pre_ms={pre_ms}, max_secs={max_secs}"
                )
            elif mode == "cloud" and _FalST is not None:
                import aiohttp

                fal_key = os.getenv("FAL_API_KEY") or os.getenv("FAL_KEY") or ""
                if not fal_key:
                    logger.warning("SMART_TURN_MODE=cloud but FAL_API_KEY is not set; disabling Smart Turn")
                else:
                    session = aiohttp.ClientSession()
                    turn = _FalST(
                        aiohttp_session=session,
                        api_key=fal_key,
                        params=SmartTurnParams(
                            stop_secs=stop_secs, pre_speech_ms=pre_ms, max_duration_secs=max_secs
                        ),
                    )
                    logger.info("Smart Turn enabled (Fal cloud)")
            elif _HttpST is not None:
                # Configure Smart Turn over HTTP if SMART_TURN_URL is set
                smart_turn_url = (os.getenv("SMART_TURN_URL") or "").strip()
                if smart_turn_url:
                    import aiohttp

                    session = aiohttp.ClientSession()
                    turn = _HttpST(
                        url=smart_turn_url,
                        aiohttp_session=session,
                        params=SmartTurnParams(
                            stop_secs=stop_secs, pre_speech_ms=pre_ms, max_duration_secs=max_secs
                        ),
                    )
                    logger.info(
                        f"Smart Turn enabled (HTTP): url={smart_turn_url}, stop_secs={stop_secs}, pre_ms={pre_ms}, max_secs={max_secs}"
                    )

            if vad:
                logger.info("Silero VAD enabled")
        except Exception as e:
            logger.warning(f"Smart Turn/VAD setup failed: {e}")
            vad = None
            turn = None

    transport_params = {
        "daily": lambda: DailyParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            audio_in_sample_rate=16000,
            audio_out_sample_rate=24000,
            vad_analyzer=vad,
            turn_analyzer=turn,
        ),
        "webrtc": lambda: TransportParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            audio_in_sample_rate=16000,
            audio_out_sample_rate=24000,
            vad_analyzer=vad,
            turn_analyzer=turn,
        ),
    }

    transport = await create_transport(runner_args, transport_params)
    await run_bot(transport, runner_args, interview_data=_global_interview_data)


if __name__ == "__main__":
    from pipecat.runner.run import main
    from pathlib import Path
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import RedirectResponse

    # Custom client paths (env-overridable)
    use_custom_client = (os.getenv("USE_CUSTOM_CLIENT", "1").strip() != "0")
    env_client_dir = os.getenv("CUSTOM_CLIENT_DIR", "").strip()

    # Default candidates:
    # 1) Explicit env override path
    # 2) Original location: server/agent/client
    # 3) Moved location: <repo_root>/src/jastalk_client
    # 4) Alternative: <repo_root>/src/client
    # 5) Alternative: <repo_root>/client
    repo_root = Path(__file__).resolve().parents[2]
    candidates = []
    if env_client_dir:
        candidates.append(Path(env_client_dir))
    candidates.append(Path(__file__).parent / "client")
    candidates.append(repo_root / "src" / "jastalk_client")
    candidates.append(repo_root / "src" / "client")
    candidates.append(repo_root / "client")

    # Determine which client to serve (prioritize React build in each candidate)
    custom_client_dir = None
    client_type = "default Pipecat UI"

    for base in candidates:
        react_build_dir = base / "dist"
        if react_build_dir.exists() and (react_build_dir / "index.html").exists():
            custom_client_dir = react_build_dir
            client_type = f"React build ({react_build_dir})"
            break
        if base.exists() and (base / "index.html").exists():
            custom_client_dir = base
            client_type = f"Vanilla client ({base})"
            break

    # If custom client exists, patch the runner to use it
    if custom_client_dir and use_custom_client:
        logger.info(f"📱 Using custom Jastalk client: {client_type}")
        logger.info(f"   Path: {custom_client_dir}")

        # Monkey-patch the runner to mount our custom client instead
        original_main = main

        def custom_main():
            # Hook into the FastAPI app setup
            import pipecat.runner.run as runner_module

            original_setup = runner_module._setup_webrtc_routes

            def patched_setup(*args, **kwargs):
                result = original_setup(*args, **kwargs)
                # Get the FastAPI app
                app = args[0] if args else kwargs.get('app')
                if app:
                    # Add middleware to capture query parameters from client page requests
                    from fastapi import Request
                    from starlette.middleware.base import BaseHTTPMiddleware

                    class InterviewDataMiddleware(BaseHTTPMiddleware):
                        async def dispatch(self, request: Request, call_next):
                            # Capture query params when client HTML is loaded
                            if request.url.path.startswith('/client'):
                                params = dict(request.query_params)
                                if params:
                                    # Store interview data globally for bot to access
                                    _global_interview_data.update(params)
                                    logger.info(f"📊 Interview data captured from URL: {list(params.keys())}")
                            response = await call_next(request)
                            return response

                    app.add_middleware(InterviewDataMiddleware)
                    logger.info("✅ Interview data middleware installed")

                    # Remove any existing client mounts/routes (handle mount path variants)
                    original_static_dir = None
                    original_static_app = None
                    try:
                        removed = 0
                        for route in list(app.routes):
                            p = getattr(route, 'path', '') or ''
                            if p == '/client' or p.startswith('/client/') or '{path' in p and p.startswith('/client'):
                                # Capture original StaticFiles directory if available so we can remount it elsewhere
                                try:
                                    # Save the original mounted app so we can remount it at /playground
                                    original_static_app = getattr(route, 'app', None) or original_static_app
                                    # Also try to capture its directory if available (for logging only)
                                    try:
                                        original_static_dir = getattr(original_static_app, 'directory', None) or original_static_dir
                                    except Exception:
                                        pass
                                except Exception:
                                    pass
                                app.routes.remove(route)
                                removed += 1
                        if removed:
                            logger.info(f"🧹 Removed {removed} existing /client routes before mounting custom client")
                    except Exception as e:
                        logger.warning(f"Could not clean default /client routes: {e}")

                    # Mount our custom client
                    app.mount("/client", StaticFiles(directory=str(custom_client_dir), html=True), name="custom_client")
                    logger.info(f"✅ Custom Jastalk client mounted at /client ({client_type})")

                    # Also mount the original Pipecat UI (if we detected its directory) at /playground for easy toggling
                    try:
                        if original_static_app is not None:
                            app.mount("/playground", original_static_app, name="pipecat_playground")
                            where = f"{original_static_dir}" if original_static_dir else "(in-memory app)"
                            logger.info(f"🎛️  Original Pipecat UI mounted at /playground from {where}")
                        else:
                            logger.info("ℹ️  Original Pipecat UI app not detected; /playground not mounted")
                    except Exception as e:
                        logger.warning(f"Could not mount Pipecat UI at /playground: {e}")

                    # Redirect root ('/') to our custom client for convenience
                    try:
                        # Remove any existing root route to avoid conflicts
                        for route in list(app.routes):
                            if hasattr(route, 'path') and route.path == '/':
                                app.routes.remove(route)
                                break
                    except Exception:
                        pass

                    def _root_redirect():
                        return RedirectResponse(url="/client/")

                    try:
                        app.add_api_route("/", _root_redirect, include_in_schema=False)
                        logger.info("↪️  Root path '/' now redirects to /client/")
                    except Exception as e:
                        logger.warning(f"Could not add root redirect: {e}")

                return result

            runner_module._setup_webrtc_routes = patched_setup
            original_main()

        main = custom_main
    else:
        logger.warning(f"⚠️  No custom client found")
        logger.warning(f"   Checked: {react_build_dir}")
        logger.warning(f"   Checked: {vanilla_client_dir}")
        if not use_custom_client:
            logger.warning("   USE_CUSTOM_CLIENT=0 set; using default Pipecat UI")
        else:
            logger.warning(f"   Using default Pipecat UI")

    main()
