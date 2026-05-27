import json
import sys
from pathlib import Path

try:
    import whisper
except ImportError as exc:
    print(json.dumps({"error": "whisper package is not installed. Run 'pip install openai-whisper'"}))
    sys.exit(1)


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Audio path argument is required."}))
        sys.exit(1)

    audio_path = Path(sys.argv[1])
    if not audio_path.exists():
        print(json.dumps({"error": f"Audio file not found: {audio_path}"}))
        sys.exit(1)

    model = whisper.load_model("tiny")
    result = model.transcribe(str(audio_path), language="en")
    transcript = result.get("text", "").strip()
    print(json.dumps({"text": transcript}))


if __name__ == "__main__":
    main()
